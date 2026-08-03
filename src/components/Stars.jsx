import { useState, useEffect } from 'react';

export function Stars({ value, onChange, max = 5, size = 'lg' }) {
  const [hover, setHover] = useState(null);
  const active = hover ?? value ?? 0;
  const px = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-lg' : 'text-xl';
  return (
    <div className="flex gap-2" role={onChange ? 'radiogroup' : 'img'}>
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        const filled = n <= active;
        const Star = (
          <span
            key={n}
            className={`${px} ${filled ? 'text-gold stars-glow' : 'text-fade/40'} ${
              onChange ? 'cursor-pointer select-none' : ''
            }`}
            onClick={() => onChange?.(n)}
            onMouseEnter={() => onChange && setHover(n)}
            onMouseLeave={() => onChange && setHover(null)}
            aria-label={onChange ? `Rate ${n} of ${max}` : undefined}
          >
            {filled ? '★' : '☆'}
          </span>
        );
        return Star;
      })}
    </div>
  );
}

export function RatingSummary({ avg, count }) {
  if (!count) return <span className="font-pixel text-[10px] text-fade">NO RATINGS YET</span>;
  return (
    <span className="inline-flex items-center gap-1.5 font-pixel text-[10px] text-cream">
      <span className="text-gold">★</span> {avg.toFixed(1)}
      <span className="text-fade">({count})</span>
    </span>
  );
}
