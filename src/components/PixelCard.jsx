export default function PixelCard({ children, className = '', tone = 'panel', as: Tag = 'div', ...rest }) {
  const tones = {
    panel: 'bg-panel border-line',
    dark: 'bg-ink border-line',
    highlight: 'bg-panel-2 border-line',
    brand: 'bg-brand border-black text-black',
  };
  return (
    <Tag
      className={[
        'pixel-border pixel-shadow p-3 sm:p-4',
        tones[tone],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}
