import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import PixelInput from '../components/PixelInput';
import Logo from '../components/Logo';
import { ROUTES } from '../lib/routes';

export default function Login() {
  const { login, revoked, clearRevoked, isFirebase } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (revoked) {
      toast('ACCOUNT REMOVED FROM THE SERVER — CREATE A NEW ONE', 'error');
      clearRevoked();
    }
  }, [revoked, clearRevoked, toast]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const { user, error } = await login(email, password);
    setBusy(false);
    if (error) {
      setErrors({ [error.field]: error.message });
      toast(error.message, 'error');
      return;
    }
    if (!user.emailVerified) {
      toast('VERIFY YOUR EMAIL FIRST', 'info');
      navigate(ROUTES.VERIFY);
      return;
    }
    toast(`WELCOME BACK, ${user.name.toUpperCase()}!`, 'success');
    navigate(ROUTES.HOME);
  };

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-6 scanlines">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <PixelCard>
          <h1 className="font-pixel text-[13px] text-cream mb-5">PLAYER LOGIN</h1>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <PixelInput
              label="FAST EMAIL"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              placeholder="you@isb.nu.edu.pk"
            />
            <PixelInput
              label="PASSWORD"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              placeholder="••••••••"
            />
            <PixelButton block type="submit" disabled={busy}>
              {busy ? 'LOGGING IN...' : 'ENTER CAMPUS'}
            </PixelButton>
          </form>
        </PixelCard>
        <p className="mt-4 text-center font-crt text-fade text-lg">
          No account?{' '}
          <Link to={ROUTES.SIGNUP} className="text-sky underline cursor-pointer">
            Join the quest
          </Link>
        </p>
        <p className="mt-3 text-center font-pixel text-[6px] text-fade">
          {isFirebase ? 'CONNECTED: FIREBASE FIRESTORE' : 'DEMO MODE: LOCAL STORAGE'}
        </p>
      </div>
    </div>
  );
}
