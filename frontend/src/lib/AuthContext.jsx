import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const me = await base44.auth.me();
      setUser(me);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
      setAuthError({
        type: error.status === 401 ? 'auth_required' : 'request_failed',
        message: error.message || 'Could not verify your session',
      });
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkUserAuth();
  }, [checkUserAuth]);

  const navigateToLogin = () => {
    const here = `${window.location.pathname}${window.location.search}`;
    base44.auth.redirectToLogin(here);
  };

  const logout = () => base44.auth.logout('/login');

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings: isLoadingAuth,
        authError,
        appPublicSettings: { id: 'successionpath-standalone', public_settings: {} },
        authChecked,
        checkUserAuth,
        navigateToLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};