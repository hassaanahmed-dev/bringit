import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PixelCard from '../components/PixelCard';
import PixelBadge from '../components/PixelBadge';
import { ShopChip, FeeTag } from '../components/Logo';
import { orders } from '../lib/backend';
import { PICKUP_SHOPS } from '../lib/constants';
import { formatTime } from '../lib/rank';
import { ROUTES } from '../lib/routes';

export default function RiderFeed() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [openOrders, setOpenOrders] = useState([]);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    return orders.listenOpenOrders(setOpenOrders);
  }, []);

  const shown = openOrders
    .filter((o) => o.customerId !== user.uid)
    .filter((o) => filter === 'All' || o.shops.includes(filter));

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div>
        <h1 className="font-pixel text-[13px] text-cream">OPEN FEED</h1>
        <p className="font-crt text-fade text-lg">
          Orders waiting for a rider · <span className="text-leaf">{openOrders.length} in the pool</span>
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

      {shown.length === 0 && (
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
                <span className="font-pixel text-[8px] text-fade">{formatTime(o.createdAt)}</span>
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
