import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import { useNotifications } from '../hooks/useNotifications';
import { notifications } from '../lib/backend';
import { formatTime } from '../lib/rank';
import { ROUTES } from '../lib/routes';

const TYPE_STYLE = {
  accept: { label: 'ACCEPT', color: 'bg-sky' },
  paid: { label: 'PAID', color: 'bg-gold' },
  delivered: { label: 'DONE', color: 'bg-leaf' },
  customer_cancel: { label: 'CANCEL', color: 'bg-danger' },
  rider_cancel: { label: 'BACKOUT', color: 'bg-danger' },
  rating: { label: 'STAR', color: 'bg-royal' },
};

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { list } = useNotifications(user.uid);

  const open = (n) => {
    notifications.markRead(user.uid, n.id);
    if (n.orderId) navigate(ROUTES.ORDER(n.orderId));
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-pixel text-[13px] text-cream">NOTIFICATIONS</h1>
          <p className="font-crt text-fade text-lg">Campus quest alerts.</p>
        </div>
        <div className="flex gap-2">
          <PixelButton small variant="ghost" onClick={() => notifications.markAllRead(user.uid)}>
            Read All
          </PixelButton>
          <PixelButton small variant="outline" onClick={() => notifications.clearNotifications(user.uid)}>
            Clear
          </PixelButton>
        </div>
      </div>

      {list.length === 0 && (
        <PixelCard>
          <p className="font-crt text-fade text-xl text-center py-4">No notifications yet.</p>
        </PixelCard>
      )}

      <div className="flex flex-col gap-2">
        {list.map((n) => {
          const style = TYPE_STYLE[n.type] || { label: 'INFO', color: 'bg-sky' };
          return (
            <button
              key={n.id}
              onClick={() => open(n)}
              className="text-left cursor-pointer"
            >
              <PixelCard
                className={`!p-3 hover:border-sky transition-colors ${n.read ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`font-pixel text-[8px] text-black border-2 border-black px-1.5 py-0.5 ${style.color}`}
                  >
                    {style.label}
                  </span>
                  <span className="font-pixel text-[9px] text-cream">{n.title}</span>
                  <span className="ml-auto font-pixel text-[7px] text-fade">{formatTime(n.createdAt)}</span>
                </div>
                <p className="font-crt text-lg text-fade leading-snug">{n.body}</p>
              </PixelCard>
            </button>
          );
        })}
      </div>
    </div>
  );
}
