import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PixelCard from '../components/PixelCard';
import PixelBadge from '../components/PixelBadge';
import { RatingSummary } from '../components/Stars';
import { orders } from '../lib/backend';
import { ROUTES } from '../lib/routes';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [earned, setEarned] = useState(0);

  useEffect(() => {
    let active = true;
    orders.getRiderEarnings(user.uid, { pageSize: 1 }).then(({ total }) => {
      if (active) setEarned(total);
    });
    return () => { active = false; };
  }, [user.uid]);

  const roles = [
    {
      to: ROUTES.NEW_ORDER,
      title: 'GET FOOD',
      color: 'bg-brand',
      desc: 'Order from campus shops, track your rider live.',
      cta: 'PLACE AN ORDER',
      glyphChar: '🍔',
    },
    {
      to: ROUTES.RIDER_FEED,
      title: 'DELIVER',
      color: 'bg-sky',
      desc: 'Grab open orders, earn delivery fees, rank up.',
      cta: 'OPEN THE FEED',
      glyphChar: '🛵',
    },
  ];

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div>
        <h1 className="font-pixel text-[14px] text-cream">
          HEY, <span className="text-brand">{user.name.toUpperCase().split(' ')[0]}</span>!
        </h1>
        <p className="font-crt text-fade text-lg">Ready for today's campus quests?</p>
      </div>

      <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">
        {roles.map((r) => (
          <button key={r.title} onClick={() => navigate(r.to)} className="text-left cursor-pointer">
            <PixelCard tone="dark" className="hover:border-cream transition-colors h-full">
              <div className={`w-11 h-11 mb-3 flex items-center justify-center font-pixel text-xl text-black border-2 border-black ${r.color}`}>
                {r.glyphChar}
              </div>
              <div className="font-pixel text-[11px] text-cream mb-1">{r.title}</div>
              <p className="font-crt text-base text-fade leading-tight mb-3">{r.desc}</p>
              <span className="font-pixel text-[8px] text-sky">▸ {r.cta}</span>
            </PixelCard>
          </button>
        ))}
      </div>

      <PixelCard tone="highlight">
        <div className="font-pixel text-[9px] text-fade mb-3">YOUR STATS</div>
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div>
            <div className="font-pixel text-[8px] text-fade mb-1">CUSTOMER</div>
            <PixelBadge orderCount={user.customerOrderCount} />
            <div className="font-crt text-fade text-base mt-1">{user.customerOrderCount} orders</div>
          </div>
          <div>
            <div className="font-pixel text-[8px] text-fade mb-1">RIDER</div>
            <PixelBadge orderCount={user.riderOrderCount} label="RIDER" />
            <div className="font-crt text-fade text-base mt-1">
              {user.riderOrderCount} deliveries · <RatingSummary avg={user.riderRatingAvg} count={user.riderRatingCount} />
            </div>
          </div>
        </div>
        <div className="flex justify-between border-t-2 border-line pt-2">
          <span className="font-pixel text-[9px] text-fade">TOTAL EARNED</span>
          <span className="font-pixel text-[12px] text-gold">Rs {earned.toLocaleString()}</span>
        </div>
        <button
          onClick={() => navigate(ROUTES.LEADERBOARD)}
          className="mt-3 w-full font-pixel text-[9px] text-sky border-2 border-sky py-2 hover:bg-sky hover:text-black cursor-pointer"
        >
          ▸ CAMPUS LEADERBOARD
        </button>
      </PixelCard>
    </div>
  );
}
