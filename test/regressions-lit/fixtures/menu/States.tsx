import HeroDemo from 'docs/src/app/(docs)/lit/components/menu/demos/hero/css-modules';
import OpenOnHoverDemo from 'docs/src/app/(docs)/lit/components/menu/demos/open-on-hover/css-modules';

export default function MenuStates() {
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
        <span>Hero</span>
        <HeroDemo />
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        <span>Open On Hover</span>
        <OpenOnHoverDemo />
      </div>
    </div>
  );
}
