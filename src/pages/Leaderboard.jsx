import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PixelCard from '../components/PixelCard';
import { leaderboard } from '../lib/backend';

export default function Leaderboard() {
  const { user } = useAuth();
  const [role, setRole] = useState('customer');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [all, setAll] = useState([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    const unsub = leaderboard.listenLeaderboard({ role, limit: 10 }, (list) => setRows(list));
    let active = true;
    setError(false);
    leaderboard
      .getAllLeaderboard({ role })
      .then((list) => {
        if (active) {
          setAll(list);
          setTotal(list.length);
        }
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      unsub();
    };
  }, [role]);

  const isRider = role === 'rider';
  const topCount = rows[0]?.count || 1;
  const myIndex = all.findIndex((r) => r.uid === user.uid);

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div>
        <h1 className="font-pixel text-[13px] text-cream">CAMPUS LEADERBOARD</h1>
        <p className="font-crt text-fade text-lg">
          Global · ranking all <span className="text-gold">{total}</span> players campus-wide.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setRole('customer')}
          className={[
            'flex-1 font-pixel text-[10px] px-3 py-2.5 border-2 cursor-pointer',
            role === 'customer'
              ? 'bg-brand text-black border-black'
              : 'bg-panel-2 text-fade border-line hover:border-cream',
          ].join(' ')}
        >
          EATERS
        </button>
        <button
          onClick={() => setRole('rider')}
          className={[
            'flex-1 font-pixel text-[10px] px-3 py-2.5 border-2 cursor-pointer',
            role === 'rider'
              ? 'bg-sky text-black border-black'
              : 'bg-panel-2 text-fade border-line hover:border-cream',
          ].join(' ')}
        >
          RIDERS
        </button>
      </div>

      {error && (
        <PixelCard tone="dark" className="border-danger">
          <div className="font-pixel text-[11px] text-danger mb-2">COULD NOT LOAD RANKINGS</div>
          <p className="font-crt text-fade text-lg">
            Check your connection and come back to see the leaderboard.
          </p>
        </PixelCard>
      )}

      {rows.length === 0 && !error && (
        <PixelCard>
          <p className="font-crt text-fade text-xl text-center py-4">No ranked players yet.</p>
        </PixelCard>
      )}

      <div className="flex flex-col gap-2">
        {rows.map((r, i) => {
          const isMe = r.uid === user.uid;
          return (
            <PixelCard
              key={r.uid}
              className={`!p-3 ${isMe ? 'border-gold' : ''}`}
              tone={isMe ? 'highlight' : 'panel'}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 shrink-0 flex items-center justify-center font-pixel text-xs sm:text-sm border-2 border-black ${
                    i < 3 ? 'bg-gold text-black' : 'bg-panel-2 text-fade'
                  }`}
                >
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-pixel text-[9px] sm:text-[10px] text-cream truncate">
                      {r.name.toUpperCase()}
                    </span>
                    {isMe && <span className="font-pixel text-[7px] text-gold border-2 border-gold px-1 py-0.5">YOU</span>}
                  </div>
                  <div className="font-crt text-fade text-base">
                    {isRider ? `${r.count} deliveries` : `${r.count} orders placed`}
                    {isRider && r.riderRatingCount > 0 && (
                      <span className="text-gold"> · ★ {r.riderRatingAvg.toFixed(1)}</span>
                    )}
                  </div>
                </div>
                <div
                  className="h-3 border-2 border-black"
                  style={{
                    backgroundColor: r.rank.color,
                    width: `${Math.max(6, (r.count / topCount) * 50)}px`,
                  }}
                  title={r.rank.name}
                />
                <span
                  className="font-pixel text-[8px] px-1.5 py-0.5 border-2 shrink-0"
                  style={{ borderColor: r.rank.color, color: r.rank.color }}
                >
                  {r.rank.name.toUpperCase()}
                </span>
              </div>
            </PixelCard>
          );
        })}
      </div>

      <PixelCard tone="dark">
        {myIndex >= 0 ? (
          <div className="flex items-center justify-between">
            <span className="font-pixel text-[9px] text-fade">YOUR GLOBAL RANK</span>
            <span className="font-pixel text-[12px] text-gold">
              #{myIndex + 1} / {total} {isRider ? 'RIDERS' : 'EATERS'}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="font-pixel text-[9px] text-fade">YOUR GLOBAL RANK</span>
            <span className="font-pixel text-[10px] text-fade">NOT RANKED YET</span>
          </div>
        )}
      </PixelCard>
    </div>
  );
}
