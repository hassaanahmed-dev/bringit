import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PixelButton from '../components/PixelButton';
import { ROUTES } from '../lib/routes';
import logoSrc from '/images/logo.png';

export default function Splash() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const enter = () => {
    if (user?.emailVerified) navigate(ROUTES.HOME);
    else navigate(ROUTES.LOGIN);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 sm:px-6 scanlines relative safe-x">
      <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[repeating-linear-gradient(0deg,#00c8d6_0_1px,transparent_1px_5px),repeating-linear-gradient(90deg,#00c8d6_0_1px,transparent_1px_5px)]" />

      <div className="text-center relative z-10 w-full max-w-sm">
        <div className="font-pixel text-[10px] text-gold mb-6 step-in">
          ▓▓ A FAST ISB CAMPUS QUEST ▓▓
        </div>

        <div className="mb-2 flex justify-center float-bob">
          <img
            src={logoSrc}
            alt="BringIt logo"
            className="w-24 h-24 border-4 border-black shadow-[8px_8px_0_rgba(0,0,0,0.7)]"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        <div className="font-pixel text-3xl sm:text-4xl text-cream leading-tight mb-1">
          BRING<span className="text-brand">IT</span>
        </div>
        <div className="font-crt text-xl sm:text-2xl text-fade mb-6 sm:mb-8">
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

        <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-3 sm:gap-5 text-fade">
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
