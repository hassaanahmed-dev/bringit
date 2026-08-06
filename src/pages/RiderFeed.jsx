import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PixelCard from '../components/PixelCard';
import PixelBadge from '../components/PixelBadge';
import { ShopChip, FeeTag } from '../components/Logo';
import { orders } from '../lib/backend';
import { PICKUP_SHOPS } from '../lib/constants';
import { formatTime } from '../lib/rank';
import { playPing } from '../lib/sounds';
import { ROUTES } from '../lib/routes';

function fmtCountdown(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function RiderFeed() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openOrders, setOpenOrders] = useState([]);
  const [filter, setFilter] = useState('All');
  const [feedError, setFeedError] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const knownIds = useRef(new Set());
  const firstLoad = useRef(true);
  const expiredTried = useRef(new Set());

  useEffect(() => {
    setFeedError(false);
    return orders.listenOpenOrders(setOpenOrders, () => setFeedError(true));
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    for (const o of openOrders) {
      if (o.expiresAt && o.expiresAt < Date.now() && !expiredTried.current.has(o.id)) {
        expiredTried.current.add(o.id);
        orders.expireOrder(o.id);
      }
    }
  }, [openOrders]);

  useEffect(() => {
    const ids = new Set(openOrders.map((o) => o.id));
    if (!firstLoad.current) {
      for (const id of ids) {
        if (!knownIds.current.has(id)) {
          playPing();
          break;
        }
      }
    }
    firstLoad.current = false;
    knownIds.current = ids;
  }, [openOrders]);

  const liveCount = openOrders.filter((o) => !o.expiresAt || o.expiresAt > nowTick).length;

  const shown = openOrders
    .filter((o) => o.customerId !== user.uid)
    .filter((o) => !o.expiresAt || o.expiresAt > nowTick)
    .filter((o) => filter === 'All' || o.shops.includes(filter));

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div>
        <h1 className="font-pixel text-[13px] text-cream">OPEN FEED</h1>
        <p className="font-crt text-fade text-lg">
          Orders waiting for a rider · <span className="text-leaf">{liveCount} in the pool</span>
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {['All', ...PICKUP_SHOPS].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              'shrink-0 font-pixel text-[9px] px-3 py-2 border-2 cursor-pointer',
              filter === f
                ? 'bg-brand text-black border-black'
                : 'bg-panel-2 text-fade border-line hover:border-cream',
            ].join(' ')}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {feedError && (
        <PixelCard tone="dark" className="border-danger">
          <div className="text-center py-6">
            <div className="font-pixel text-[11px] text-danger mb-2">FEED CONNECTION ERROR</div>
            <p className="font-crt text-fade text-xl">The feed lost its connection. Pull up and reload to reconnect.</p>
          </div>
        </PixelCard>
      )}

      {shown.length === 0 && !feedError && (
        <PixelCard tone="dark">
          <div className="text-center py-6">
            <div className="font-pixel text-3xl text-fade mb-3">_</div>
            <p className="font-crt text-fade text-xl">No open orders right now. Check back soon.</p>
          </div>
        </PixelCard>
      )}

      <div className="flex flex-col gap-3">
        {shown.map((o) => (
          <button
            key={o.id}
            onClick={() => navigate(ROUTES.RIDER_ORDER(o.id))}
            className="text-left cursor-pointer"
          >
            <PixelCard className="hover:border-brand transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <PixelBadge orderCount={o.customerOrderCount} />
                <div className="flex flex-col items-end gap-1">
                  {o.expiresAt && (
                    <span
                      className={`font-pixel text-[8px] ${
                        o.expiresAt - nowTick <= 30000 ? 'text-danger blink' : 'text-gold'
                      }`}
                    >
                      EXPIRES {fmtCountdown(o.expiresAt - nowTick)}
                    </span>
                  )}
                  <span className="font-pixel text-[8px] text-fade">{formatTime(o.createdAt)}</span>
                </div>
              </div>
              <p className="font-crt text-xl text-cream leading-snug line-clamp-2 mb-3">{o.description}</p>
              <div className="flex flex-wrap gap-1.5 items-center">
                {o.shops.map((s) => (
                  <ShopChip key={s} name={s} />
                ))}
                <span className="font-pixel text-[9px] text-fade">ZONE {o.zoneName.toUpperCase()}</span>
                <FeeTag fee={o.deliveryFee} />
              </div>
              <div className="mt-2 font-pixel text-[8px] text-gold">
                ▸ DROP: {o.deliveryNote || '—'}
              </div>
            </PixelCard>
          </button>
        ))}
      </div>
    </div>
  );
}
