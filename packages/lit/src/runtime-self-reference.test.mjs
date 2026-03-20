import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = resolve(CURRENT_DIR, '..');

describe('@base-ui/lit runtime exports', () => {
  it('supports runtime self-reference imports for the package root and switch/input subpaths', () => {
    const output = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        [
          "const root = await import('@base-ui/lit');",
          "const switchSubpath = await import('@base-ui/lit/switch');",
          "const inputSubpath = await import('@base-ui/lit/input');",
          [
            'process.stdout.write(JSON.stringify({',
            'rootSwitch: typeof root.Switch,',
            'switchSubpath: typeof switchSubpath.Switch,',
            'rootInput: typeof root.Input,',
            'inputSubpath: typeof inputSubpath.Input,',
            '}));',
          ].join(' '),
        ].join(' '),
      ],
      {
        cwd: PACKAGE_DIR,
        encoding: 'utf8',
      },
    );

    expect(JSON.parse(output)).toEqual({
      rootSwitch: 'object',
      switchSubpath: 'object',
      rootInput: 'function',
      inputSubpath: 'function',
    });
  });
});
