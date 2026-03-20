import HeroDemo from 'docs/src/app/(docs)/lit/components/menubar/demos/hero/css-modules';

export default function MenubarStates() {
  return (
    <div
      data-testid="screenshot-target"
      style={{
        display: 'grid',
        gap: '12px',
        justifyItems: 'start',
      }}
    >
      <span>Hero</span>
      <HeroDemo />
    </div>
  );
}
