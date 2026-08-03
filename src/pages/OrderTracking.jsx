import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import PixelModal from '../components/PixelModal';
import QuestTracker from '../components/QuestTracker';
import { Stars } from '../components/Stars';
import RankUpOverlay from '../components/RankUpOverlay';
import { ShopChip, FeeTag } from '../components/Logo';
import { orders } from '../lib/backend';
import { ORDER_STATUS } from '../lib/constants';
import { getRank } from '../lib/rank';
import { ROUTES } from '../lib/routes';

export default function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [order, setOrder] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingDone, setRatingDone] = useState(false);
  const [showRankUp, setShowRankUp] = useState(false);
  const [rankPrev, setRankPrev] = useState(null);
  const [rankNext, setRankNext] = useState(null);

  useEffect(() => {
    return orders.listenOrder(id, setOrder);
  }, [id]);

  useEffect(() => {
    if (!order) return;
    if (order.status === ORDER_STATUS.DELIVERED && order.customerId === user.uid) {
      const prevCount = order.customerOrderCount ?? 0;
      const nextCount = prevCount + 1;
      const prevRank = getRank(prevCount);
      const nextRank = getRank(nextCount);
      if (prevRank.name !== nextRank.name) {
        setRankPrev(prevRank);
        setRankNext(nextRank);
        setShowRankUp(true);
      }
    }
  }, [order?.status, user.uid]);

  if (!order) return <div className="font-pixel text-[10px] text-fade py-10 text-center">LOCATING ORDER...</div>;

  if (order.customerId !== user.uid) {
    return (
      <PixelCard>
        <div className="font-pixel text-[11px] text-danger">ACCESS DENIED</div>
        <p className="font-crt text-fade text-lg">This isn't your quest.</p>
      </PixelCard>
    );
  }

  const canCancel = order.status === ORDER_STATUS.OPEN || order.status === ORDER_STATUS.ACCEPTED;
  const isDelivered = order.status === ORDER_STATUS.DELIVERED;
  const showRating = isDelivered && !order.rated && !ratingDone;

  const doCancel = async () => {
    await orders.cancelByCustomer(order.id);
    setConfirmCancel(false);
    toast('Order cancelled', 'info');
  };

  const submitRating = async (score) => {
    if (!order.riderId) return;
    const res = await orders.rateOrder(order.id, score);
    if (res.ok) {
      setRatingDone(true);
      toast('Rider rated. Thanks!', 'success');
    } else {
      toast('Could not rate this order', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-pixel text-[13px] text-cream">TRACK ORDER</h1>
          <div className="font-pixel text-[9px] text-fade mt-1">#{order.id.slice(0, 6).toUpperCase()}</div>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="font-pixel text-[10px] text-fade border-2 border-line px-2 py-1.5 hover:border-cream cursor-pointer"
        >
          ← BACK
        </button>
      </div>

      <QuestTracker status={order.status} />

      {order.status === ORDER_STATUS.CANCELLED && (
        <PixelCard tone="dark" className="border-danger">
          <div className="font-pixel text-[11px] text-danger mb-2">ORDER CANCELLED</div>
          <p className="font-crt text-fade text-lg mb-4">
            Your rider was notified and this order returned to the pool. No rank progress was
            awarded for this order.
          </p>
          <PixelButton variant="sky" block onClick={() => navigate(ROUTES.NEW_ORDER)}>
            Place a New Order
          </PixelButton>
        </PixelCard>
      )}

      {isDelivered && (
        <PixelCard tone="dark" className="border-leaf">
          <div className="font-pixel text-[12px] text-leaf mb-1">DELIVERED!</div>
          <p className="font-crt text-cream text-xl mb-3">
            Quest complete. Did your rider earn a good review?
          </p>
          {showRating ? (
            <div className="flex flex-col gap-3">
              <div className="font-pixel text-[9px] text-fade">TAP STARS TO RATE</div>
              <Stars value={rating} onChange={(n) => setRating(n)} />
              <div className="flex gap-2">
                <PixelButton
                  variant="gold"
                  block
                  disabled={!rating}
                  onClick={() => rating && submitRating(rating)}
                >
                  {rating ? `Rate ★ ${rating}` : 'Pick a Score'}
                </PixelButton>
                <PixelButton variant="ghost" block onClick={() => setRatingDone(true)}>
                  Skip
                </PixelButton>
              </div>
            </div>
          ) : (
            <PixelButton variant="leaf" block onClick={() => navigate(ROUTES.NEW_ORDER)}>
              Order Again
            </PixelButton>
          )}
        </PixelCard>
      )}

      <PixelCard>
        <div className="font-pixel text-[10px] text-sky mb-2">MISSION DETAILS</div>
        <p className="font-crt text-xl text-cream leading-snug mb-4 break-words">{order.description}</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {order.shops.map((s) => (
            <ShopChip key={s} name={s} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 font-pixel text-[10px]">
          <span className="text-fade">ZONE: <span className="text-cream">{order.zoneName.toUpperCase()}</span></span>
          <FeeTag fee={order.deliveryFee} />
        </div>
        <div className="mt-3 border-t-2 border-line pt-3">
          <div className="font-pixel text-[9px] text-gold mb-1">DROP LOCATION</div>
          <div className="font-crt text-xl text-cream">{order.deliveryNote || '— no spot given —'}</div>
        </div>
      </PixelCard>

      {order.status === ORDER_STATUS.ACCEPTED && order.riderName && (
        <PixelCard tone="highlight">
          <div className="font-pixel text-[10px] text-gold mb-2">YOUR RIDER</div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-pixel text-[12px] text-cream">{order.riderName.toUpperCase()}</span>
            <div className="flex gap-2">
              <button
                onClick={() => navigate(ROUTES.CHAT(order.id))}
                className="font-pixel text-[10px] text-leaf border-2 border-leaf px-2 py-1.5 cursor-pointer"
              >
                CHAT ▸
              </button>
              <a
                href={`tel:${order.riderPhone}`}
                className="font-pixel text-[10px] text-sky border-2 border-sky px-2 py-1.5 cursor-pointer"
              >
                CALL ▸ {order.riderPhone}
              </a>
            </div>
          </div>
        </PixelCard>
      )}

      {canCancel && (
        <PixelButton
          block
          variant="danger"
          onClick={() => setConfirmCancel(true)}
        >
          Cancel this order
        </PixelButton>
      )}

      <PixelModal
        open={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        title="CANCEL ORDER?"
        footer={
          <div className="flex gap-2">
            <PixelButton block variant="ghost" onClick={() => setConfirmCancel(false)}>
              Keep it
            </PixelButton>
            <PixelButton block variant="danger" onClick={doCancel}>
              Yes, cancel
            </PixelButton>
          </div>
        }
      >
        <p className="font-crt text-lg text-cream leading-snug">
          Cancel this order? Your rider will be notified and the order will return to the pool. No
          rank progress will be awarded.
        </p>
      </PixelModal>

      <RankUpOverlay
        show={showRankUp}
        prevTier={rankPrev}
        newTier={rankNext}
        onDone={() => setShowRankUp(false)}
      />
    </div>
  );
}
