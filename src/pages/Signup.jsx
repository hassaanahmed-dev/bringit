import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PixelCard from '../components/PixelCard';
import PixelButton from '../components/PixelButton';
import PixelInput from '../components/PixelInput';
import Logo from '../components/Logo';
import { validateSignup, isFastEmail } from '../lib/validate';
import { ROUTES } from '../lib/routes';

export default function Signup() {
  const { signup, sendVerificationEmail } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (!isFastEmail(form.email)) {
      setErrors({ email: 'USE YOUR @isb.nu.edu.pk EMAIL' });
      toast('Only FAST ISB emails can join', 'error');
      return;
    }
    const check = validateSignup(form);
    if (!check.ok) {
      setErrors({ [check.field]: check.message });
      toast(check.message, 'error');
      return;
    }

    setBusy(true);
    const { user, error } = await signup(form);
    setBusy(false);
    if (error) {
      setErrors({ [error.field]: error.message });
      toast(error.message, 'error');
      return;
    }
    await sendVerificationEmail();
    toast('Account created. Check your inbox!', 'success');
    navigate(ROUTES.VERIFY);
  };

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-8 scanlines">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <PixelCard>
          <h1 className="font-pixel text-[13px] text-cream mb-1">NEW PLAYER</h1>
          <p className="font-crt text-fade text-lg mb-5">Create your campus delivery profile.</p>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <PixelInput label="NAME" value={form.name} onChange={set('name')} error={errors.name} placeholder="e.g. Ahmed" />
            <PixelInput
              label="FAST EMAIL"
              type="email"
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              placeholder="you@isb.nu.edu.pk"
              hint={!errors.email ? 'MUST END IN @isb.nu.edu.pk' : undefined}
            />
            <PixelInput
              label="PHONE"
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              error={errors.phone}
              placeholder="03XX XXXXXXX"
            />
            <PixelInput
              label="PASSWORD"
              type="password"
              value={form.password}
              onChange={set('password')}
              error={errors.password}
              placeholder="6+ characters"
            />
            <PixelButton block type="submit" disabled={busy}>
              {busy ? 'CREATING...' : 'CREATE PLAYER'}
            </PixelButton>
          </form>
        </PixelCard>
        <p className="mt-4 text-center font-crt text-fade text-lg">
          Already playing?{' '}
          <Link to={ROUTES.LOGIN} className="text-sky underline cursor-pointer">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
