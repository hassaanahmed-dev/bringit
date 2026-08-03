import logoSrc from '/images/logo.png';
import { formatMoney } from '../lib/rank';
import { SHOP_COLORS, SHOP_ICONS } from '../lib/constants';

export default function Logo({ small = false }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <img
        src={logoSrc}
        alt="BringIt logo"
        className={`shrink-0 ${small ? 'w-8 h-8' : 'w-10 h-10'}`}
        style={{ imageRendering: 'pixelated' }}
      />
      <div>
        <div className={`font-pixel text-brand tracking-wide ${small ? 'text-sm' : 'text-lg'}`}>
          BRING<span className="text-cream">IT</span>
        </div>
        {!small && (
          <div className="font-crt text-fade leading-none mt-1">FAST ISB · CAMPUS FOOD DELIVERY</div>
        )}
      </div>
    </div>
  );
}

export function ShopChip({ name }) {
  const color = SHOP_COLORS[name] || '#9aa0b4';
  return (
    <span
      className="inline-flex items-center gap-1.5 font-pixel text-[10px] px-2 py-1 border-2"
      style={{ borderColor: color, color }}
    >
      <span
        className="w-2 h-2 inline-block"
        style={{ backgroundColor: color, boxShadow: '2px 2px 0 rgba(0,0,0,0.6)' }}
      />
      {name}
    </span>
  );
}

export function FeeTag({ fee }) {
  return (
    <span className="inline-flex items-center gap-1 font-pixel text-[10px] text-gold border-2 border-gold px-2 py-1">
      <span aria-hidden>Rs</span> {fee}
    </span>
  );
}

export function Money({ value }) {
  return <span>{formatMoney(value)}</span>;
}

export function ShopIcon({ name }) {
  const color = SHOP_COLORS[name] || '#9aa0b4';
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 font-pixel text-[10px] text-black border-2 border-black"
      style={{ backgroundColor: color }}
    >
      {SHOP_ICONS[name]}
    </span>
  );
}
