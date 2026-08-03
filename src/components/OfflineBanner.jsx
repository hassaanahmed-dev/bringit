import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(() => !navigator.onLine);
  useEffect(() => {
    const up = () => setOffline(false);
    const down = () => setOffline(true);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="bg-gold border-b-2 border-black px-3 py-1.5 text-center">
      <span className="font-pixel text-[9px] text-black">OFFLINE — RECONNECTING...</span>
    </div>
  );
}
