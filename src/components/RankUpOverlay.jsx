import { useEffect, useRef, useState } from 'react';
import { getRank } from '../lib/rank';

export default function RankUpOverlay({ show, prevTier, newTier, onDone }) {
  const [visible, setVisible] = useState(false);
  // Callers pass a fresh inline arrow (e.g. onDone={() => setShowRankUp(false)}),
  // so keep the latest callback in a ref and only depend on `show`. Otherwise a
  // parent re-render (like the delivered-screen countdown ticking every second)
  // restarts the timer forever and the overlay never dismisses.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!show) return undefined;
    setVisible(true);
    const timers = [];
    const t = setTimeout(() => {
      setVisible(false);
      timers.push(setTimeout(() => onDoneRef.current?.(), 400));
    }, 2600);
    timers.push(t);
    return () => timers.forEach((id) => clearTimeout(id));
  }, [show]);

  // Safety net: Escape dismisses so a player can never get stuck behind the
  // overlay even if the auto-timer is interrupted.
  useEffect(() => {
    if (!show) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setVisible(false);
        onDoneRef.current?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show]);

  if (!show || !visible) return null;

  const prev = prevTier ?? { name: '—', color: '#9aa0b4' };
  const next = newTier;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4">
      <div className="text-center step-in max-w-xs w-full">
        <div className="font-pixel text-leaf text-xl mb-6 float-bob">LEVEL UP!</div>
        <div className="flex items-center justify-center gap-4 mb-6">
          <span
            className="w-16 h-16 flex items-center justify-center font-pixel text-[10px] text-black border-4 border-black"
            style={{ backgroundColor: prev.color }}
          >
            {prev.name.toUpperCase()}
          </span>
          <span className="font-pixel text-2xl text-cream">→</span>
          <span
            className="w-20 h-20 flex items-center justify-center font-pixel text-[11px] text-black border-4 border-black animate-pulse"
            style={{ backgroundColor: next.color, boxShadow: `0 0 24px ${next.color}` }}
          >
            {next.name.toUpperCase()}
          </span>
        </div>
        <div className="font-crt text-cream text-xl mb-6">You advanced a rank. Keep it up!</div>
        <div className="flex justify-center gap-4">
          <span className="font-pixel text-2xl text-gold">★</span>
          <span className="font-pixel text-2xl text-sky">★</span>
          <span className="font-pixel text-2xl text-leaf">★</span>
          <span className="font-pixel text-2xl text-royal">★</span>
          <span className="font-pixel text-2xl text-gold">★</span>
        </div>
      </div>
    </div>
  );
}
