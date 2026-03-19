#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ARTIFACTS_DIR="$ROOT_DIR/.ralph"
TASK=""
TARGET=""
MAX_ITERATIONS=30
RUN_ALL_TARGETS=1
CURRENT_TARGET=""
CURRENT_TARGET_LABEL=""
CURRENT_TARGET_CATEGORY=""
CURRENT_TARGET_ARTIFACTS_DIR=""
CURRENT_SOURCE_PATH=""
RESUME_FILE=""
SESSION_FILE=""
CODEX_PROMPT_FILE=""
BACKGROUND_PIDS_FILE=""
TARGET_COMMIT_STATUS="pending"
TARGET_COMMIT_SHA=""
TARGET_COMMIT_REASON=""

log() {
  printf '[ralph] %s\n' "$*"
}

usage() {
  cat <<'EOF'
Usage: scripts/ralph-lit-loop.sh --task "Migrate the Base UI React surface to Lit" [options]

Options:
  --component <name>       Target a single export path such as "separator" or "dialog"
  --entrypoint <path>      Target a single export path such as "./separator"
  --max-iterations <n>     Max Codex turns after the initial run (default: 30)
  --artifacts-dir <path>   Artifact directory (default: ./.ralph)

Without --component or --entrypoint, the loop sweeps the non-root React export surface
and skips targets already marked complete in .ralph/targets/<name>/status.json.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --)
      shift
      ;;
    --task)
      TASK="${2:-}"
      shift 2
      ;;
    --component)
      TARGET="${2:-}"
      shift 2
      ;;
    --entrypoint)
      TARGET="${2:-}"
      shift 2
      ;;
    --max-iterations)
      MAX_ITERATIONS="${2:-30}"
      shift 2
      ;;
    --artifacts-dir)
      ARTIFACTS_DIR="$ROOT_DIR/${2:-.ralph}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [[ -z "$TASK" ]]; then
  echo "--task is required" >&2
  usage >&2
  exit 1
fi

if [[ -n "$TARGET" ]]; then
  RUN_ALL_TARGETS=0
fi

mkdir -p "$ARTIFACTS_DIR"

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

