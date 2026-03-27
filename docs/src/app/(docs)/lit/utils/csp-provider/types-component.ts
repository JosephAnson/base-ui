/* eslint-disable react/function-component-definition */
import * as React from 'react';

export interface CSPProviderState {}

export interface CSPProviderProps {
  /**
   * The nonce value to apply to inline `<style>` and `<script>` tags.
   */
  nonce?: string | undefined;
  /**
   * Whether inline `<style>` elements created by Base UI components should not be rendered. Instead, components must specify the CSS styles via custom class names or other methods.
   * @default false
   */
  disableStyleElements?: boolean | undefined;
}

export const CSPProvider: React.FC<CSPProviderProps> = () => null;

export namespace CSPProvider {
  export type State = CSPProviderState;
  export type Props = CSPProviderProps;
}
