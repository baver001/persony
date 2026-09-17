import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ClerkProvider, useAuth } from '@clerk/clerk-react';
import { Trans, useTranslation } from 'react-i18next';
import { fetchAppConfig, type AppConfig } from '../lib/api/config';
import { setAuthTokenGetter } from '../lib/api/auth';
import { getPersonyClerkAppearance, getPersonyClerkLocalization } from '../lib/clerkAppearance';

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
        <Trans
          i18nKey="common:clerkDevWarning"
          components={{
            publishableKey: <code className="text-amber-50" />,
            secretKey: <code className="text-amber-50" />,
          }}
        />
      </div>
    </PersonyAuthContext.Provider>
  );
}

function useDocumentTheme(): 'dark' | 'light' {
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setTheme(root.classList.contains('dark') ? 'dark' : 'light');
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

export function PersonyAuthProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const theme = useDocumentTheme();
  const { t, i18n } = useTranslation(['common']);

  useEffect(() => {
    void fetchAppConfig().then(setConfig);
  }, []);

  if (!config) {
    const bootValue: PersonyAuthState = {
      isLoaded: false,
      isSignedIn: false,
      clerkEnabled: false,
      authRequired: !import.meta.env.DEV,
    };
    return (
      <PersonyAuthContext.Provider value={bootValue}>
        <div className="fixed inset-0 flex items-center justify-center bg-py-app text-py-text-muted text-sm">
          {t('common:loading')}
        </div>
      </PersonyAuthContext.Provider>
    );
  }

  const publishableKey =
    config.clerkPublishableKey || import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';

  if (publishableKey) {
    return (
      <ClerkProvider
        publishableKey={publishableKey}
        afterSignOutUrl="/"
        appearance={getPersonyClerkAppearance(theme)}
        localization={getPersonyClerkLocalization(i18n.language)}
      >
        <ClerkBridge authRequired={config.authRequired}>{children}</ClerkBridge>
      </ClerkProvider>
    );
  }

  if (config.authRequired) {
    return <AuthSetupRequired>{children}</AuthSetupRequired>;
  }

  return <DevAuthBridge authRequired={config.authRequired}>{children}</DevAuthBridge>;
}
