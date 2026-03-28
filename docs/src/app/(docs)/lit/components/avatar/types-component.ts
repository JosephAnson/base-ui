/* eslint-disable react/function-component-definition */
import * as React from 'react';
import type { TemplateResult } from 'lit';
import type { ComponentRenderFn, HTMLProps } from '@base-ui/lit/types';

export type ImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface RootState {
  /**
   * The image loading status.
   */
  imageLoadingStatus: ImageLoadingStatus;
}

export interface RootApiProps {
  /**
   * Allows you to replace the component's HTML element with a different tag,
   * or compose it with a template that has a single root element.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, RootState> | undefined;
}

export const Root: React.FC<RootApiProps> = () => null;

export namespace Root {
  export type Props = RootApiProps;
  export type State = RootState;
}

export interface ImageState extends RootState {}

export interface ImageApiProps {
  /**
   * Callback fired when the loading status changes.
   */
  onLoadingStatusChange?: ((status: ImageLoadingStatus) => void) | undefined;
  /**
   * Allows you to replace the component's HTML element with a different tag,
   * or compose it with a template that has a single root element.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, ImageState> | undefined;
}

export const Image: React.FC<ImageApiProps> = () => null;

export namespace Image {
  export type Props = ImageApiProps;
  export type State = ImageState;
}

export interface FallbackState extends RootState {}

export interface FallbackApiProps {
  /**
   * How long to wait before showing the fallback. Specified in milliseconds.
   */
  delay?: number | undefined;
  /**
   * Allows you to replace the component's HTML element with a different tag,
   * or compose it with a template that has a single root element.
   * Accepts a `TemplateResult` or a function that returns the template to render.
   */
  render?: TemplateResult | ComponentRenderFn<HTMLProps, FallbackState> | undefined;
}

export const Fallback: React.FC<FallbackApiProps> = () => null;

export namespace Fallback {
  export type Props = FallbackApiProps;
  export type State = FallbackState;
}

export const Avatar = {
  Root,
  Image,
  Fallback,
} as const;
