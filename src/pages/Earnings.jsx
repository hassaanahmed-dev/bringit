import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import PixelBadge from '../components/PixelBadge';
import { ShopChip } from '../components/Logo';
import { orders } from '../lib/backend';
import { PAGE_SIZE } from '../lib/constants';
import { formatTime } from '../lib/rank';
import { ROUTES } from '../lib/routes';

export default function Earnings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [state, setState] = useState({ orders: [], total: 0, hasMore: false });

  useEffect(() => {
    let active = true;
    orders.getRiderEarnings(user.uid, { page, pageSize: PAGE_SIZE }).then((res) => {
      if (active) setState(res);
    });
    return () => { active = false; };
  }, [user.uid, page]);

  const { orders: list, total, hasMore } = state;

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div>
        <h1 className="font-pixel text-[13px] text-cream">EARNINGS</h1>
        <p className="font-crt text-fade text-lg">Your delivered quests, in rupees.</p>
      </div>

      <PixelCard tone="highlight">
        <div className="font-pixel text-[9px] text-fade mb-2">TOTAL EARNED</div>
        <div className="font-pixel text-[22px] text-gold">Rs {total.toLocaleString()}</div>
        <div className="font-pixel text-[9px] text-fade mt-1">
          {list.length > 0 ? `RIDER RANK: ` : ''}
        </div>
        <div className="mt-2">
          <PixelBadge orderCount={user.riderOrderCount} label="RIDER" />
        </div>
      </PixelCard>

      {list.length === 0 && (
        <PixelCard>
          <p className="font-crt text-fade text-xl text-center py-4">
            Nothing earned yet. Grab an order from the feed!
          </p>
          <PixelButton block variant="sky" onClick={() => navigate(ROUTES.RIDER_FEED)}>
            Open the Feed
          </PixelButton>
        </PixelCard>
      )}

      <div className="flex flex-col gap-3">
        {list.map((o) => (
          <PixelCard key={o.id} className="!p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex gap-1.5 flex-wrap">
                {o.shops.map((s) => (
                  <ShopChip key={s} name={s} />
                ))}
              </div>
              <span className="font-pixel text-[9px] text-leaf">+Rs {o.deliveryFee}</span>
            </div>
            <p className="font-crt text-lg text-cream leading-snug line-clamp-1 mb-1">{o.description}</p>
            <div className="flex justify-between font-pixel text-[8px] text-fade">
              <span>ZONE {o.zoneName.toUpperCase()}</span>
              <span>{formatTime(o.updatedAt)}</span>
            </div>
          </PixelCard>
        ))}
      </div>

      {hasMore && (
        <PixelButton block variant="ghost" onClick={() => setPage((p) => p + 1)}>
          Load More
        </PixelButton>
      )}
    </div>
  );
}
