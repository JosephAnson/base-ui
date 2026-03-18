import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const reactPackagePath = path.join(repoRoot, 'packages/react/package.json');
const outputPath = path.join(repoRoot, 'packages/lit/migration-inventory.json');

function parseArgs(argv) {
  return {
    write: argv.includes('--write'),
    check: argv.includes('--check'),
  };
}

function getCategory(exportPath) {
  if (exportPath === '.') {
    return 'root';
  }

  if (exportPath === './types' || exportPath === './unstable-use-media-query' || exportPath === './use-render') {
    return 'utility';
  }

  return 'component';
}

function buildInventory() {
  const reactPackage = JSON.parse(fs.readFileSync(reactPackagePath, 'utf8'));
  const entrypoints = Object.entries(reactPackage.exports)
    .map(([exportPath, sourcePath]) => ({
      exportPath,
      sourcePath,
      category: getCategory(exportPath),
      status: exportPath === '.' ? 'scaffolded' : 'pending',
    }))
    .sort((left, right) => left.exportPath.localeCompare(right.exportPath));

  return {
    sourcePackage: '@base-ui/react',
    targetPackage: '@base-ui/lit',
    generatedAt: new Date().toISOString(),
    entrypointCount: entrypoints.length,
    entrypoints,
  };
}

function normalizeForCheck(value) {
  const copy = JSON.parse(JSON.stringify(value));
  delete copy.generatedAt;
  return copy;
}

const args = parseArgs(process.argv.slice(2));
const inventory = buildInventory();
const serialized = `${JSON.stringify(inventory, null, 2)}\n`;

if (args.check) {
  if (!fs.existsSync(outputPath)) {
    console.error('migration-inventory.json does not exist');
    process.exit(1);
  }

  const current = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  if (JSON.stringify(normalizeForCheck(current)) !== JSON.stringify(normalizeForCheck(inventory))) {
    console.error('migration-inventory.json is out of date');
    process.exit(1);
  }

  process.exit(0);
}

if (args.write) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serialized);
}

process.stdout.write(serialized);
