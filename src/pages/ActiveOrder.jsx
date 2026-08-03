import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import QuestTracker from '../components/QuestTracker';
import RankUpOverlay from '../components/RankUpOverlay';
import { ShopChip, FeeTag } from '../components/Logo';
import { orders } from '../lib/backend';
import { ORDER_STATUS } from '../lib/constants';
import { getRank } from '../lib/rank';
import { ROUTES } from '../lib/routes';

export default function ActiveOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [order, setOrder] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showRankUp, setShowRankUp] = useState(false);
  const [rankPrev, setRankPrev] = useState(null);
  const [rankNext, setRankNext] = useState(null);

  useEffect(() => {
    setLoadError(false);
    return orders.listenOrder(
      id,
      (o) => {
        setOrder(o);
        if (o) setLoadError(false);
        if (o && o.status === ORDER_STATUS.CANCELLED) {
          toast('Customer cancelled this order', 'error');
          setTimeout(() => navigate(ROUTES.RIDER_FEED, { replace: true }), 1500);
        }
      },
      () => setLoadError(true),
    );
  }, [id, navigate, toast]);

  if (loadError && !order) {
    return (
      <PixelCard>
        <div className="font-pixel text-[11px] text-danger mb-2">UNABLE TO LOAD DELIVERY</div>
        <p className="font-crt text-fade text-lg mb-4">
          This delivery doesn't exist or you can't view it.
        </p>
        <PixelButton variant="sky" block onClick={() => navigate(ROUTES.RIDER_FEED)}>
          Back to Feed
        </PixelButton>
      </PixelCard>
    );
  }

  if (!order) return <div className="font-pixel text-[10px] text-fade py-10 text-center">SYNCING DELIVERY...</div>;

  const isRider = order.riderId === user.uid;
  if (!isRider || order.status === ORDER_STATUS.CANCELLED) {
    return (
      <PixelCard>
        <div className="font-pixel text-[11px] text-danger mb-2">MISSION OVER</div>
        <p className="font-crt text-fade text-lg mb-4">This order is no longer active for you.</p>
        <PixelButton variant="sky" block onClick={() => navigate(ROUTES.RIDER_FEED)}>
          Back to Feed
        </PixelButton>
      </PixelCard>
    );
  }

  const doPaid = async () => {
    setBusy(true);
    const res = await orders.markPaid(order.id);
    setBusy(false);
    if (res.ok) toast('Marked paid at shop', 'success');
    else toast('Could not update order', 'error');
  };

  const doDeliver = async () => {
    setBusy(true);
    const res = await orders.deliver(order.id);
    setBusy(false);
    if (!res.ok) {
      toast(res.message || 'Could not deliver', 'error');
      return;
    }
    toast(`Delivered! Rs ${order.deliveryFee} earned`, 'success');

    const prevRiderCount = order.riderOrderCount ?? 0;
    const nextRiderCount = prevRiderCount + 1;
    const prevRank = getRank(prevRiderCount);
    const nextRank = getRank(nextRiderCount);
    if (prevRank.name !== nextRank.name) {
      setRankPrev(prevRank);
      setRankNext(nextRank);
      setShowRankUp(true);
    }
  };

  const doRiderCancel = async () => {
    await orders.cancelByRider(order.id);
    toast('Delivery cancelled. Order back in the pool.', 'info');
    navigate(ROUTES.RIDER_FEED);
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div>
        <h1 className="font-pixel text-[13px] text-cream">ACTIVE DELIVERY</h1>
        <div className="font-pixel text-[9px] text-fade mt-1">#{order.id.slice(0, 6).toUpperCase()}</div>
      </div>

      <QuestTracker status={order.status} />

      <PixelCard tone="dark" className="border-gold">
        <div className="font-pixel text-[10px] text-gold mb-2">CUSTOMER</div>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="font-pixel text-[11px] sm:text-[12px] text-cream">{order.customerName.toUpperCase()}</span>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => navigate(ROUTES.CHAT(order.id))}
              className="font-pixel text-[10px] text-leaf border-2 border-leaf px-2 py-1.5 cursor-pointer"
            >
              CHAT ▸
            </button>
            <a
              href={`tel:${order.customerPhone}`}
              className="font-pixel text-[10px] text-sky border-2 border-sky px-2 py-1.5 cursor-pointer"
            >
              CALL ▸ {order.customerPhone}
            </a>
          </div>
        </div>
      </PixelCard>

      <PixelCard>
        <p className="font-crt text-2xl text-cream leading-snug mb-4 break-words">{order.description}</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {order.shops.map((s) => (
            <ShopChip key={s} name={s} />
          ))}
        </div>
        <div className="border-t-2 border-line pt-3 mb-3">
          <div className="font-pixel text-[9px] text-gold mb-1">DROP LOCATION</div>
          <div className="font-crt text-2xl text-cream">{order.deliveryNote || '— no spot given —'}</div>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-pixel text-[10px] text-fade">
            ZONE <span className="text-cream">{order.zoneName.toUpperCase()}</span>
          </span>
          <FeeTag fee={order.deliveryFee} />
        </div>
      </PixelCard>

      <div className="flex flex-col gap-2">
        {order.status === ORDER_STATUS.ACCEPTED && (
          <PixelButton block variant="gold" onClick={doPaid} disabled={busy}>
            Mark Paid at Shop
          </PixelButton>
        )}
        {order.status === ORDER_STATUS.PAID_AT_SHOP && (
          <PixelButton block variant="leaf" onClick={doDeliver} disabled={busy}>
            Mark Delivered
          </PixelButton>
        )}
        {order.status === ORDER_STATUS.ACCEPTED && (
          <PixelButton block variant="ghost" onClick={doRiderCancel}>
            Cancel Delivery
          </PixelButton>
        )}
      </div>

      <RankUpOverlay
        show={showRankUp}
        prevTier={rankPrev}
        newTier={rankNext}
        onDone={() => setShowRankUp(false)}
      />
    </div>
  );
}
