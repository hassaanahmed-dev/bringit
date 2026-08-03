import { createContext, useContext, useState, useEffect } from 'react';
import { auth, isFirebase } from '../lib/backend';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    auth.getCurrentUser().then((u) => {
      if (active) setUser(u);
    });
    const unsub = auth.onAuthStateChange((u) => {
      if (!active) return;
      setUser(u);
      setReady(true);
    });
    return () => {
      active = false;
      unsub();
    };
  }, []);

  const value = {
    user,
    ready,
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
