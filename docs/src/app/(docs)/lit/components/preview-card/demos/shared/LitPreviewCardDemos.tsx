'use client';
import * as React from 'react';
import { html, svg } from 'lit';
import '@base-ui/lit/preview-card';
import { LitTemplateHost } from '../../../popover/demos/shared/LitTemplateHost';

export interface LitPreviewCardBaseProps {
  arrowClassName: string;
  arrowFillClassName?: string | undefined;
  arrowInnerStrokeClassName?: string | undefined;
  arrowOuterStrokeClassName?: string | undefined;
  imageClassName: string;
  linkClassName: string;
  popupClassName: string;
  popupContentClassName: string;
  summaryClassName: string;
}

export interface LitPreviewCardHeroProps extends LitPreviewCardBaseProps {
  paragraphClassName: string;
}

export function LitPreviewCardHero(props: LitPreviewCardHeroProps) {
  const {
    arrowClassName,
    arrowFillClassName,
    arrowInnerStrokeClassName,
    arrowOuterStrokeClassName,
    imageClassName,
    linkClassName,
    paragraphClassName,
    popupClassName,
    popupContentClassName,
    summaryClassName,
  } = props;

  const template = React.useCallback(
    () =>
      html`<preview-card-root>
        <p class=${paragraphClassName}>
          The principles of good
          <preview-card-trigger class=${linkClassName} href="https://en.wikipedia.org/wiki/Typography">
            typography
          </preview-card-trigger>
          remain in the digital age.
        </p>
        <preview-card-portal>
          <preview-card-positioner .sideOffset=${8}>
            <preview-card-popup class=${popupClassName}>
              <preview-card-arrow class=${arrowClassName}>
                ${arrowSvg({
                  arrowFillClassName,
                  arrowInnerStrokeClassName,
                  arrowOuterStrokeClassName,
                })}
              </preview-card-arrow>
              ${renderCardContent({
                imageClassName,
                popupContentClassName,
                summaryClassName,
                payload: 'typography',
              })}
            </preview-card-popup>
          </preview-card-positioner>
        </preview-card-portal>
      </preview-card-root>`,
    [
      arrowClassName,
      arrowFillClassName,
      arrowInnerStrokeClassName,
      arrowOuterStrokeClassName,
      imageClassName,
      linkClassName,
      paragraphClassName,
      popupClassName,
      popupContentClassName,
      summaryClassName,
    ],
  );

  return <LitTemplateHost template={template} />;
}

export interface LitPreviewCardDetachedSimpleProps extends LitPreviewCardBaseProps {
  paragraphClassName: string;
}

export function LitPreviewCardDetachedSimple(props: LitPreviewCardDetachedSimpleProps) {
  const {
    arrowClassName,
    arrowFillClassName,
    arrowInnerStrokeClassName,
    arrowOuterStrokeClassName,
    imageClassName,
    linkClassName,
    paragraphClassName,
    popupClassName,
    popupContentClassName,
    summaryClassName,
  } = props;

  const template = React.useCallback(
    () =>
      html`<preview-card-root>
        <p class=${paragraphClassName}>
          The principles of good
          <preview-card-trigger class=${linkClassName} href="https://en.wikipedia.org/wiki/Typography">
            typography
          </preview-card-trigger>
          remain in the digital age.
        </p>
        <preview-card-portal>
          <preview-card-positioner .sideOffset=${8}>
            <preview-card-popup class=${popupClassName}>
              <preview-card-arrow class=${arrowClassName}>
                ${arrowSvg({
                  arrowFillClassName,
                  arrowInnerStrokeClassName,
                  arrowOuterStrokeClassName,
                })}
              </preview-card-arrow>
              ${renderCardContent({
                imageClassName,
                popupContentClassName,
                summaryClassName,
                payload: 'typography',
              })}
            </preview-card-popup>
          </preview-card-positioner>
        </preview-card-portal>
      </preview-card-root>`,
    [
      arrowClassName,
      arrowFillClassName,
      arrowInnerStrokeClassName,
      arrowOuterStrokeClassName,
      imageClassName,
      linkClassName,
      paragraphClassName,
      popupClassName,
      popupContentClassName,
      summaryClassName,
    ],
  );

  return <LitTemplateHost template={template} />;
}

export interface LitPreviewCardDetachedFullProps extends LitPreviewCardBaseProps {
  paragraphClassName: string;
  positionerClassName: string;
  viewportClassName: string;
}

