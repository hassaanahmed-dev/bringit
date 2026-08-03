import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import PixelBadge from '../components/PixelBadge';
import { ShopChip, FeeTag } from '../components/Logo';
import { orders } from '../lib/backend';
import { ORDER_STATUS } from '../lib/constants';
import { formatTime } from '../lib/rank';
import { ROUTES } from '../lib/routes';

export default function RiderOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [takenMsg, setTakenMsg] = useState(false);

  useEffect(() => {
    return orders.listenOrder(id, (o) => {
      setOrder(o);
      if (o && o.status !== ORDER_STATUS.OPEN) setTakenMsg(true);
    });
  }, [id]);

  const accept = async () => {
    setBusy(true);
    const res = await orders.acceptOrder(order.id, {
      uid: user.uid,
      name: user.name,
      phone: user.phone,
      orderCount: user.riderOrderCount,
    });
    setBusy(false);
    if (!res.ok) {
      setTakenMsg(true);
      toast(res.message || 'Could not take this order', 'error');
      return;
    }
    toast('Order accepted! Head to the shops.', 'success');
    navigate(ROUTES.ACTIVE_ORDER(order.id));
  };

  if (!order) return <div className="font-pixel text-[10px] text-fade py-10 text-center">LOADING MISSION...</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-pixel text-[13px] text-cream">MISSION BRIEF</h1>
          <div className="font-pixel text-[9px] text-fade mt-1">#{order.id.slice(0, 6).toUpperCase()}</div>
        </div>
        <button
          onClick={() => navigate(ROUTES.RIDER_FEED)}
          className="font-pixel text-[10px] text-fade border-2 border-line px-2 py-1.5 hover:border-cream cursor-pointer"
        >
          ← FEED
        </button>
      </div>

      {takenMsg && order.status !== ORDER_STATUS.OPEN && (
        <PixelCard tone="dark" className="border-danger">
          <div className="font-pixel text-[11px] text-danger mb-2">ORDER ALREADY TAKEN</div>
          <p className="font-crt text-fade text-lg mb-3">
            This order was just taken by another rider. Back to the pool!
          </p>
          <PixelButton block variant="sky" onClick={() => navigate(ROUTES.RIDER_FEED)}>
            Return to Feed
          </PixelButton>
        </PixelCard>
      )}

      <PixelCard>
        <div className="flex items-start justify-between gap-2 mb-3">
          <PixelBadge orderCount={order.customerOrderCount} />
          <span className="font-pixel text-[8px] text-fade">POSTED {formatTime(order.createdAt)}</span>
        </div>
        <p className="font-crt text-2xl text-cream leading-snug mb-4 break-words">{order.description}</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {order.shops.map((s) => (
            <ShopChip key={s} name={s} />
          ))}
        </div>
        <div className="flex justify-between items-center border-t-2 border-line pt-3">
          <span className="font-pixel text-[10px] text-fade">
            ZONE <span className="text-cream">{order.zoneName.toUpperCase()}</span>
          </span>
          <FeeTag fee={order.deliveryFee} />
        </div>
      </PixelCard>

      <PixelCard tone="highlight">
        <div className="font-pixel text-[9px] text-gold mb-1">DROP LOCATION</div>
        <div className="font-crt text-2xl text-cream">{order.deliveryNote || '— no spot given —'}</div>
      </PixelCard>

      {order.customerId === user.uid && (
        <PixelCard tone="dark" className="border-danger">
          <div className="font-pixel text-[10px] text-danger">THAT IS YOUR OWN ORDER</div>
          <p className="font-crt text-fade text-lg">You can't deliver a quest you posted yourself.</p>
        </PixelCard>
      )}

      {order.status === ORDER_STATUS.OPEN && order.customerId !== user.uid && (
        <PixelButton block onClick={accept} disabled={busy}>
          {busy ? 'LOCKING IT IN...' : `Accept Order — Rs ${order.deliveryFee}`}
        </PixelButton>
      )}
    </div>
  );
}
