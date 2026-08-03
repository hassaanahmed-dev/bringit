import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import { ROUTES } from '../lib/routes';

const COOLDOWN = 30;

export default function Verify() {
  const { user, sendVerificationEmail, simulateVerification, refreshVerificationStatus, logout, isFirebase } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cooldown, setCooldown] = useState(0);
  const [sent, setSent] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (user?.emailVerified) navigate(ROUTES.HOME, { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (!user) navigate(ROUTES.LOGIN, { replace: true });
  }, [user, navigate]);

  useEffect(() => () => clearInterval(timer.current), []);

  const startCooldown = () => {
    setCooldown(COOLDOWN);
    timer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(timer.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const resend = async () => {
    await sendVerificationEmail();
    setSent(true);
    startCooldown();
    toast('Verification email sent again', 'success');
  };

  const simulate = async () => {
    const res = await simulateVerification();
    if (res && res.ok === false) {
      toast(res.message || 'Verify via the email link in the live build', 'error');
      return;
    }
    toast('Email verified. Entering campus!', 'success');
    navigate(ROUTES.HOME);
  };

  const refreshStatus = async () => {
    const verified = await refreshVerificationStatus();
    if (verified) {
      toast('Email verified. Entering campus!', 'success');
      navigate(ROUTES.HOME);
    } else {
      toast('Not verified yet — check your inbox', 'error');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 scanlines">
      <div className="w-full max-w-sm">
        <PixelCard tone="dark" className="border-sky">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-sky border-4 border-black flex items-center justify-center font-pixel text-3xl text-black">
              ✉
            </div>
          </div>
          <h1 className="font-pixel text-[13px] text-sky text-center mb-3">CHECK YOUR EMAIL</h1>
          <p className="font-crt text-xl text-cream text-center leading-tight mb-1">
            A verification link was sent to
          </p>
          <p className="font-pixel text-[11px] text-gold text-center mb-5">{user.email}</p>
          <p className="font-crt text-fade text-lg text-center mb-6">
            Click the link in the email to activate your player. You can't order or deliver until
            you're verified.
          </p>

          <div className="flex flex-col gap-3">
            {isFirebase ? (
              <PixelButton block onClick={refreshStatus}>
                I Verified — Check Again
              </PixelButton>
            ) : (
              <PixelButton block onClick={simulate}>
                Demo: Simulate Opening Link
              </PixelButton>
            )}
            <PixelButton block variant="ghost" onClick={resend} disabled={cooldown > 0}>
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Email'}
            </PixelButton>
            <PixelButton
              block
              variant="outline"
              onClick={() => {
                logout();
                navigate(ROUTES.LOGIN);
              }}
            >
              Switch Account
            </PixelButton>
          </div>

          {sent && (
            <p className="mt-4 text-center font-pixel text-[9px] text-leaf">
              +1 EMAIL SENT · CHECK SPAM TOO
            </p>
          )}
        </PixelCard>
      </div>
    </div>
  );
}