export function LitPreviewCardDetachedFull(props: LitPreviewCardDetachedFullProps) {
  const {
    arrowClassName,
    arrowFillClassName,
    arrowInnerStrokeClassName,
    arrowOuterStrokeClassName,
    imageClassName,
    linkClassName,
    paragraphClassName,
    popupClassName,
    popupContentClassName,
    positionerClassName,
    summaryClassName,
  } = props;

  const template = React.useCallback(
    () =>
      html`<p class=${paragraphClassName}>
        Discover
        <preview-card-root>
          <preview-card-trigger class=${linkClassName} href="https://en.wikipedia.org/wiki/Typography">
            typography
          </preview-card-trigger>
          <preview-card-portal>
            <preview-card-positioner class=${positionerClassName} .sideOffset=${8}>
              <preview-card-popup class=${popupClassName}>
                <preview-card-arrow class=${arrowClassName}>
                  ${arrowSvg({
                    arrowFillClassName,
                    arrowInnerStrokeClassName,
                    arrowOuterStrokeClassName,
                  })}
                </preview-card-arrow>
                ${renderCardContent({
                  imageClassName,
                  popupContentClassName,
                  summaryClassName,
                  payload: 'typography',
                })}
              </preview-card-popup>
            </preview-card-positioner>
          </preview-card-portal>
        </preview-card-root>
        ,
        <preview-card-root>
          <preview-card-trigger class=${linkClassName} href="https://en.wikipedia.org/wiki/Design">
            design
          </preview-card-trigger>
          <preview-card-portal>
            <preview-card-positioner class=${positionerClassName} .sideOffset=${8}>
              <preview-card-popup class=${popupClassName}>
                <preview-card-arrow class=${arrowClassName}>
                  ${arrowSvg({
                    arrowFillClassName,
                    arrowInnerStrokeClassName,
                    arrowOuterStrokeClassName,
                  })}
                </preview-card-arrow>
                ${renderCardContent({
                  imageClassName,
                  popupContentClassName,
                  summaryClassName,
                  payload: 'design',
                })}
              </preview-card-popup>
            </preview-card-positioner>
          </preview-card-portal>
        </preview-card-root>
        , or
        <preview-card-root>
          <preview-card-trigger class=${linkClassName} href="https://en.wikipedia.org/wiki/Art">
            art
          </preview-card-trigger>
          <preview-card-portal>
            <preview-card-positioner class=${positionerClassName} .sideOffset=${8}>
              <preview-card-popup class=${popupClassName}>
                <preview-card-arrow class=${arrowClassName}>
                  ${arrowSvg({
                    arrowFillClassName,
                    arrowInnerStrokeClassName,
                    arrowOuterStrokeClassName,
                  })}
                </preview-card-arrow>
                ${renderCardContent({
                  imageClassName,
                  popupContentClassName,
                  summaryClassName,
                  payload: 'art',
                })}
              </preview-card-popup>
            </preview-card-positioner>
          </preview-card-portal>
        </preview-card-root>
        .
      </p>`,
    [
      arrowClassName,
      arrowFillClassName,
      arrowInnerStrokeClassName,
      arrowOuterStrokeClassName,
      imageClassName,
      linkClassName,
      paragraphClassName,
      popupClassName,
      popupContentClassName,
      positionerClassName,
      summaryClassName,
    ],
  );

  return <LitTemplateHost template={template} />;
}

export interface LitPreviewCardDetachedControlledProps extends LitPreviewCardBaseProps {
  buttonClassName: string;
  containerClassName: string;
  paragraphClassName: string;
  positionerClassName: string;
}

export function LitPreviewCardDetachedControlled(props: LitPreviewCardDetachedControlledProps) {
  const {
    arrowClassName,
    arrowFillClassName,
    arrowInnerStrokeClassName,
    arrowOuterStrokeClassName,
    containerClassName,
    imageClassName,
    linkClassName,
    paragraphClassName,
    popupClassName,
    popupContentClassName,
    positionerClassName,
    summaryClassName,
  } = props;

  const template = React.useCallback(
    () =>
      html`<div class=${containerClassName}>
        <p class=${paragraphClassName}>
          Discover
          <preview-card-root>
            <preview-card-trigger class=${linkClassName} href="https://en.wikipedia.org/wiki/Typography" id="trigger-1">
              typography
            </preview-card-trigger>
            <preview-card-portal>
              <preview-card-positioner class=${positionerClassName} .sideOffset=${8}>
                <preview-card-popup class=${popupClassName}>
                  <preview-card-arrow class=${arrowClassName}>
                    ${arrowSvg({
                      arrowFillClassName,
                      arrowInnerStrokeClassName,
                      arrowOuterStrokeClassName,
                    })}
                  </preview-card-arrow>
                  ${renderCardContent({
                    imageClassName,
                    popupContentClassName,
                    summaryClassName,
                    payload: 'typography',
                  })}
                </preview-card-popup>
              </preview-card-positioner>
            </preview-card-portal>
          </preview-card-root>
          ,
          <preview-card-root>
            <preview-card-trigger class=${linkClassName} href="https://en.wikipedia.org/wiki/Industrial_design" id="trigger-2">
              design
            </preview-card-trigger>
            <preview-card-portal>
              <preview-card-positioner class=${positionerClassName} .sideOffset=${8}>
                <preview-card-popup class=${popupClassName}>
                  <preview-card-arrow class=${arrowClassName}>
                    ${arrowSvg({
                      arrowFillClassName,
                      arrowInnerStrokeClassName,
                      arrowOuterStrokeClassName,
                    })}
                  </preview-card-arrow>
                  ${renderCardContent({
                    imageClassName,
                    popupContentClassName,
                    summaryClassName,
                    payload: 'design',
                  })}
                </preview-card-popup>
              </preview-card-positioner>
            </preview-card-portal>
          </preview-card-root>
          , or
          <preview-card-root>
            <preview-card-trigger class=${linkClassName} href="https://en.wikipedia.org/wiki/Art" id="trigger-3">
              art
            </preview-card-trigger>
            <preview-card-portal>
              <preview-card-positioner class=${positionerClassName} .sideOffset=${8}>
                <preview-card-popup class=${popupClassName}>
                  <preview-card-arrow class=${arrowClassName}>
                    ${arrowSvg({
                      arrowFillClassName,
                      arrowInnerStrokeClassName,
                      arrowOuterStrokeClassName,
                    })}
                  </preview-card-arrow>
                  ${renderCardContent({
                    imageClassName,
                    popupContentClassName,
                    summaryClassName,
                    payload: 'art',
                  })}
                </preview-card-popup>
              </preview-card-positioner>
            </preview-card-portal>
          </preview-card-root>
          .
        </p>
      </div>`,
    [
      arrowClassName,
      arrowFillClassName,
      arrowInnerStrokeClassName,
      arrowOuterStrokeClassName,
      containerClassName,
      imageClassName,
      linkClassName,
      paragraphClassName,
      popupClassName,
      popupContentClassName,
      positionerClassName,
      summaryClassName,
    ],
  );

  return <LitTemplateHost template={template} />;
}

