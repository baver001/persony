import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { fetchAppConfig, type AppConfig } from '../lib/api/config';
import { setAuthTokenGetter } from '../lib/api/auth';

type PersonyAuthState = {
  isLoaded: boolean;
  isSignedIn: boolean;
  clerkEnabled: boolean;
  authRequired: boolean;
};

const PersonyAuthContext = createContext<PersonyAuthState>({
  isLoaded: false,
  isSignedIn: false,
  clerkEnabled: false,
  authRequired: false,
});

export function usePersonyAuth(): PersonyAuthState {
  return useContext(PersonyAuthContext);
}

function ClerkBridge({
  children,
  authRequired,
}: {
  children: React.ReactNode;
  authRequired: boolean;
}) {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    setAuthTokenGetter(async () => {
      try {
        return await getToken();
      } catch {
        return null;
      }
    });
    return () => setAuthTokenGetter(null);
  }, [getToken, isLoaded]);

  const value = useMemo(
    () => ({
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      clerkEnabled: true,
      authRequired,
    }),
    [authRequired, isLoaded, isSignedIn]
  );

  return <PersonyAuthContext.Provider value={value}>{children}</PersonyAuthContext.Provider>;
}

function DevAuthBridge({
  children,
  authRequired,
}: {
  children: React.ReactNode;
  authRequired: boolean;
}) {
  const value = useMemo(
    () => ({
      isLoaded: true,
      isSignedIn: import.meta.env.DEV && !authRequired,
      clerkEnabled: false,
      authRequired,
    }),
    [authRequired]
  );

  return <PersonyAuthContext.Provider value={value}>{children}</PersonyAuthContext.Provider>;
}

function AuthSetupRequired({ children }: { children: React.ReactNode }) {
  const value = useMemo(
    () => ({
      isLoaded: true,
      isSignedIn: false,
      clerkEnabled: false,
      authRequired: true,
    }),
    []
  );

  return (
    <PersonyAuthContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 left-4 right-4 z-[70] mx-auto max-w-lg rounded-xl border border-amber-500/40 bg-amber-950/90 px-4 py-3 text-sm text-amber-100 shadow-lg backdrop-blur">
        Для работы чата и звонков нужен Clerk: задайте{' '}
        <code className="text-amber-50">CLERK_PUBLISHABLE_KEY</code> и{' '}
        <code className="text-amber-50">CLERK_SECRET_KEY</code> в Worker.
      </div>
    </PersonyAuthContext.Provider>
  );
}

export function PersonyAuthProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    void fetchAppConfig().then(setConfig);
  }, []);

  if (!config) {
    const bootValue: PersonyAuthState = {
      isLoaded: false,
      isSignedIn: false,
      clerkEnabled: Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY),
      authRequired: !import.meta.env.DEV,
    };
    return (
      <PersonyAuthContext.Provider value={bootValue}>{children}</PersonyAuthContext.Provider>
    );
  }

  const publishableKey =
    config.clerkPublishableKey || import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

  if (publishableKey) {
    return (
      <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
        <ClerkBridge authRequired={config.authRequired}>{children}</ClerkBridge>
      </ClerkProvider>
    );
  }

  if (config.authRequired) {
    return <AuthSetupRequired>{children}</AuthSetupRequired>;
  }

  return <DevAuthBridge authRequired={config.authRequired}>{children}</DevAuthBridge>;
}
