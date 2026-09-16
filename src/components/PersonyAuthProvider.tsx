import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { setAuthTokenGetter } from '../lib/api/auth';

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

type PersonyAuthState = {
  isLoaded: boolean;
  isSignedIn: boolean;
  clerkEnabled: boolean;
};

const PersonyAuthContext = createContext<PersonyAuthState>({
  isLoaded: true,
  isSignedIn: false,
  clerkEnabled: false,
});

export function usePersonyAuth(): PersonyAuthState {
  return useContext(PersonyAuthContext);
}

function ClerkBridge({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken, isLoaded]);

  const value = useMemo(
    () => ({ isLoaded, isSignedIn: Boolean(isSignedIn), clerkEnabled: true }),
    [isLoaded, isSignedIn]
  );

  return <PersonyAuthContext.Provider value={value}>{children}</PersonyAuthContext.Provider>;
}

function DevAuthBridge({ children }: { children: React.ReactNode }) {
  const value = useMemo(
    () => ({
      isLoaded: true,
      isSignedIn: import.meta.env.DEV,
      clerkEnabled: false,
    }),
    []
  );

  return <PersonyAuthContext.Provider value={value}>{children}</PersonyAuthContext.Provider>;
}

export function PersonyAuthProvider({ children }: { children: React.ReactNode }) {
  if (!publishableKey) {
    return <DevAuthBridge>{children}</DevAuthBridge>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
      <ClerkBridge>{children}</ClerkBridge>
    </ClerkProvider>
  );
}
