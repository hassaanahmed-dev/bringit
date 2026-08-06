import { useState, useEffect, useRef } from 'react';
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
import { waLink } from '../lib/phone';
import { ROUTES } from '../lib/routes';

function fmtCountdown(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [order, setOrder] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingDone, setRatingDone] = useState(false);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [showRankUp, setShowRankUp] = useState(false);
  const [rankPrev, setRankPrev] = useState(null);
  const [rankNext, setRankNext] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [confirmBusy, setConfirmBusy] = useState(false);
  const prevStatusRef = useRef(null);
  const expiredTriedRef = useRef(false);

  useEffect(() => {
    setLoadError(false);
    return orders.listenOrder(
      id,
      (o) => {
        setOrder(o);
        if (o) setLoadError(false);
      },
      () => setLoadError(true),
    );
  }, [id]);

  useEffect(() => {
    if (!order) return;
    // Only celebrate a rank-up when the order flips to Delivered live on this
    // screen — not every time someone re-opens an already-delivered order.
    const becameDelivered =
      order.status === ORDER_STATUS.DELIVERED &&
      prevStatusRef.current !== ORDER_STATUS.DELIVERED &&
      prevStatusRef.current !== null;
    prevStatusRef.current = order.status;
    if (becameDelivered && order.customerId === user.uid) {
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

  useEffect(() => {
    if (!order?.departedAt && order?.status !== ORDER_STATUS.OPEN) return;
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, [order?.departedAt, order?.status]);

  useEffect(() => {
    if (order?.status === ORDER_STATUS.OPEN && order.expiresAt && order.expiresAt < Date.now()) {
      if (!expiredTriedRef.current) {
        expiredTriedRef.current = true;
        orders.expireOrder(order.id);
      }
    }
  }, [order]);

  if (loadError && !order) {
    return (
      <PixelCard>
        <div className="font-pixel text-[11px] text-danger mb-2">UNABLE TO LOAD ORDER</div>
        <p className="font-crt text-fade text-lg mb-4">
          This order doesn't exist or you can't view it.
        </p>
        <PixelButton variant="sky" block onClick={() => navigate(ROUTES.HOME)}>
          Back Home
        </PixelButton>
      </PixelCard>
    );
  }

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
  const showRiderChat =
    order.riderId &&
    (order.status === ORDER_STATUS.ACCEPTED || order.status === ORDER_STATUS.PAID_AT_SHOP);
  const totalForPayment = (order.paidAmount || 0) + (order.deliveryFee || 0);
  const showRating = isDelivered && !order.rated && !ratingDone;

  const doCancel = async () => {
    await orders.cancelByCustomer(order.id);
    setConfirmCancel(false);
    toast('Order cancelled', 'info');
  };

  const confirmPaymentTap = async () => {
    setConfirmBusy(true);
    const res = await orders.confirmPayment(order.id);
    setConfirmBusy(false);
    if (res.ok) toast('Payment confirmed', 'success');
    else toast('Could not confirm payment', 'error');
  };

  const submitRating = async (score) => {
    if (!order.riderId || ratingBusy) return;
    setRatingBusy(true);
    const res = await orders.rateOrder(order.id, score);
    setRatingBusy(false);
    if (res.ok) {
      setRatingDone(true);
      toast('Rider rated. Thanks!', 'success');
    } else {
      toast('Could not rate this order', 'error');
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
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

      {order.status === ORDER_STATUS.OPEN && order.expiresAt && (
        <PixelCard tone="dark">
          <div className="flex items-center justify-between">
            <span className="font-pixel text-[10px] text-sky">RIDER SEARCH</span>
            <span
              className={`font-pixel text-[10px] ${
                order.expiresAt - nowTick <= 30000 ? 'text-danger blink' : 'text-gold'
              }`}
            >
              EXPIRES IN {fmtCountdown(order.expiresAt - nowTick)}
            </span>
          </div>
        </PixelCard>
      )}

      {order.status === ORDER_STATUS.EXPIRED && (
        <PixelCard tone="dark" className="border-danger">
          <div className="font-pixel text-[11px] text-danger mb-2">ORDER EXPIRED</div>
          <p className="font-crt text-fade text-lg mb-4">
            No rider took this order in time, so it's been removed from the pool.
          </p>
          <PixelButton block variant="sky" onClick={() => navigate(ROUTES.NEW_ORDER)}>
            Place a New Order
          </PixelButton>
        </PixelCard>
      )}

      {order.status === ORDER_STATUS.PAID_AT_SHOP && (
        <PixelCard tone="dark" className="border-gold">
          <div className="font-pixel text-[11px] text-gold mb-1">HAVE THIS READY</div>
          <div className="font-crt text-4xl text-cream">
            Rs {(order.paidAmount || 0) + (order.deliveryFee || 0)}
          </div>
          <p className="font-crt text-fade text-lg">
            Rs {order.paidAmount || 0} food + Rs {order.deliveryFee || 0} delivery fee — your rider
            will collect this.
          </p>
        </PixelCard>
      )}

      {order.departedAt && (
        <PixelCard tone="dark" className="border-sky">
          <div className="font-pixel text-[10px] text-sky mb-1">RIDER EN ROUTE</div>
          {(() => {
            const etaMs = (order.departedAt || 0) + (order.etaMinutes || 0) * 60000 - nowTick;
            if (etaMs <= 0) {
              return <div className="font-crt text-3xl text-cream blink">RIDER IS NEARBY — LOOK OUT!</div>;
            }
            const totalSec = Math.max(0, Math.ceil(etaMs / 1000));
            const remMin = Math.floor(totalSec / 60);
            const remSec = totalSec % 60;
            return (
              <div className="font-crt text-3xl text-cream">
                ARRIVING IN ~{remMin} MIN {remSec ? `${remSec}s` : ''}
              </div>
            );
          })()}
        </PixelCard>
      )}

      {order.status === ORDER_STATUS.CANCELLED && (
        <PixelCard tone="dark" className="border-danger">
          <div className="font-pixel text-[11px] text-danger mb-2">ORDER CANCELLED</div>
          <p className="font-crt text-fade text-lg mb-4">
            Your rider was notified and this order was cancelled. No rank progress was awarded
            for this order.
          </p>
          <PixelButton variant="sky" block onClick={() => navigate(ROUTES.NEW_ORDER)}>
            Place a New Order
          </PixelButton>
        </PixelCard>
      )}

      {isDelivered && (
        <PixelCard tone="dark" className="border-gold">
          <div className="font-pixel text-[10px] text-gold mb-1">PAYMENT</div>
          {order.paymentConfirmed ? (
            <p className="font-crt text-xl text-leaf">✓ Payment confirmed — Rs {totalForPayment}</p>
          ) : (
            <>
              <p className="font-crt text-cream text-xl mb-3">
                You paid Rs {totalForPayment} (Rs {order.paidAmount || 0} food + Rs{' '}
                {order.deliveryFee || 0} delivery fee).
              </p>
              <PixelButton
                block
                variant="gold"
                onClick={confirmPaymentTap}
                disabled={confirmBusy}
              >
                {confirmBusy ? 'SAVING...' : '✓ I PAID THIS AMOUNT'}
              </PixelButton>
            </>
          )}
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
              <Stars value={rating} onChange={(n) => setRating(n)} disabled={ratingBusy} />              <div className="flex gap-2">
                <PixelButton
                  variant="gold"
                  block
                  disabled={!rating || ratingBusy}
                  onClick={() => rating && submitRating(rating)}
                >
                  {ratingBusy ? (
                    <span className="inline-flex items-center justify-center gap-2 animate-pulse">
                      <span className="w-3 h-3 border-2 border-black/40 border-t-black animate-spin" />
                      RATING...
                    </span>
                  ) : rating ? (
                    `Rate ★ ${rating}`
                  ) : (
                    'Pick a Score'
                  )}
                </PixelButton>
                <PixelButton variant="ghost" block disabled={ratingBusy} onClick={() => setRatingDone(true)}>
                  Skip
                </PixelButton>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <PixelButton variant="leaf" block onClick={() => navigate(ROUTES.NEW_ORDER)}>
                Order Again
              </PixelButton>
              <PixelButton variant="sky" block onClick={() => navigate(ROUTES.HOME)}>
                Back to Home
              </PixelButton>
            </div>
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

      {showRiderChat && (
        <PixelCard tone="highlight">
          <div className="font-pixel text-[10px] text-gold mb-2">YOUR RIDER</div>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-pixel text-[11px] sm:text-[12px] text-cream">{order.riderName ? order.riderName.toUpperCase() : '...'}</span>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => navigate(ROUTES.CHAT(order.id))}
                className="font-pixel text-[10px] text-leaf border-2 border-leaf px-2 py-1.5 cursor-pointer"
              >
                CHAT ▸
              </button>
              <a
                href={waLink(order.riderPhone)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-pixel text-[10px] text-sky border-2 border-sky px-2 py-1.5 cursor-pointer"
              >
                WA ▸ {order.riderPhone}
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
          Cancel this order? Your rider will be notified and the order will be cancelled
          permanently. No rank progress will be awarded.
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
