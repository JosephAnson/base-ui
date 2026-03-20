import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = resolve(CURRENT_DIR, '..');

describe('@base-ui/lit runtime exports', () => {
  it('supports runtime self-reference imports for the package root and switch/input/popover/preview-card/dialog/alert-dialog/tooltip subpaths', () => {
    const output = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        [
          "const root = await import('@base-ui/lit');",
          "const alertDialogSubpath = await import('@base-ui/lit/alert-dialog');",
          "const switchSubpath = await import('@base-ui/lit/switch');",
          "const inputSubpath = await import('@base-ui/lit/input');",
          "const popoverSubpath = await import('@base-ui/lit/popover');",
          "const previewCardSubpath = await import('@base-ui/lit/preview-card');",
          "const dialogSubpath = await import('@base-ui/lit/dialog');",
          "const tooltipSubpath = await import('@base-ui/lit/tooltip');",
          [
            'process.stdout.write(JSON.stringify({',
            'rootAlertDialog: typeof root.AlertDialog,',
            'alertDialogSubpath: typeof alertDialogSubpath.AlertDialog,',
            'rootSwitch: typeof root.Switch,',
            'switchSubpath: typeof switchSubpath.Switch,',
            'rootInput: typeof root.Input,',
            'inputSubpath: typeof inputSubpath.Input,',
            'rootPopover: typeof root.Popover,',
            'popoverSubpath: typeof popoverSubpath.Popover,',
            'rootPreviewCard: typeof root.PreviewCard,',
            'previewCardSubpath: typeof previewCardSubpath.PreviewCard,',
            'rootDialog: typeof root.Dialog,',
            'dialogSubpath: typeof dialogSubpath.Dialog,',
            'rootTooltip: typeof root.Tooltip,',
            'tooltipSubpath: typeof tooltipSubpath.Tooltip,',
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
      rootAlertDialog: 'object',
      alertDialogSubpath: 'object',
      rootSwitch: 'object',
      switchSubpath: 'object',
      rootInput: 'function',
      inputSubpath: 'function',
      rootPopover: 'object',
      popoverSubpath: 'object',
      rootPreviewCard: 'object',
      previewCardSubpath: 'object',
      rootDialog: 'object',
      dialogSubpath: 'object',
      rootTooltip: 'object',
      tooltipSubpath: 'object',
    });
  });
});