ensure_command() {
  if ! command_exists "$1"; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

ensure_command codex
ensure_command curl
ensure_command grep
ensure_command git
ensure_command node
ensure_command pnpm

normalize_target() {
  local value="$1"
  if [[ "$value" == "." || "$value" == "root" ]]; then
    printf '.'
    return 0
  fi

  if [[ "$value" == ./* ]]; then
    printf '%s' "$value"
    return 0
  fi

  printf './%s' "$value"
}

target_label() {
  local value="$1"
  if [[ "$value" == "." ]]; then
    printf 'root'
    return 0
  fi

  printf '%s' "${value#./}" | tr '/' '-'
}

extract_thread_id() {
  node -e '
    const fs = require("fs");
    const lines = fs.readFileSync(process.argv[1], "utf8").split(/\r?\n/);

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      try {
        const event = JSON.parse(line);
        if (event.type === "thread.started" && typeof event.thread_id === "string") {
          process.stdout.write(event.thread_id);
          process.exit(0);
        }
      } catch {}
    }

    process.exit(1);
  ' "$1"
}

get_source_path() {
  node -e '
    const fs = require("fs");
    const inventory = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const target = process.argv[2];
    const entry = inventory.entrypoints.find((value) => value.exportPath === target);
    if (!entry) {
      process.exit(1);
    }
    process.stdout.write(entry.sourcePath);
  ' "$1" "$2"
}

get_target_category() {
  node -e '
    const fs = require("fs");
    const inventory = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const target = process.argv[2];
    const entry = inventory.entrypoints.find((value) => value.exportPath === target);
    if (!entry) {
      process.exit(1);
    }
    process.stdout.write(entry.category);
  ' "$1" "$2"
}

target_is_ported() {
  node -e '
    const fs = require("fs");
    const path = require("path");
    const rootDir = process.argv[1];
    const exportPath = process.argv[2];
    const sourcePath = process.argv[3];
    const litPackage = JSON.parse(
      fs.readFileSync(path.join(rootDir, "packages/lit/package.json"), "utf8"),
    );
    const targetPath = path.join(rootDir, "packages/lit", sourcePath.replace(/^\.\//, ""));
    const exportedPath = litPackage.exports?.[exportPath];
    process.exit(exportedPath === sourcePath && fs.existsSync(targetPath) ? 0 : 1);
  ' "$ROOT_DIR" "$CURRENT_TARGET" "$CURRENT_SOURCE_PATH"
}

write_inventory_snapshot() {
  local output_file="$1"
  (
    cd "$ROOT_DIR"
    node ./scripts/generate-lit-migration-inventory.mjs --write >"$output_file"
  )
}

wait_for_url() {
  local url="$1"

  for _ in $(seq 1 120); do
    if curl --silent --fail "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done

  return 1
}

cleanup() {
  if [[ -n "$BACKGROUND_PIDS_FILE" && -f "$BACKGROUND_PIDS_FILE" ]]; then
    while IFS= read -r pid; do
      kill "$pid" >/dev/null 2>&1 || true
    done <"$BACKGROUND_PIDS_FILE"
  fi
}

trap cleanup EXIT

write_status_file() {
  local status="$1"
  local iteration="$2"

  node -e '
    const fs = require("fs");
    const payload = {
      target: process.argv[2],
      status: process.argv[3],
      iteration: Number(process.argv[4]),
      commitStatus: process.argv[5],
      commitSha: process.argv[6] || null,
      commitReason: process.argv[7] || null,
    };
    fs.writeFileSync(process.argv[1], JSON.stringify(payload, null, 2) + "\n");
  ' \
    "$CURRENT_TARGET_ARTIFACTS_DIR/status.json" \
    "$CURRENT_TARGET" \
    "$status" \
    "$iteration" \
    "$TARGET_COMMIT_STATUS" \
    "$TARGET_COMMIT_SHA" \
    "$TARGET_COMMIT_REASON"
}

read_status_field() {
  local status_file="$1"
  local field_name="$2"

  node -e '
    const fs = require("fs");
    const status = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const field = process.argv[2];
    const value = status[field];
    if (value === undefined || value === null) {
      process.exit(1);
    }
    process.stdout.write(String(value));
  ' "$status_file" "$field_name"
}

read_target_queue() {
  node -e '
    const fs = require("fs");
    const inventory = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const preferredOrder = [
      "./types",
      "./use-render",
      "./unstable-use-media-query",
      "./merge-props",
      "./separator",
      "./meter",
      "./progress",
      "./button",
      "./avatar",
      "./switch",
      "./toggle",
      "./checkbox",
      "./checkbox-group",
      "./radio",
      "./radio-group",
      "./input",
      "./field",
      "./fieldset",
      "./form",
      "./accordion",
      "./collapsible",
      "./popover",
      "./dialog",
      "./alert-dialog",
      "./tooltip",
      "./preview-card",
      "./menu",
      "./menubar",
      "./context-menu",
      "./select",
      "./tabs",
      "./toolbar",
      "./scroll-area",
      "./slider",
      "./navigation-menu",
      "./toast",
      "./drawer",
      "./autocomplete",
      "./combobox",
      "./number-field",
    ];

    const allTargets = inventory.entrypoints
      .map((entry) => entry.exportPath)
      .filter((entry) => entry !== ".");

    const seen = new Set();
    const ordered = [];

    for (const entry of preferredOrder) {
      if (allTargets.includes(entry) && !seen.has(entry)) {
        ordered.push(entry);
        seen.add(entry);
      }
    }

    for (const entry of allTargets.sort((left, right) => left.localeCompare(right))) {
      if (!seen.has(entry)) {
        ordered.push(entry);
        seen.add(entry);
      }
    }

    process.stdout.write(ordered.join("\n"));
  ' "$1"
}

run_gate() {
  local label="$1"
  local output_file="$2"
  shift 2

  log "$label"

  local status=0
  if "$@" >"$output_file" 2>&1; then
    status=0
  else
    status=$?
  fi

  printf '%s\n' "$status" >"${output_file}.status"
  return 0
}

run_export_gate() {
  node -e '
    const fs = require("fs");
    const path = require("path");

    const rootDir = process.argv[1];
    const exportPath = process.argv[2];
    const sourcePath = process.argv[3];

    const litPackagePath = path.join(rootDir, "packages/lit/package.json");
    const litPackage = JSON.parse(fs.readFileSync(litPackagePath, "utf8"));
    const exportsField = litPackage.exports ?? {};
    const targetPath = path.join(rootDir, "packages/lit", sourcePath.replace(/^\.\//, ""));
    const exportTarget = exportsField[exportPath];

    const messages = [];
    let failed = false;

    if (exportTarget !== sourcePath) {
      failed = true;
      messages.push(
        `Missing or incorrect export in packages/lit/package.json for ${exportPath}. Expected ${sourcePath}, received ${exportTarget ?? "<missing>"}.`,
      );
    } else {
      messages.push(`Export path ${exportPath} is declared in packages/lit/package.json.`);
    }

    if (!fs.existsSync(targetPath)) {
      failed = true;
      messages.push(`Missing target source file ${path.relative(rootDir, targetPath)}.`);
    } else {
      messages.push(`Target source exists at ${path.relative(rootDir, targetPath)}.`);
    }

    process.stdout.write(messages.join("\n") + "\n");
    process.exit(failed ? 1 : 0);
  ' "$ROOT_DIR" "$CURRENT_TARGET" "$CURRENT_SOURCE_PATH"
}

run_vitest_gate() {
  local target_dir="$ROOT_DIR/packages/lit/${CURRENT_SOURCE_PATH#./}"
  target_dir="$(dirname "$target_dir")"

  if [[ ! -d "$target_dir" ]]; then
    echo "No Lit target directory exists yet for $CURRENT_TARGET_LABEL at ${target_dir#$ROOT_DIR/}."
    return 1
  fi

  local -a test_files=()
  while IFS= read -r file_path; do
    test_files+=("${file_path#$ROOT_DIR/packages/lit/}")
  done < <(find "$target_dir" \( -name '*.test.ts' -o -name '*.test.tsx' \) -print | sort)

  if [[ "${#test_files[@]}" -eq 0 ]]; then
    echo "No Lit tests found for $CURRENT_TARGET at ${target_dir#$ROOT_DIR/}."
    return 1
  fi

  (
    cd "$ROOT_DIR/packages/lit"
    pnpm exec vitest run "${test_files[@]}"
  )
}

run_react_unit_gate() {
  local react_target_dir="$ROOT_DIR/packages/react/${CURRENT_SOURCE_PATH#./}"
  react_target_dir="$(dirname "$react_target_dir")"

  if [[ ! -d "$react_target_dir" ]]; then
    echo "No React source directory found for $CURRENT_TARGET at ${react_target_dir#$ROOT_DIR/}."
    return 0
  fi

  local -a test_files=()
  while IFS= read -r file_path; do
    test_files+=("${file_path#$ROOT_DIR/}")
  done < <(find "$react_target_dir" \( -name '*.test.ts' -o -name '*.test.tsx' \) -print | sort)

  if [[ "${#test_files[@]}" -eq 0 ]]; then
    echo "No React unit tests found for $CURRENT_TARGET in ${react_target_dir#$ROOT_DIR/}."
    return 0
  fi

  (
    cd "$ROOT_DIR"
    VITEST_ENV=jsdom pnpm exec vitest run "${test_files[@]}"
  )
}

run_browser_harness() {
  local build_script="$1"
  local server_script="$2"
  local config_path="$3"
  local test_file="$4"
  local pattern="$5"
  local server_url="$6"

  local pid=""
  local status=0

  echo "Building harness with pnpm $build_script"
  (
    cd "$ROOT_DIR"
    pnpm "$build_script"
  )

  echo "Starting harness server with pnpm $server_script"
  (
    cd "$ROOT_DIR"
    pnpm "$server_script"
  ) &
  pid=$!
  printf '%s\n' "$pid" >>"$BACKGROUND_PIDS_FILE"

  if ! wait_for_url "$server_url"; then
    echo "Timed out waiting for $server_url"
    if [[ -n "$pid" ]]; then
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" >/dev/null 2>&1 || true
    fi
    return 1
  fi

  echo "Running browser tests matching pattern: $pattern"
  if ! (
    cd "$ROOT_DIR"
    pnpm exec vitest run --config "$config_path" "$test_file" --testNamePattern "$pattern"
  ); then
    status=$?
  fi

  if [[ -n "$pid" ]]; then
    kill "$pid" >/dev/null 2>&1 || true
    wait "$pid" >/dev/null 2>&1 || true
  fi

  return "$status"
}

pascal_target_name() {
  node -e '
    const value = process.argv[1];
    process.stdout.write(
      value
        .split(/[-/]/)
        .filter(Boolean)
        .map((part) => part[0].toUpperCase() + part.slice(1))
        .join(""),
    );
  ' "$CURRENT_TARGET_LABEL"
}

get_react_docs_target_dir() {
  local category="$1"
  case "$category" in
    component)
      printf '%s/docs/src/app/(docs)/react/components/%s' "$ROOT_DIR" "$CURRENT_TARGET_LABEL"
      ;;
    utility)
      printf '%s/docs/src/app/(docs)/react/utils/%s' "$ROOT_DIR" "$CURRENT_TARGET_LABEL"
      ;;
    *)
      printf ''
      ;;
  esac
}

get_lit_docs_target_dir() {
  local category="$1"
  case "$category" in
    component)
      printf '%s/docs/src/app/(docs)/lit/components/%s' "$ROOT_DIR" "$CURRENT_TARGET_LABEL"
      ;;
    utility)
      printf '%s/docs/src/app/(docs)/lit/utils/%s' "$ROOT_DIR" "$CURRENT_TARGET_LABEL"
      ;;
    *)
      printf ''
      ;;
  esac
}

get_target_commit_paths() {
  local lit_target_file="packages/lit/${CURRENT_SOURCE_PATH#./}"
  local lit_target_dir
  lit_target_dir="$(dirname "$lit_target_file")"
  local lit_docs_dir=""
  local pascal_name
  pascal_name="$(pascal_target_name)"
  lit_docs_dir="$(get_lit_docs_target_dir "$CURRENT_TARGET_CATEGORY")"

  cat <<EOF
packages/lit/package.json
packages/lit/migration-inventory.json
packages/lit/src/index.ts
packages/lit/src/index.test.ts
$lit_target_file
$lit_target_dir
test/e2e-lit/index.test.ts
test/e2e-lit/main.tsx
test/e2e-lit/fixtures/$CURRENT_TARGET_LABEL
test/e2e-lit/fixtures/${pascal_name}.ts
test/e2e-lit/fixtures/${pascal_name}.tsx
test/e2e-lit/fixtures/${pascal_name}.js
test/e2e-lit/fixtures/${pascal_name}.jsx
test/regressions-lit/index.test.ts
test/regressions-lit/main.tsx
test/regressions-lit/fixtures/$CURRENT_TARGET_LABEL
docs/src/app/(docs)/lit
$lit_docs_dir
EOF
}

is_ignored_commit_artifact() {
  local file_path="$1"
  case "$file_path" in
    .ralph/*|test/regressions-lit/screenshots/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

path_in_scope() {
  local file_path="$1"
  shift

  local scoped_path=""
  for scoped_path in "$@"; do
    [[ -z "$scoped_path" ]] && continue
    if [[ "$file_path" == "$scoped_path" || "$file_path" == "$scoped_path"/* ]]; then
      return 0
    fi
  done

  return 1
}

collect_changed_files() {
  (
    cd "$ROOT_DIR"
    {
      git diff --name-only
      git diff --cached --name-only
      git ls-files --others --exclude-standard
    } | sed '/^$/d' | sort -u
  )
}

maybe_commit_target() {
  TARGET_COMMIT_STATUS="pending"
  TARGET_COMMIT_SHA=""
  TARGET_COMMIT_REASON=""

  local -a scoped_paths=()
  local -a changed_files=()
  local -a scoped_changed_files=()
  local -a out_of_scope_files=()
  local changed_file=""

  mapfile -t scoped_paths < <(get_target_commit_paths | sed '/^$/d' | sort -u)
  mapfile -t changed_files < <(collect_changed_files)

  if [[ "${#changed_files[@]}" -eq 0 ]]; then
    TARGET_COMMIT_STATUS="skipped"
    TARGET_COMMIT_REASON="No tracked or untracked changes to commit."
    return 0
  fi

  for changed_file in "${changed_files[@]}"; do
    if is_ignored_commit_artifact "$changed_file"; then
      continue
    fi

    if path_in_scope "$changed_file" "${scoped_paths[@]}"; then
      scoped_changed_files+=("$changed_file")
    else
      out_of_scope_files+=("$changed_file")
    fi
  done

  if [[ "${#scoped_changed_files[@]}" -eq 0 ]]; then
    TARGET_COMMIT_STATUS="skipped"
    TARGET_COMMIT_REASON="No in-scope target changes to commit."
    return 0
  fi

  if [[ "${#out_of_scope_files[@]}" -gt 0 ]]; then
    TARGET_COMMIT_STATUS="skipped"
    TARGET_COMMIT_REASON="Worktree has out-of-scope changes: $(printf '%s, ' "${out_of_scope_files[@]}" | sed 's/, $//')"
    return 0
  fi

  local previous_dir="$PWD"
  cd "$ROOT_DIR"

  git add -A -- "${scoped_changed_files[@]}"

  if git diff --cached --quiet; then
    TARGET_COMMIT_STATUS="skipped"
    TARGET_COMMIT_REASON="No staged in-scope changes to commit."
    cd "$previous_dir"
    return 0
  fi

  if git commit -m "[${CURRENT_TARGET_LABEL}] Port Lit surface" >/dev/null 2>&1; then
    TARGET_COMMIT_STATUS="committed"
    TARGET_COMMIT_SHA="$(git rev-parse HEAD)"
    TARGET_COMMIT_REASON=""
    cd "$previous_dir"
    return 0
  fi

  TARGET_COMMIT_STATUS="failed"
  TARGET_COMMIT_REASON="git commit failed for the completed target."
  cd "$previous_dir"
  return 0
}

run_e2e_gate() {
  local target_fragment="$CURRENT_TARGET_LABEL"
  local pascal_name
  pascal_name="$(pascal_target_name)"
  local fixture_dir="$ROOT_DIR/test/e2e/fixtures/$target_fragment"
  local fixture_file="$ROOT_DIR/test/e2e/fixtures/${pascal_name}.tsx"
  local fixture_file_js="$ROOT_DIR/test/e2e/fixtures/${pascal_name}.ts"

  if [[ ! -d "$fixture_dir" && ! -f "$fixture_file" && ! -f "$fixture_file_js" ]]; then
    echo "No matching e2e coverage found for $CURRENT_TARGET."
    return 0
  fi

  run_browser_harness \
    "test:e2e:build" \
    "test:e2e:server" \
    "test/e2e/vitest.config.mts" \
    "test/e2e/index.test.ts" \
    "${target_fragment}|${pascal_name}|<${pascal_name}[[:space:]]*/>" \
    "http://localhost:5173"
}

run_regression_gate() {
  local target_fragment="$CURRENT_TARGET_LABEL"
  local target_category="$CURRENT_TARGET_CATEGORY"
  local docs_dir=""
  docs_dir="$(get_react_docs_target_dir "$target_category")"

  if [[ -z "$docs_dir" || ! -d "$docs_dir" ]]; then
    echo "No matching regression coverage found for $CURRENT_TARGET."
    return 0
  fi

  run_browser_harness \
    "test:regressions:build" \
    "test:regressions:server" \
    "test/regressions/vitest.config.mts" \
    "test/regressions/index.test.ts" \
    "${target_fragment}" \
    "http://localhost:5173"
}

run_lit_e2e_gate() {
  local target_fragment="$CURRENT_TARGET_LABEL"
  local pascal_name
  pascal_name="$(pascal_target_name)"
  local lit_fixture_dir="$ROOT_DIR/test/e2e-lit/fixtures/$target_fragment"
  local lit_fixture_file="$ROOT_DIR/test/e2e-lit/fixtures/${pascal_name}.tsx"
  local lit_fixture_file_ts="$ROOT_DIR/test/e2e-lit/fixtures/${pascal_name}.ts"
  local lit_fixture_match=""
  local has_react_baseline=0

  if [[ -d "$ROOT_DIR/test/e2e/fixtures/$target_fragment" || -f "$ROOT_DIR/test/e2e/fixtures/${pascal_name}.tsx" || -f "$ROOT_DIR/test/e2e/fixtures/${pascal_name}.ts" ]]; then
    has_react_baseline=1
  fi

  if [[ -d "$lit_fixture_dir" ]]; then
    lit_fixture_match="$(find "$lit_fixture_dir" -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' \) -print 2>/dev/null || true)"
  elif [[ -f "$lit_fixture_file" || -f "$lit_fixture_file_ts" ]]; then
    lit_fixture_match="$(printf '%s\n%s\n' "$lit_fixture_file" "$lit_fixture_file_ts" | sed '/^$/d' | while IFS= read -r file_path; do [[ -f "$file_path" ]] && printf '%s\n' "$file_path"; done)"
  fi

  local lit_references=""
  if [[ -n "$lit_fixture_match" ]]; then
    lit_references="$(
      while IFS= read -r file_path; do
        [[ -z "$file_path" ]] && continue
        grep -lE '@base-ui/lit|packages/lit' "$file_path" 2>/dev/null || true
      done <<<"$lit_fixture_match"
    )"
  fi

  if [[ -z "$lit_references" ]]; then
    if target_is_ported && [[ "$has_react_baseline" -eq 1 ]]; then
      echo "Missing matching Lit e2e coverage for $CURRENT_TARGET in test/e2e-lit/fixtures that actually references @base-ui/lit."
      return 1
    fi

    echo "No matching Lit e2e coverage found for $CURRENT_TARGET."
    return 0
  fi

  run_browser_harness \
    "test:e2e:lit:build" \
    "test:e2e:lit:server" \
    "test/e2e-lit/vitest.config.mts" \
    "test/e2e-lit/index.test.ts" \
    "${target_fragment}|${pascal_name}|<${pascal_name}[[:space:]]*/>" \
    "http://localhost:5174"
}

run_lit_regression_gate() {
  local target_fragment="$CURRENT_TARGET_LABEL"
  local target_category="$CURRENT_TARGET_CATEGORY"
  local react_docs_dir=""
  local lit_docs_dir=""
  local lit_match=""
  local lit_coverage_match=""
  local has_react_baseline=0

  react_docs_dir="$(get_react_docs_target_dir "$target_category")"
  lit_docs_dir="$(get_lit_docs_target_dir "$target_category")"

  if [[ -n "$react_docs_dir" && -d "$react_docs_dir" ]]; then
    has_react_baseline=1
  fi

  if [[ -n "$lit_docs_dir" && -d "$lit_docs_dir" ]]; then
    lit_match="$(find "$lit_docs_dir" "$ROOT_DIR/test/regressions-lit/fixtures" -type f 2>/dev/null || true)"
  else
    lit_match="$(find "$ROOT_DIR/test/regressions-lit/fixtures" -type f 2>/dev/null || true)"
  fi

  if [[ -n "$lit_match" ]]; then
    lit_coverage_match="$(
      while IFS= read -r file_path; do
        [[ -z "$file_path" ]] && continue
        grep -lE '@base-ui/lit|packages/lit' "$file_path" 2>/dev/null || true
      done <<<"$lit_match"
    )"
  fi
  if [[ -z "$lit_coverage_match" ]]; then
    if target_is_ported && [[ "$has_react_baseline" -eq 1 ]]; then
      echo "Missing matching Lit regression coverage for $CURRENT_TARGET in test/regressions-lit or docs/src/app/(docs)/lit that actually references @base-ui/lit."
      return 1
    fi

    echo "No matching Lit regression coverage found for $CURRENT_TARGET."
    return 0
  fi

  run_browser_harness \
    "test:regressions:lit:build" \
    "test:regressions:lit:server" \
    "test/regressions-lit/vitest.config.mts" \
    "test/regressions-lit/index.test.ts" \
    "${target_fragment}" \
    "http://localhost:5175"
}

run_typecheck_gate() {
  (
    cd "$ROOT_DIR"
    pnpm --filter @base-ui/lit typescript
  )
}

run_review_gate() {
  local lit_target_path="packages/lit/${CURRENT_SOURCE_PATH#./}"
  local lit_target_dir
  lit_target_dir="$(dirname "$lit_target_path")"
  local react_source_path="packages/react/${CURRENT_SOURCE_PATH#./}"
  local react_source_dir
  react_source_dir="$(dirname "$react_source_path")"
  local -a scoped_paths=(
    "packages/lit/package.json"
    "$lit_target_dir"
    "$react_source_dir"
    "packages/lit/src/index.ts"
  )

  if git -C "$ROOT_DIR" diff --quiet && git -C "$ROOT_DIR" diff --cached --quiet; then
    echo "No current git diff to review."
    return 0
  fi

  if git -C "$ROOT_DIR" diff --quiet -- "${scoped_paths[@]}" &&
    git -C "$ROOT_DIR" diff --cached --quiet -- "${scoped_paths[@]}"; then
    echo "No current in-scope git diff to review for $CURRENT_TARGET."
    return 0
  fi

  local review_prompt
  review_prompt=$(cat <<EOF
Use \$pr-review-toolkit.

Review the current git diff in this repository.

Scope:
- only review files relevant to target ${CURRENT_TARGET}
- ignore unrelated diffs outside these paths:
  - ${scoped_paths[0]}
  - ${scoped_paths[1]}
  - ${scoped_paths[2]}
  - ${scoped_paths[3]}
- focus on behavioural regressions, export parity gaps, missing tests, type design issues, silent failures, and comment accuracy when applicable
- findings first, ordered by severity
- include file:line references when possible
- keep summary brief

If there are no in-scope findings, say so explicitly.
EOF
)

  codex exec \
    --full-auto \
    --sandbox workspace-write \
    --output-last-message /dev/stdout \
    "$review_prompt"
}

write_summary() {
  local iteration_dir="$1"
  local summary_file="$2"

  node -e '
    const fs = require("fs");
    const summary = {
      target: process.argv[1],
      sourcePath: process.argv[2],
      inventory: process.argv[3],
      exportGate: process.argv[4],
      reactUnit: process.argv[5],
      e2eBaseline: process.argv[6],
      regressionBaseline: process.argv[7],
      litE2E: process.argv[8],
      litRegression: process.argv[9],
      vitest: process.argv[10],
      typecheck: process.argv[11],
      review: process.argv[12],
    };
    fs.writeFileSync(process.argv[13], JSON.stringify(summary, null, 2) + "\n");
  ' \
    "$CURRENT_TARGET" \
    "$CURRENT_SOURCE_PATH" \
    "$iteration_dir/inventory.json" \
    "$iteration_dir/export.txt" \
    "$iteration_dir/react-unit.txt" \
    "$iteration_dir/e2e.txt" \
    "$iteration_dir/regressions.txt" \
    "$iteration_dir/lit-e2e.txt" \
    "$iteration_dir/lit-regressions.txt" \
    "$iteration_dir/vitest.txt" \
    "$iteration_dir/typecheck.txt" \
    "$iteration_dir/review.txt" \
    "$summary_file"
}

review_has_findings() {
  local file_path="$1"
  if [[ ! -s "$file_path" ]]; then
    return 1
  fi

  local severity_pattern='^[[:space:]]*([*-]|[0-9]+\.)?[[:space:]]*(High|Medium|Low|Critical|Important|Blocking)\b'

  if grep -qiE '^[[:space:]]*No current git diff to review\.$' "$file_path"; then
    return 1
  fi

  if grep -qiE '^[[:space:]]*No current in-scope git diff to review' "$file_path"; then
    return 1
  fi

  if grep -qiE '(^|[[:space:][:punct:]])No([[:space:]-]+[[:alnum:]]+)*[[:space:]]+(findings|issues)\b|(^|[[:space:][:punct:]])I found no([[:space:]-]+[[:alnum:]]+)*[[:space:]]+(findings|issues)\b' "$file_path" &&
    ! grep -qiE "$severity_pattern" "$file_path"; then
    return 1
  fi

  if grep -qiE "$severity_pattern" "$file_path"; then
    return 0
  fi

  return 0
}

render_failures() {
  local iteration_dir="$1"
  {
    for file in \
      "$iteration_dir/export.txt" \
      "$iteration_dir/react-unit.txt" \
      "$iteration_dir/e2e.txt" \
      "$iteration_dir/regressions.txt" \
      "$iteration_dir/lit-e2e.txt" \
      "$iteration_dir/lit-regressions.txt" \
      "$iteration_dir/vitest.txt" \
      "$iteration_dir/typecheck.txt" \
      "$iteration_dir/review.txt"; do
      if [[ -f "$file" ]]; then
        echo "### $(basename "$file")"
        tail -n 160 "$file"
        echo
      fi
    done
  } >"$CURRENT_TARGET_ARTIFACTS_DIR/failures.txt"
}

all_gates_passed() {
  local iteration_dir="$1"
  local failures=0

  for status_file in \
    "$iteration_dir/export.txt.status" \
    "$iteration_dir/react-unit.txt.status" \
    "$iteration_dir/e2e.txt.status" \
    "$iteration_dir/regressions.txt.status" \
    "$iteration_dir/lit-e2e.txt.status" \
    "$iteration_dir/lit-regressions.txt.status" \
    "$iteration_dir/vitest.txt.status" \
    "$iteration_dir/typecheck.txt.status" \
    "$iteration_dir/review.txt.status"; do
    if [[ ! -f "$status_file" ]] || [[ "$(tr -d '\n' <"$status_file")" != "0" ]]; then
      failures=1
    fi
  done

  if [[ -f "$iteration_dir/review.txt" ]] && review_has_findings "$iteration_dir/review.txt"; then
    failures=1
  fi

  return "$failures"
}

run_iteration_gates() {
  local iteration="$1"
  local iteration_dir="$CURRENT_TARGET_ARTIFACTS_DIR/iteration-$iteration"

  mkdir -p "$iteration_dir"
  log "Target $CURRENT_TARGET, iteration $iteration"
  log "Artifacts: ${iteration_dir#$ROOT_DIR/}"
  log "Refreshing migration inventory"
  write_inventory_snapshot "$iteration_dir/inventory.json"

  run_gate "Checking export surface" "$iteration_dir/export.txt" run_export_gate
  run_gate "Running React unit baseline" "$iteration_dir/react-unit.txt" run_react_unit_gate
  run_gate "Running React e2e baseline" "$iteration_dir/e2e.txt" run_e2e_gate
  run_gate "Running React regression baseline" "$iteration_dir/regressions.txt" run_regression_gate
  run_gate "Running Lit e2e harness" "$iteration_dir/lit-e2e.txt" run_lit_e2e_gate
  run_gate "Running Lit regression harness" "$iteration_dir/lit-regressions.txt" run_lit_regression_gate
  run_gate "Running Lit tests" "$iteration_dir/vitest.txt" run_vitest_gate
  run_gate "Running Lit typecheck" "$iteration_dir/typecheck.txt" run_typecheck_gate
  run_gate "Running review wrapper" "$iteration_dir/review.txt" run_review_gate
  write_summary "$iteration_dir" "$iteration_dir/summary.json"
  render_failures "$iteration_dir"
  log "Iteration $iteration complete for $CURRENT_TARGET_LABEL"
}

build_initial_prompt() {
  local react_source_path="packages/react/${CURRENT_SOURCE_PATH#./}"
  local lit_source_path="packages/lit/${CURRENT_SOURCE_PATH#./}"

  cat >"$CODEX_PROMPT_FILE" <<EOF
Task:
$TASK

Working rules:
- Work only in this repository.
- Target export path: ${CURRENT_TARGET}
- Preserve the public API and semantics of the React implementation.
- React source of truth: ${react_source_path}
- Use the React unit/e2e/regression baseline artifacts in ${CURRENT_TARGET_ARTIFACTS_DIR#$ROOT_DIR/} as behavioral evidence when they exist.
- Lit target file to create or update: ${lit_source_path}
- Update packages/lit/package.json exports for ${CURRENT_TARGET} when the target is implemented.
- Add Lit tests for the target under the corresponding packages/lit/src directory.
- Add new Lit browser coverage in test/e2e-lit and test/regressions-lit instead of changing the existing React harnesses.
- If the target has docs-style coverage, add it under docs/src/app/(docs)/lit as React wrappers around Lit components when needed.
- Read the latest failure evidence in ${CURRENT_TARGET_ARTIFACTS_DIR#$ROOT_DIR/}/failures.txt and the per-iteration artifacts under ${CURRENT_TARGET_ARTIFACTS_DIR#$ROOT_DIR/}.
- Do not stop to summarize progress unless blocked.

Done only when:
- packages/lit/package.json exports ${CURRENT_TARGET} to ${CURRENT_SOURCE_PATH}
- the target Lit source exists
- Lit tests exist for the target and pass
- matching React baseline checks stay green when coverage exists
- matching Lit cloned browser coverage exists and passes when equivalent React coverage exists
- pnpm --filter @base-ui/lit typescript passes
- review findings are addressed or there are no blocking findings

When everything is complete, reply with exactly:
COMPLETE
EOF
}

build_resume_prompt() {
  cat >"$CODEX_PROMPT_FILE" <<EOF
Continue the Base UI React-to-Lit migration for ${CURRENT_TARGET}.

Use the latest failure evidence in ${CURRENT_TARGET_ARTIFACTS_DIR#$ROOT_DIR/}/failures.txt and the artifacts in ${CURRENT_TARGET_ARTIFACTS_DIR#$ROOT_DIR/}/iteration-$1/.
Make concrete progress on the current target only unless the failing evidence proves shared infrastructure is broken.
Do not summarize unless blocked.

If and only if all gates are satisfied, reply with exactly COMPLETE.
EOF
}

target_already_complete() {
  local label="$1"
  local status_file="$ARTIFACTS_DIR/targets/$label/status.json"

  if [[ ! -f "$status_file" ]]; then
    return 1
  fi

  node -e '
    const fs = require("fs");
    const status = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    process.exit(status.status === "complete" ? 0 : 1);
  ' "$status_file"
}

target_has_existing_artifacts() {
  local label="$1"
  local target_dir="$ARTIFACTS_DIR/targets/$label"

  if [[ ! -d "$target_dir" ]]; then
    return 1
  fi

  find "$target_dir" -mindepth 1 -print -quit >/dev/null 2>&1
}

finalize_existing_complete_target() {
  local target="$1"
  local label="$2"
  local status_file="$ARTIFACTS_DIR/targets/$label/status.json"
  local iteration="0"
  local current_commit_status=""

  if [[ ! -f "$status_file" ]]; then
    return 0
  fi

  if ! target_already_complete "$label"; then
    return 0
  fi

  current_commit_status="$(read_status_field "$status_file" commitStatus 2>/dev/null || true)"
  if [[ "$current_commit_status" == "committed" ]]; then
    return 0
  fi

  iteration="$(read_status_field "$status_file" iteration 2>/dev/null || printf '0')"

  CURRENT_TARGET="$(normalize_target "$target")"
  CURRENT_TARGET_LABEL="$label"
  CURRENT_TARGET_CATEGORY="$(get_target_category "$GLOBAL_INVENTORY_FILE" "$CURRENT_TARGET")"
  CURRENT_TARGET_ARTIFACTS_DIR="$ARTIFACTS_DIR/targets/$CURRENT_TARGET_LABEL"
  CURRENT_SOURCE_PATH="$(get_source_path "$GLOBAL_INVENTORY_FILE" "$CURRENT_TARGET")"
  TARGET_COMMIT_STATUS="pending"
  TARGET_COMMIT_SHA=""
  TARGET_COMMIT_REASON=""

  maybe_commit_target
  write_status_file "complete" "$iteration"
}

run_target_loop() {
CURRENT_TARGET="$(normalize_target "$1")"
  CURRENT_TARGET_LABEL="$(target_label "$CURRENT_TARGET")"
  CURRENT_TARGET_CATEGORY="$(get_target_category "$GLOBAL_INVENTORY_FILE" "$CURRENT_TARGET")"
  CURRENT_TARGET_ARTIFACTS_DIR="$ARTIFACTS_DIR/targets/$CURRENT_TARGET_LABEL"
  RESUME_FILE="$CURRENT_TARGET_ARTIFACTS_DIR/last-message.txt"
  SESSION_FILE="$CURRENT_TARGET_ARTIFACTS_DIR/session-id.txt"
  CODEX_PROMPT_FILE="$CURRENT_TARGET_ARTIFACTS_DIR/prompt.txt"
  CURRENT_SOURCE_PATH="$(get_source_path "$GLOBAL_INVENTORY_FILE" "$CURRENT_TARGET")"

  mkdir -p "$CURRENT_TARGET_ARTIFACTS_DIR"
  TARGET_COMMIT_STATUS="pending"
  TARGET_COMMIT_SHA=""
  TARGET_COMMIT_REASON=""
  log "Starting target sweep: $CURRENT_TARGET"
  run_iteration_gates 0

  if all_gates_passed "$CURRENT_TARGET_ARTIFACTS_DIR/iteration-0"; then
    maybe_commit_target
    write_status_file "complete" 0
    log "Target already passes gates without Codex: $CURRENT_TARGET"
    return 0
  fi

  build_initial_prompt

  cd "$ROOT_DIR"
  log "Launching Codex for $CURRENT_TARGET"
  codex exec \
    --json \
    --full-auto \
    --sandbox workspace-write \
    --output-last-message "$RESUME_FILE" \
    "$(cat "$CODEX_PROMPT_FILE")" >"$CURRENT_TARGET_ARTIFACTS_DIR/codex-initial.jsonl" 2>&1
  extract_thread_id "$CURRENT_TARGET_ARTIFACTS_DIR/codex-initial.jsonl" >"$SESSION_FILE"

  if [[ ! -s "$SESSION_FILE" ]]; then
    echo "Unable to capture Codex session id for $CURRENT_TARGET" >&2
    return 1
  fi

  local last_message=""

  for iteration in $(seq 1 "$MAX_ITERATIONS"); do
    run_iteration_gates "$iteration"
    if [[ -f "$RESUME_FILE" ]]; then
      last_message="$(sed '/^[[:space:]]*$/d' "$RESUME_FILE" | tail -n 1 || true)"
    else
      last_message=""
    fi

    if [[ "$last_message" == "COMPLETE" ]] && all_gates_passed "$CURRENT_TARGET_ARTIFACTS_DIR/iteration-$iteration"; then
      maybe_commit_target
      write_status_file "complete" "$iteration"
      log "Target complete: $CURRENT_TARGET"
      return 0
    fi

    build_resume_prompt "$iteration"
    log "Resuming Codex for $CURRENT_TARGET"
    codex exec resume "$(cat "$SESSION_FILE")" \
      --full-auto \
      --output-last-message "$RESUME_FILE" \
      "$(cat "$CODEX_PROMPT_FILE")"
  done

  TARGET_COMMIT_STATUS="not-applicable"
  TARGET_COMMIT_SHA=""
  TARGET_COMMIT_REASON="Target did not complete."
  write_status_file "max-iterations" "$MAX_ITERATIONS"
  return 1
}

GLOBAL_INVENTORY_FILE="$ARTIFACTS_DIR/migration-inventory.json"
FAILED_TARGETS_FILE="$ARTIFACTS_DIR/failed-targets.txt"
COMPLETED_TARGETS_FILE="$ARTIFACTS_DIR/completed-targets.txt"
BACKGROUND_PIDS_FILE="$ARTIFACTS_DIR/background-pids.txt"

: >"$FAILED_TARGETS_FILE"
: >"$COMPLETED_TARGETS_FILE"
: >"$BACKGROUND_PIDS_FILE"

write_inventory_snapshot "$GLOBAL_INVENTORY_FILE"

if [[ "$RUN_ALL_TARGETS" -eq 0 ]]; then
  single_label="$(target_label "$(normalize_target "$TARGET")")"
  if target_has_existing_artifacts "$single_label" && [[ ! -f "$ARTIFACTS_DIR/targets/$single_label/status.json" ]]; then
    log "Found existing partial artifacts for $(normalize_target "$TARGET") without status; rerunning target"
  fi
  finalize_existing_complete_target "$(normalize_target "$TARGET")" "$single_label"
  if target_already_complete "$single_label"; then
    log "Skipping completed target: $(normalize_target "$TARGET")"
    printf '%s\n' "$(normalize_target "$TARGET")" >>"$COMPLETED_TARGETS_FILE"
    echo "COMPLETE"
    exit 0
  fi
  if ! run_target_loop "$TARGET"; then
    log "Requested target failed: $(normalize_target "$TARGET")"
    exit 1
  fi
  log "Requested target run finished"
  echo "COMPLETE"
  exit 0
fi

mapfile -t TARGET_QUEUE < <(read_target_queue "$GLOBAL_INVENTORY_FILE")
log "Sweeping ${#TARGET_QUEUE[@]} export paths from the migration backlog"

for queued_target in "${TARGET_QUEUE[@]}"; do
  local_label="$(target_label "$queued_target")"
  if target_has_existing_artifacts "$local_label" && [[ ! -f "$ARTIFACTS_DIR/targets/$local_label/status.json" ]]; then
    log "Found existing partial artifacts for $queued_target without status; rerunning target"
  fi

  finalize_existing_complete_target "$queued_target" "$local_label"

  if target_already_complete "$local_label"; then
    log "Skipping completed target: $queued_target"
    printf '%s\n' "$queued_target" >>"$COMPLETED_TARGETS_FILE"
    continue
  fi

  if run_target_loop "$queued_target"; then
    printf '%s\n' "$queued_target" >>"$COMPLETED_TARGETS_FILE"
  else
    log "Target failed, continuing sweep: $queued_target"
    printf '%s\n' "$queued_target" >>"$FAILED_TARGETS_FILE"
  fi
done

if [[ -s "$FAILED_TARGETS_FILE" ]]; then
  log "Full migration sweep finished with failures"
  log "Failed targets recorded in ${FAILED_TARGETS_FILE#$ROOT_DIR/}"
  exit 1
fi

log "Full migration sweep complete"
echo "COMPLETE"
