import * as React from 'react';
import { html, svg } from 'lit';
import { PreviewCard } from '@base-ui/lit/preview-card';
import { LitTemplateHost } from '../../../../docs/src/app/(docs)/lit/components/popover/demos/shared/LitTemplateHost';
import previewCardStyles from '../../../../docs/src/app/(docs)/react/components/preview-card/demos/index.module.css';

type PreviewCardPayload = 'design' | 'typography';

export default function PreviewCardStates() {
  const openHandle = React.useMemo(() => PreviewCard.createHandle<PreviewCardPayload>(), []);

  const closedTemplate = React.useCallback(
    () =>
      PreviewCard.Root({
        children: [
          html`<p class=${previewCardStyles.Paragraph}>
            The principles of good
            ${PreviewCard.Trigger({
              className: previewCardStyles.Link,
              href: 'https://en.wikipedia.org/wiki/Typography',
              children: 'typography',
            })}
            remain in the digital age.
          </p>`,
          PreviewCard.Portal({
            children: PreviewCard.Positioner({
              sideOffset: 8,
              children: PreviewCard.Popup({
                className: previewCardStyles.Popup,
                children: [
                  PreviewCard.Arrow({
                    className: previewCardStyles.Arrow,
                    children: arrowSvg(),
                  }),
                  renderCardContent('typography'),
                ],
              }),
            }),
          }),
        ],
      }),
    [],
  );

  const openTemplate = React.useCallback(
    () =>
      html`${PreviewCard.Trigger({
          handle: openHandle,
          id: 'typography',
          className: previewCardStyles.Link,
          href: 'https://en.wikipedia.org/wiki/Typography',
          payload: 'typography',
          children: 'typography',
        })}
        ${PreviewCard.Trigger({
          handle: openHandle,
          id: 'design',
          className: previewCardStyles.Link,
          href: 'https://en.wikipedia.org/wiki/Design',
          payload: 'design',
          children: 'design',
        })}
        ${PreviewCard.Root<PreviewCardPayload>({
          handle: openHandle,
          defaultOpen: true,
          defaultTriggerId: 'design',
          children: ({ payload }) =>
            PreviewCard.Portal({
              children: PreviewCard.Positioner({
                sideOffset: 8,
                children: PreviewCard.Popup({
                  className: previewCardStyles.Popup,
                  children: [
                    PreviewCard.Arrow({
                      className: previewCardStyles.Arrow,
                      children: arrowSvg(),
                    }),
                    renderCardContent(payload ?? 'design'),
                  ],
                }),
              }),
            }),
        })}`,
    [openHandle],
  );

  return (
    <div
      data-testid="screenshot-target"
      style={{
        display: 'grid',
        gap: '24px',
        justifyItems: 'start',
      }}
    >
      <div style={{ display: 'grid', gap: '12px' }}>
        <span>Closed</span>
        <LitTemplateHost template={closedTemplate} />
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        <span>Open</span>
        <LitTemplateHost template={openTemplate} />
      </div>
    </div>
  );
}

function renderCardContent(payload: PreviewCardPayload) {
  if (payload === 'design') {
    return html`<div class=${previewCardStyles.PopupContent}>
      <img
        width="250"
        height="249"
        class=${previewCardStyles.Image}
        src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Braun_ABW30_%28schwarz%29.jpg/250px-Braun_ABW30_%28schwarz%29.jpg"
        alt="Braun ABW30"
      />
      <p class=${previewCardStyles.Summary}>
        <strong>Design</strong> is the concept or proposal for an object, process, or system.
      </p>
    </div>`;
  }

  return html`<div class=${previewCardStyles.PopupContent}>
    <img
      width="224"
      height="150"
      class=${previewCardStyles.Image}
      src="https://images.unsplash.com/photo-1619615391095-dfa29e1672ef?q=80&w=448&h=300"
      alt="Station Hofplein signage in Rotterdam, Netherlands"
    />
    <p class=${previewCardStyles.Summary}>
      <strong>Typography</strong> is the art and science of arranging type.
    </p>
  </div>`;
}

function arrowSvg() {
  return svg`<svg width="20" height="10" viewBox="0 0 20 10" fill="none">
    <path
      d="M9.66437 2.60207L4.80758 6.97318C4.07308 7.63423 3.11989 8 2.13172 8H0V10H20V8H18.5349C17.5468 8 16.5936 7.63423 15.8591 6.97318L11.0023 2.60207C10.622 2.2598 10.0447 2.25979 9.66437 2.60207Z"
      class=${previewCardStyles.ArrowFill}
    />
    <path
      d="M8.99542 1.85876C9.75604 1.17425 10.9106 1.17422 11.6713 1.85878L16.5281 6.22989C17.0789 6.72568 17.7938 7.00001 18.5349 7.00001L15.89 7L11.0023 2.60207C10.622 2.2598 10.0447 2.2598 9.66436 2.60207L4.77734 7L2.13171 7.00001C2.87284 7.00001 3.58774 6.72568 4.13861 6.22989L8.99542 1.85876Z"
      class=${previewCardStyles.ArrowOuterStroke}
    />
    <path
      d="M10.3333 3.34539L5.47654 7.71648C4.55842 8.54279 3.36693 9 2.13172 9H0V8H2.13172C3.11989 8 4.07308 7.63423 4.80758 6.97318L9.66437 2.60207C10.0447 2.25979 10.622 2.2598 11.0023 2.60207L15.8591 6.97318C16.5936 7.63423 17.5468 8 18.5349 8H20V9H18.5349C17.2998 9 16.1083 8.54278 15.1901 7.71648L10.3333 3.34539Z"
      class=${previewCardStyles.ArrowInnerStroke}
    />
  </svg>`;
}
