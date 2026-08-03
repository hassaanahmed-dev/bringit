import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PixelButton from '../components/PixelButton';
import { ROUTES } from '../lib/routes';

export default function Splash() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const enter = () => {
    if (user?.emailVerified) navigate(ROUTES.HOME);
    else navigate(ROUTES.LOGIN);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 scanlines relative">
      <div className="absolute inset-0 pointer-events-none opacity-[0.07] bg-[repeating-linear-gradient(0deg,#fff_0_1px,transparent_1px_5px),repeating-linear-gradient(90deg,#fff_0_1px,transparent_1px_5px)]" />

      <div className="text-center relative z-10 w-full max-w-sm">
        <div className="font-pixel text-[10px] text-gold mb-6 step-in">
          ▓▓ A FAST ISB CAMPUS QUEST ▓▓
        </div>

        <div className="mb-2 flex justify-center float-bob">
          <div className="relative">
            <div className="w-20 h-20 bg-brand border-4 border-black shadow-[8px_8px_0_rgba(0,0,0,0.7)]" />
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-24 h-3 bg-black/40" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-7 bg-black relative">
                <div className="absolute left-1 top-1 w-3 h-3 bg-sky" />
                <div className="absolute right-1 top-1 w-3 h-3 bg-gold" />
                <div className="absolute left-1 bottom-1 w-3 h-3 bg-leaf" />
                <div className="absolute right-1 bottom-1 w-3 h-3 bg-royal" />
              </div>
            </div>
            <div className="absolute -right-3 -top-3 w-6 h-6 bg-cream border-2 border-black font-pixel text-black text-[10px] flex items-center justify-center">
              !
            </div>
          </div>
        </div>

        <div className="font-pixel text-4xl text-cream leading-tight mb-1">
          BRING<span className="text-brand">IT</span>
        </div>
        <div className="font-crt text-2xl text-fade mb-8">
          Food from campus shops, delivered by students like you.
        </div>

        <div className="flex flex-col gap-3">
          <PixelButton block onClick={enter}>
            ▸ Press Start
          </PixelButton>
          <PixelButton block variant="ghost" onClick={() => navigate(ROUTES.SIGNUP)}>
            New Rookie? Sign Up
          </PixelButton>
        </div>

        <div className="mt-8 flex justify-center gap-5 text-fade">
          <span className="font-pixel text-[8px] text-leaf">P2P DELIVERY</span>
          <span className="font-pixel text-[8px] text-sky">LIVE TRACKING</span>
          <span className="font-pixel text-[8px] text-gold">RANK UP</span>
        </div>
      </div>

      <div className="absolute bottom-4 font-pixel text-[8px] text-fade/60">
        PRESS 2P · NO SMOOTH CURVES · CASH ON DELIVERY
      </div>
    </div>
  );
}
