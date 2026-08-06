import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import PixelInput from '../components/PixelInput';
import PixelModal from '../components/PixelModal';
import QuestTracker from '../components/QuestTracker';
import RankUpOverlay from '../components/RankUpOverlay';
import { ShopChip, FeeTag } from '../components/Logo';
import { orders } from '../lib/backend';
import { ORDER_STATUS } from '../lib/constants';
import { getRank } from '../lib/rank';
import { waLink } from '../lib/phone';
import { ROUTES } from '../lib/routes';

export default function ActiveOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [order, setOrder] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paidInput, setPaidInput] = useState('');
  const [showEtaModal, setShowEtaModal] = useState(false);
  const [etaInput, setEtaInput] = useState('8');
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [collectInput, setCollectInput] = useState('');
  const [showRankUp, setShowRankUp] = useState(false);
  const [rankPrev, setRankPrev] = useState(null);
  const [rankNext, setRankNext] = useState(null);
  const isRider = order?.riderId === user.uid;
  const cancelTimer = useRef(null);

  useEffect(() => {
    setLoadError(false);
    const unsub = orders.listenOrder(
      id,
      (o) => {
        setOrder(o);
        if (o) setLoadError(false);
        if (o && o.status === ORDER_STATUS.CANCELLED && !cancelTimer.current) {
          toast('Customer cancelled this order', 'error');
          cancelTimer.current = setTimeout(
            () => navigate(ROUTES.RIDER_FEED, { replace: true }),
            1500,
          );
        }
      },
      () => setLoadError(true),
    );
    return () => {
      unsub?.();
      if (cancelTimer.current) {
        clearTimeout(cancelTimer.current);
        cancelTimer.current = null;
      }
    };
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
    const amount = Math.max(0, Number(paidInput) || 0);
    if (amount <= 0) {
      toast('Enter the amount you paid for the food', 'error');
      return;
    }
    setBusy(true);
    setShowPayModal(false);
    const res = await orders.markPaid(order.id, amount);
    setBusy(false);
    if (res.ok) toast('Marked paid at shop', 'success');
    else toast('Could not update order', 'error');
  };

  const doDeliver = async () => {
    const collected = Math.max(0, Math.round(Number(collectInput) || 0));
    if (collected <= 0) {
      toast('Enter the amount you collected from the customer', 'error');
      return;
    }
    setBusy(true);
    setShowCollectModal(false);
    const res = await orders.deliver(order.id, collected);
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

  const doLeaveShop = async () => {
    const minutes = Math.round(Number(etaInput) || 0);
    if (minutes < 1) {
      toast('Enter a valid ETA in minutes', 'error');
      return;
    }
    setBusy(true);
    setShowEtaModal(false);
    const res = await orders.leaveShop(order.id, minutes);
    setBusy(false);
    if (res.ok) toast(`En route — arriving in ~${minutes} min`, 'success');
    else toast('Could not update order', 'error');
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
              href={waLink(order.customerPhone)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-pixel text-[10px] text-sky border-2 border-sky px-2 py-1.5 cursor-pointer"
            >
              WA ▸ {order.customerPhone}
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

      {order.status === ORDER_STATUS.PAID_AT_SHOP && (
        <PixelCard tone="dark" className="border-gold">
          <div className="font-pixel text-[10px] text-gold mb-1">COLLECT FROM CUSTOMER</div>
          <div className="font-crt text-4xl text-cream">
            Rs {(order.paidAmount || 0) + (order.deliveryFee || 0)}
          </div>
          <p className="font-crt text-fade text-lg">
            Rs {order.paidAmount || 0} food + Rs {order.deliveryFee || 0} delivery fee
          </p>
        </PixelCard>
      )}

      {order.status === ORDER_STATUS.PAID_AT_SHOP && order.departedAt && (
        <PixelCard tone="dark" className="border-sky">
          <div className="font-pixel text-[10px] text-sky mb-1">EN ROUTE</div>
          <p className="font-crt text-cream text-xl">
            ETA {order.etaMinutes} min to drop-off
          </p>
        </PixelCard>
      )}

      {order.status === ORDER_STATUS.DELIVERED && (
        <PixelCard tone="dark" className="border-leaf">
          <div className="font-pixel text-[12px] text-leaf mb-1">DELIVERED!</div>
          <p className="font-crt text-cream text-xl mb-3">
            Quest complete — Rs {order.deliveryFee} earned.
          </p>
          <PixelButton block variant="sky" onClick={() => navigate(ROUTES.HOME)}>
            Back to Home
          </PixelButton>
        </PixelCard>
      )}

      <div className="flex flex-col gap-2">
        {order.status === ORDER_STATUS.ACCEPTED && (
          <PixelButton block variant="gold" onClick={() => setShowPayModal(true)} disabled={busy}>
            {busy ? (
              <span className="inline-flex items-center justify-center gap-2 animate-pulse">
                <span className="w-3 h-3 border-2 border-black/40 border-t-black animate-spin" />
                UPDATING...
              </span>
            ) : (
              'Mark Paid at Shop'
            )}
          </PixelButton>
        )}
        {order.status === ORDER_STATUS.PAID_AT_SHOP && !order.departedAt && (
          <PixelButton block variant="sky" onClick={() => setShowEtaModal(true)} disabled={busy}>
            Leaving Shop — Set ETA
          </PixelButton>
        )}
        {order.status === ORDER_STATUS.PAID_AT_SHOP && (
          <PixelButton
            block
            variant="leaf"
            onClick={() => {
              setCollectInput(String((order.paidAmount || 0) + (order.deliveryFee || 0)));
              setShowCollectModal(true);
            }}
            disabled={busy}
          >
            {busy ? (
              <span className="inline-flex items-center justify-center gap-2 animate-pulse">
                <span className="w-3 h-3 border-2 border-black/40 border-t-black animate-spin" />
                UPDATING...
              </span>
            ) : (
              'Mark Delivered'
            )}
          </PixelButton>
        )}
        {order.status === ORDER_STATUS.ACCEPTED && (
          <PixelButton block variant="ghost" onClick={doRiderCancel} disabled={busy}>
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

      <PixelModal
        open={showPayModal}
        onClose={() => setShowPayModal(false)}
        title="PAID AT SHOP?"
        footer={
          <div className="flex gap-2">
            <PixelButton block variant="ghost" onClick={() => setShowPayModal(false)}>
              Not yet
            </PixelButton>
            <PixelButton block variant="gold" onClick={doPaid}>
              Confirm paid
            </PixelButton>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="font-crt text-lg text-cream leading-snug">
            Enter the actual amount you paid for the{' '}
            <span className="text-gold">food only</span> (not the delivery fee).
          </p>
          <PixelInput
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="e.g. 450"
            value={paidInput}
            onChange={(e) => setPaidInput(e.target.value)}
            hint={`The customer will be shown Rs ${Number(paidInput) || 0} + Rs ${order.deliveryFee || 0} delivery fee to have ready.`}
          />
        </div>
      </PixelModal>

      <PixelModal
        open={showEtaModal}
        onClose={() => setShowEtaModal(false)}
        title="LEAVING THE SHOP?"
        footer={
          <div className="flex gap-2">
            <PixelButton block variant="ghost" onClick={() => setShowEtaModal(false)}>
              Not yet
            </PixelButton>
            <PixelButton block variant="sky" onClick={doLeaveShop}>
              I'm on my way
            </PixelButton>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="font-crt text-lg text-cream leading-snug">
            Estimate how long until you reach the customer. They'll see a live countdown.
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[5, 8, 10, 15].map((m) => (
              <button
                key={m}
                onClick={() => setEtaInput(String(m))}
                className={[
                  'font-pixel text-[10px] py-2 border-2 cursor-pointer',
                  etaInput === String(m)
                    ? 'bg-sky text-black border-black'
                    : 'bg-panel-2 text-fade border-line hover:border-cream',
                ].join(' ')}
              >
                {m}m
              </button>
            ))}
          </div>
          <PixelInput
            type="number"
            inputMode="numeric"
            min={1}
            max={60}
            label="OR CUSTOM MINUTES"
            value={etaInput}
            onChange={(e) => setEtaInput(e.target.value)}
          />
        </div>
      </PixelModal>

      <PixelModal
        open={showCollectModal}
        onClose={() => setShowCollectModal(false)}
        title="COLLECTED FROM CUSTOMER?"
        footer={
          <div className="flex gap-2">
            <PixelButton block variant="ghost" onClick={() => setShowCollectModal(false)}>
              Not yet
            </PixelButton>
            <PixelButton block variant="leaf" onClick={doDeliver}>
              Confirm delivery
            </PixelButton>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="font-crt text-lg text-cream leading-snug">
            Enter the <span className="text-leaf">total cash collected</span> from the customer —
            the food amount <span className="text-cream">plus</span> the delivery fee.
          </p>
          <PixelInput
            type="number"
            inputMode="numeric"
            min={0}
            label="AMOUNT COLLECTED FROM CUSTOMER (Rs)"
            placeholder="e.g. 480"
            value={collectInput}
            onChange={(e) => setCollectInput(e.target.value)}
            hint={`You paid Rs ${order.paidAmount || 0} at the shop + Rs ${order.deliveryFee || 0} delivery fee = total to collect.`}
          />
        </div>
      </PixelModal>
    </div>
  );
}
