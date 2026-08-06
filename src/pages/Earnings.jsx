import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import PixelBadge from '../components/PixelBadge';
import Spinner from '../components/Spinner';
import { ShopChip } from '../components/Logo';
import { orders } from '../lib/backend';
import { PAGE_SIZE } from '../lib/constants';
import { formatTime } from '../lib/rank';
import { ROUTES } from '../lib/routes';

export default function Earnings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [state, setState] = useState({
    orders: [], total: 0, paidTotal: 0, collectedTotal: 0, hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    orders
      .getRiderEarnings(user.uid, { page, pageSize: PAGE_SIZE })
      .then((res) => {
        if (active) {
          setState((prev) => ({
            ...res,
            orders: page === 0 ? res.orders : [...prev.orders, ...res.orders],
          }));
          setError(false);
        }
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [user.uid, page, reload]);

  const { orders: list, total, paidTotal, collectedTotal, hasMore } = state;
  const discrepancy = (collectedTotal || 0) - ((paidTotal || 0) + total);

  if (loading && list.length === 0) return <Spinner label="TALLYING EARNINGS..." />;

  if (error && list.length === 0) {
    return (
      <PixelCard>
        <div className="font-pixel text-[11px] text-danger mb-2">COULD NOT LOAD EARNINGS</div>
        <p className="font-crt text-fade text-lg mb-4">
          Check your connection and try again.
        </p>
        <PixelButton variant="sky" block onClick={() => setReload((r) => r + 1)}>
          Retry
        </PixelButton>
      </PixelCard>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div>
        <h1 className="font-pixel text-[13px] text-cream">EARNINGS</h1>
        <p className="font-crt text-fade text-lg">Your delivered quests, in rupees.</p>
      </div>

      <PixelCard tone="highlight">
        <div className="font-pixel text-[9px] text-fade mb-2">SHIFT SETTLEMENT</div>
        <div className="flex flex-col gap-1.5 font-crt text-lg">
          <div className="flex justify-between">
            <span className="text-fade">PAID TO SHOPS</span>
            <span className="text-cream">Rs {(paidTotal || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fade">COLLECTED FROM CUSTOMERS</span>
            <span className="text-cream">Rs {(collectedTotal || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-fade">FEES EARNED</span>
            <span className="text-gold">Rs {total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between border-t-2 border-line pt-1.5 mt-1">
            <span className="text-fade">DISCREPANCY</span>
            <span
              className={`font-pixel text-[10px] ${
                discrepancy === 0 ? 'text-leaf' : 'text-danger'
              }`}
            >
              {discrepancy === 0 ? '✓ BALANCED' : `Rs ${discrepancy.toLocaleString()}`}
            </span>
          </div>
          <p className="font-crt text-base text-fade mt-1">
            Collected should equal paid + fees. Any difference is what's missing or extra.
          </p>
        </div>
      </PixelCard>

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
