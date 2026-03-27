/* eslint-disable react/function-component-definition */
import * as React from 'react';

export type ImageLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface RootState {
  /**
   * The image loading status.
   */
  imageLoadingStatus: ImageLoadingStatus;
}

export interface RootApiProps {}

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
