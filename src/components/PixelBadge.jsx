import { getRank } from '../lib/rank';

const TIER_STYLES = {
  Newcomer: { bg: '#2a2c38', fg: '#9aa0b4' },
  Regular: { bg: '#123a28', fg: '#3ddc84' },
  Trusted: { bg: '#103049', fg: '#38b6ff' },
  Pro: { bg: '#2b1540', fg: '#b06cff' },
  Legend: { bg: '#3a2c08', fg: '#ffc857' },
};

export default function PixelBadge({ orderCount, label = 'RANK' }) {
  const tier = getRank(orderCount);
  const { bg, fg } = TIER_STYLES[tier.name];
  return (
    <span
      title={`${tier.name} · ${orderCount} completed order${orderCount === 1 ? '' : 's'}`}
      className="inline-flex items-center gap-1.5 font-pixel text-[9px] px-2 py-1 border-2 select-none"
      style={{ backgroundColor: bg, borderColor: fg, color: fg }}
    >
      <span
        className="w-2 h-2 inline-block"
        style={{ backgroundColor: fg, boxShadow: '2px 2px 0 rgba(0,0,0,0.5)' }}
      />
      {label}·{tier.name.toUpperCase()}
    </span>
  );
}
