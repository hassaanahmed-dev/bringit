import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import PixelBadge from '../components/PixelBadge';
import PixelInput from '../components/PixelInput';
import { RatingSummary, Stars } from '../components/Stars';
import { orders } from '../lib/backend';
import { getRank } from '../lib/rank';
import { ROUTES } from '../lib/routes';

export default function Profile() {
  const { user, updateProfile, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [earned, setEarned] = useState(0);

  useEffect(() => {
    let active = true;
    orders.getRiderEarnings(user.uid, { pageSize: 1 }).then(({ total }) => {
      if (active) setEarned(total);
    });
    return () => { active = false; };
  }, [user.uid]);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone);

  const tier = getRank(user.customerOrderCount);
  const save = async () => {
    if (!name.trim() || phone.trim().length < 10) {
      toast('Fill in name and a valid phone', 'error');
      return;
    }
    await updateProfile({ name: name.trim(), phone: phone.trim() });
    setEditing(false);
    toast('Profile updated', 'success');
  };

  const nextTier = getRank(user.customerOrderCount + 1);
  const nextAt = nextTier.min;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-pixel text-[13px] text-cream">PLAYER CARD</h1>
        <p className="font-crt text-fade text-lg">Your campus reputation.</p>
      </div>

      <PixelCard tone="dark">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 border-4 border-black flex items-center justify-center font-pixel text-xl text-black"
            style={{ backgroundColor: tier.color }}
          >
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="font-pixel text-[13px] text-cream truncate">{user.name.toUpperCase()}</div>
            <div className="font-crt text-fade text-base truncate">{user.email}</div>
            <div className="font-crt text-fade text-base">{user.phone}</div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <PixelButton small variant="ghost" onClick={() => setEditing((e) => !e)}>
            {editing ? 'Cancel' : 'Edit'}
          </PixelButton>
          <PixelButton
            small
            variant="danger"
            onClick={() => {
              logout();
              navigate(ROUTES.LOGIN);
            }}
          >
            Sign Out
          </PixelButton>
        </div>
      </PixelCard>

      {editing && (
        <PixelCard>
          <div className="font-pixel text-[9px] text-sky mb-3">EDIT PLAYER CARD</div>
          <div className="flex flex-col gap-3">
            <PixelInput label="NAME" value={name} onChange={(e) => setName(e.target.value)} />
            <PixelInput label="PHONE" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <PixelButton block variant="leaf" onClick={save}>
              Save Changes
            </PixelButton>
          </div>
        </PixelCard>
      )}

      <div className="grid grid-cols-2 gap-3">
        <PixelCard>
          <div className="font-pixel text-[8px] text-fade mb-2">CUSTOMER RANK</div>
          <PixelBadge orderCount={user.customerOrderCount} />
          <div className="font-crt text-fade text-base mt-2">{user.customerOrderCount} orders placed</div>
          <div className="font-pixel text-[8px] text-fade mt-2">
            {user.customerOrderCount < 60 ? `NEXT AT ${nextAt} ORDERS` : 'MAX TIER!'}
          </div>
        </PixelCard>
        <PixelCard>
          <div className="font-pixel text-[8px] text-fade mb-2">RIDER RANK</div>
          <PixelBadge orderCount={user.riderOrderCount} label="RIDER" />
          <div className="font-crt text-fade text-base mt-2">{user.riderOrderCount} deliveries</div>
          <button
            onClick={() => navigate(ROUTES.EARNINGS)}
            className="mt-2 font-pixel text-[8px] text-gold border-2 border-gold px-2 py-1 hover:bg-gold hover:text-black cursor-pointer"
          >
            EARNINGS ▸ Rs {earned.toLocaleString()}
          </button>
        </PixelCard>
      </div>

      <PixelCard>
        <div className="font-pixel text-[8px] text-fade mb-2">RIDER RATING</div>
        {user.riderRatingCount ? (
          <div className="flex items-center justify-between">
            <Stars value={Math.round(user.riderRatingAvg)} size="sm" />
            <RatingSummary avg={user.riderRatingAvg} count={user.riderRatingCount} />
          </div>
        ) : (
          <p className="font-crt text-fade text-lg">No ratings yet.</p>
        )}
      </PixelCard>

      <PixelButton variant="ghost" block onClick={() => navigate(ROUTES.LEADERBOARD)}>
        Campus Leaderboard
      </PixelButton>
    </div>
  );
}
