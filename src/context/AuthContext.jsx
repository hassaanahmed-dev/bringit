import { createContext, useContext, useState, useEffect } from 'react';
import { auth, isFirebase } from '../lib/backend';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [revoked, setRevoked] = useState(false);

  useEffect(() => {
    let active = true;
    auth.getCurrentUser().then(
      (u) => {
        if (active) setUser(u);
      },
      (e) => {
        // Transient network blip — let the state-change listener settle it.
        console.warn('[auth] initial session lookup failed', e);
      },
    );
    const unsub = auth.onAuthStateChange(
      (u) => {
        if (!active) return;
        setUser(u);
        setReady(true);
      },
      () => {
        if (!active) return;
        setUser(null);
        setReady(true);
        setRevoked(true);
      },
    );
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const value = {
    user,
    ready,
    revoked,
    clearRevoked: () => setRevoked(false),
    isFirebase,
    login: auth.login,
    signup: auth.signup,
    logout: auth.logout,
    sendVerificationEmail: auth.sendVerificationEmail,
    simulateVerification: auth.simulateVerification,
    refreshVerificationStatus: auth.refreshVerificationStatus,
    updateProfile: auth.updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
