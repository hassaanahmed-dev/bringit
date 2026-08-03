import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import PixelBadge from '../components/PixelBadge';
import { ShopChip, FeeTag } from '../components/Logo';
import { orders } from '../lib/backend';
import { ORDER_STATUS, PAGE_SIZE } from '../lib/constants';
import { formatTime } from '../lib/rank';
import { ROUTES } from '../lib/routes';

const STATUS_STYLE = {
  'Open': 'text-gold border-gold',
  'Accepted': 'text-sky border-sky',
  'Paid at Shop': 'text-royal border-royal',
  'Delivered': 'text-leaf border-leaf',
  'Cancelled': 'text-danger border-danger',
};

export default function OrderHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [state, setState] = useState({ orders: [], hasMore: false });

  useEffect(() => {
    let active = true;
    orders.getCustomerOrders(user.uid, { page, pageSize: PAGE_SIZE }).then((res) => {
      if (active) setState(res);
    });
    return () => { active = false; };
  }, [user.uid, page]);

  const { orders: list, hasMore } = state;

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div>
        <h1 className="font-pixel text-[13px] text-cream">ORDER LOG</h1>
        <p className="font-crt text-fade text-lg">Every quest you've sent to the feed.</p>
      </div>

      {list.length === 0 && (
        <PixelCard>
          <p className="font-crt text-fade text-xl text-center py-4">No orders yet. Get the party started!</p>
          <PixelButton block variant="sky" onClick={() => navigate(ROUTES.NEW_ORDER)}>
            Place First Order
          </PixelButton>
        </PixelCard>
      )}

      <div className="flex flex-col gap-3">
        {list.map((o) => (
          <button
            key={o.id}
            onClick={() => navigate(ROUTES.ORDER(o.id))}
            className="text-left cursor-pointer"
          >
            <PixelCard className="hover:border-sky transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <span
                  className={`font-pixel text-[9px] border-2 px-1.5 py-0.5 ${
                    STATUS_STYLE[o.status] || STATUS_STYLE['Open']
                  }`}
                >
                  {o.status.toUpperCase()}
                </span>
                <span className="font-pixel text-[8px] text-fade">{formatTime(o.createdAt)}</span>
              </div>
              <p className="font-crt text-lg text-cream leading-snug line-clamp-2 mb-2">{o.description}</p>
              <div className="flex flex-wrap gap-1.5 items-center">
                {o.shops.map((s) => (
                  <ShopChip key={s} name={s} />
                ))}
                <FeeTag fee={o.deliveryFee} />
                <PixelBadge orderCount={o.customerOrderCount} label="AT" />
              </div>
            </PixelCard>
          </button>
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
