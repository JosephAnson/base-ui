import type { TemplateResult } from 'lit';
import { useRender } from '../use-render';

export type Orientation = 'horizontal' | 'vertical';

/**
 * A separator element accessible to screen readers.
 * Renders a `<div>` element.
 */
export function Separator(componentProps: Separator.Props): TemplateResult {
  const { orientation = 'horizontal', render, ...elementProps } = componentProps;

  const state: SeparatorState = { orientation };

  return useRender<SeparatorState, HTMLDivElement>({
    defaultTagName: 'div',
    render,
    state,
    props: {
      role: 'separator',
      'aria-orientation': orientation,
      ...elementProps,
    },
  });
}

export interface SeparatorProps extends useRender.ComponentProps<'div', SeparatorState> {
  /**
   * The orientation of the separator.
   * @default 'horizontal'
   */
  orientation?: Orientation | undefined;
}

export interface SeparatorState {
  /**
   * The orientation of the separator.
   */
  orientation: Orientation;
}

export namespace Separator {
  export type Props = SeparatorProps;
  export type State = SeparatorState;
}