type PreviewCardPayload = 'art' | 'design' | 'typography';

function renderCardContent(props: {
  imageClassName: string;
  popupContentClassName: string;
  payload: PreviewCardPayload;
  summaryClassName: string;
}) {
  const { imageClassName, popupContentClassName, payload, summaryClassName } = props;

  if (payload === 'design') {
    return html`<div class=${popupContentClassName}>
      <img
        width="250"
        height="249"
        class=${imageClassName}
        src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Braun_ABW30_%28schwarz%29.jpg/250px-Braun_ABW30_%28schwarz%29.jpg"
        alt="Braun ABW30"
      />
      <p class=${summaryClassName}>
        <strong>Design</strong> is the concept or proposal for an object, process, or system.
      </p>
    </div>`;
  }

  if (payload === 'art') {
    return html`<div class=${popupContentClassName}>
      <img
        width="250"
        height="290"
        class=${imageClassName}
        src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/MonaLisa_sfumato.jpeg/250px-MonaLisa_sfumato.jpeg"
        alt="Mona Lisa"
      />
      <p class=${summaryClassName}>
        <strong>Art</strong> is a diverse range of cultural activity centered around works using
        creative or imaginative talents.
      </p>
    </div>`;
  }

  return html`<div class=${popupContentClassName}>
    <img
      width="224"
      height="150"
      class=${imageClassName}
      src="https://images.unsplash.com/photo-1619615391095-dfa29e1672ef?q=80&w=448&h=300"
      alt="Station Hofplein signage in Rotterdam, Netherlands"
    />
    <p class=${summaryClassName}>
      <strong>Typography</strong> is the art and science of arranging type.
    </p>
  </div>`;
}

function arrowSvg(props: {
  arrowFillClassName?: string | undefined;
  arrowInnerStrokeClassName?: string | undefined;
  arrowOuterStrokeClassName?: string | undefined;
}) {
  const { arrowFillClassName, arrowInnerStrokeClassName, arrowOuterStrokeClassName } = props;

  return svg`<svg width="20" height="10" viewBox="0 0 20 10" fill="none">
    <path
      d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z"
      class=${arrowFillClassName ?? ''}
    />
    <path
      d="M8.99542 1.85876C9.75604 1.17425 10.9106 1.17422 11.6713 1.85878L16.5281 6.22989C17.0789 6.72568 17.7938 7.00001 18.5349 7.00001L15.89 7L11.0023 2.60207C10.622 2.2598 10.0447 2.2598 9.66436 2.60207L4.77734 7L2.13171 7.00001C2.87284 7.00001 3.58774 6.72568 4.13861 6.22989L8.99542 1.85876Z"
      class=${arrowOuterStrokeClassName ?? ''}
    />
    <path
      d="M10.3333 3.34539L5.47654 7.71648C4.55842 8.54279 3.36693 9 2.13172 9H0V8H2.13172C3.11989 8 4.07308 7.63423 4.80758 6.97318L9.66437 2.60207C10.0447 2.25979 10.622 2.2598 11.0023 2.60207L15.8591 6.97318C16.5936 7.63423 17.5468 8 18.5349 8H20V9H18.5349C17.2998 9 16.1083 8.54278 15.1901 7.71648L10.3333 3.34539Z"
      class=${arrowInnerStrokeClassName ?? ''}
    />
  </svg>`;
}
