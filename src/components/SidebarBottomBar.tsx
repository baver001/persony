import React, { useState } from 'react';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  useClerk,
} from '@clerk/clerk-react';
import {
  Brain,
  Compass,
  LogOut,
  Moon,
  Plus,
  Settings2,
  ShieldAlert,
  Sun,
  User,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n, { setStoredLocale } from '../i18n';
import { updatePreferredLocale } from '../lib/api/me';
import { usePersonyAuth } from './PersonyAuthProvider';
import { useBattery } from '../hooks/useBattery';
import { BatteryIndicator } from './BatteryIndicator';
import { BatterySheet } from './BatterySheet';

type Props = {
  isDark: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenCreateModal: () => void;
  onResetDefaults?: () => void;
  compact?: boolean;
};

function MenuShell({
  isDark,
  children,
  align,
}: {
  isDark: boolean;
  children: React.ReactNode;
  align: 'left' | 'right';
}) {
  return (
    <div
      className={`absolute bottom-full mb-2 w-56 rounded-xl p-1.5 shadow-xl border z-50 text-xs ${
        align === 'left' ? 'left-0' : 'right-0'
      } ${
        isDark
          ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
          : 'bg-white border-neutral-200 text-neutral-800'
      }`}
    >
      {children}
    </div>
  );
}

function MenuItem({
  isDark,
  onClick,
  icon,
  label,
  danger,
}: {
  isDark: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-2.5 py-2 rounded-lg flex items-center gap-2 text-left transition-colors cursor-pointer ${
        danger
          ? 'text-rose-400 hover:bg-rose-500/10'
          : isDark
            ? 'hover:bg-zinc-700'
            : 'hover:bg-neutral-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export const SidebarBottomBar: React.FC<Props> = ({
  isDark,
  theme,
  onToggleTheme,
  soundEnabled,
  onToggleSound,
  onOpenCreateModal,
  onResetDefaults,
  compact = false,
}) => {
  const { t } = useTranslation(['common', 'settings', 'personas']);
  const { openUserProfile, signOut } = useClerk();
  const { clerkEnabled, isLoaded, isSignedIn } = usePersonyAuth();
  const { battery, refresh: refreshBattery } = useBattery();
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showBatterySheet, setShowBatterySheet] = useState(false);

  const closeMenus = () => {
    setShowSettingsMenu(false);
    setShowProfileMenu(false);
  };

  const go = (path: string) => {
    closeMenus();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const switchLocale = async (locale: 'en' | 'ru') => {
    setStoredLocale(locale);
    await i18n.changeLanguage(locale);
    if (isSignedIn) {
      try {
        await updatePreferredLocale(locale);
      } catch {
        // local preference still applies
      }
    }
  };

  const iconMenuBtnClass = (active: boolean) =>
    `py-touch-target p-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
      active
        ? isDark
          ? 'bg-zinc-800 text-zinc-100'
          : 'bg-neutral-100 text-neutral-900'
        : isDark
          ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
    }`;

  const currentLocale = i18n.language.startsWith('ru') ? 'ru' : 'en';

  return (
    <>
    <div
      className={`border-t shrink-0 flex min-h-[3.25rem] ${
        compact
          ? 'flex-col items-center gap-1 px-1.5 py-2'
          : 'flex-col gap-1.5 px-3 py-2.5'
      } ${isDark ? 'bg-[#18181b] border-zinc-800' : 'bg-white border-neutral-200'}`}
    >
      {isSignedIn && battery?.enabled && (
        <div className={compact ? 'w-full flex justify-center' : 'w-full'}>
          <BatteryIndicator
            battery={battery}
            compact={compact}
            onClick={() => {
              void refreshBattery();
              setShowBatterySheet(true);
            }}
          />
        </div>
      )}

      <div className={`flex w-full ${compact ? 'flex-col items-center gap-1' : 'flex-row items-center gap-2'}`}>
      <button
        type="button"
        onClick={onToggleSound}
        className={`py-touch-target p-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
          isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-neutral-100 text-neutral-600'
        }`}
        title={t('common:soundEffects')}
        aria-label={t('common:soundEffects')}
      >
        {soundEnabled ? (
          <Volume2 className="w-4 h-4 text-py-accent" />
        ) : (
          <VolumeX className="w-4 h-4 text-zinc-500" />
        )}
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowProfileMenu(false);
            setShowSettingsMenu((prev) => !prev);
          }}
          className={iconMenuBtnClass(showSettingsMenu)}
          title={t('common:settings')}
          aria-label={t('common:settings')}
        >
          <Settings2 className="w-4 h-4 shrink-0" />
        </button>

        {showSettingsMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={closeMenus} />
            <MenuShell isDark={isDark} align="left">
              <MenuItem
                isDark={isDark}
                onClick={() => {
                  closeMenus();
                  onToggleTheme();
                }}
                icon={theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                label={theme === 'dark' ? t('common:lightTheme') : t('common:darkTheme')}
              />

              <div className={`px-2.5 py-1.5 text-[11px] ${isDark ? 'text-zinc-500' : 'text-neutral-500'}`}>
                {t('settings:language')}
              </div>
              <div className="flex gap-1 px-1.5 pb-1">
                {(['en', 'ru'] as const).map((locale) => (
                  <button
                    key={locale}
                    type="button"
                    onClick={() => void switchLocale(locale)}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                      currentLocale === locale
                        ? isDark
                          ? 'bg-zinc-700 text-zinc-100'
                          : 'bg-neutral-200 text-neutral-900'
                        : isDark
                          ? 'hover:bg-zinc-700/60 text-zinc-300'
                          : 'hover:bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {locale === 'en' ? t('settings:english') : t('settings:russian')}
                  </button>
                ))}
              </div>

              <div className={`my-1 h-px ${isDark ? 'bg-zinc-700' : 'bg-neutral-200'}`} />

              <MenuItem
                isDark={isDark}
                onClick={() => {
                  closeMenus();
                  onOpenCreateModal();
                }}
                icon={<Plus className="w-3.5 h-3.5" />}
                label={t('common:createPersona')}
              />

              {onResetDefaults && (
                <MenuItem
                  isDark={isDark}
                  danger
                  onClick={() => {
                    closeMenus();
                    if (confirm(t('common:resetPersonasConfirm'))) {
                      onResetDefaults();
                    }
                  }}
                  icon={<ShieldAlert className="w-3.5 h-3.5" />}
                  label={t('common:resetPersonas')}
                />
              )}
            </MenuShell>
          </>
        )}
      </div>

      {!compact && <div className="flex-1" />}

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setShowSettingsMenu(false);
            setShowProfileMenu((prev) => !prev);
          }}
          className={iconMenuBtnClass(showProfileMenu)}
          title={t('common:profile')}
          aria-label={t('common:profile')}
        >
          <User className="w-4 h-4 shrink-0" />
        </button>

        {showProfileMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={closeMenus} />
            <MenuShell isDark={isDark} align="right">
              {!clerkEnabled || !isLoaded ? (
                <div className={`px-2.5 py-2 text-[11px] ${isDark ? 'text-zinc-500' : 'text-neutral-500'}`}>
                  {t('common:guest')}
                </div>
              ) : (
                <>
                  <SignedOut>
                    <div className="flex flex-col gap-1 p-1">
                      <SignInButton mode="modal">
                        <button
                          type="button"
                          className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                            isDark ? 'hover:bg-zinc-700 text-zinc-200' : 'hover:bg-neutral-100 text-neutral-800'
                          }`}
                        >
                          {t('common:signIn')}
                        </button>
                      </SignInButton>
                      <SignUpButton mode="modal">
                        <button
                          type="button"
                          className="w-full px-2.5 py-2 rounded-lg text-xs font-medium bg-py-accent text-white hover:opacity-90"
                        >
                          {t('common:signUp')}
                        </button>
                      </SignUpButton>
                    </div>
                  </SignedOut>

                  <SignedIn>
                    <MenuItem
                      isDark={isDark}
                      onClick={() => go('/discover')}
                      icon={<Compass className="w-3.5 h-3.5" />}
                      label={t('personas:discoverTitle')}
                    />
                    <MenuItem
                      isDark={isDark}
                      onClick={() => go('/my-personas')}
                      icon={<Users className="w-3.5 h-3.5" />}
                      label={t('personas:myPersonasTitle')}
                    />
                    <MenuItem
                      isDark={isDark}
                      onClick={() => go('/memory')}
                      icon={<Brain className="w-3.5 h-3.5" />}
                      label={t('common:memory')}
                    />
                    <MenuItem
                      isDark={isDark}
                      onClick={() => {
                        closeMenus();
                        openUserProfile();
                      }}
                      icon={<User className="w-3.5 h-3.5" />}
                      label={t('common:account')}
                    />
                    <div className={`my-1 h-px ${isDark ? 'bg-zinc-700' : 'bg-neutral-200'}`} />
                    <MenuItem
                      isDark={isDark}
                      onClick={() => {
                        closeMenus();
                        void signOut({ redirectUrl: '/' });
                      }}
                      icon={<LogOut className="w-3.5 h-3.5" />}
                      label={t('common:signOut')}
                    />
                  </SignedIn>
                </>
              )}
            </MenuShell>
          </>
        )}
      </div>
      </div>
    </div>

    <BatterySheet
      isOpen={showBatterySheet}
      onClose={() => setShowBatterySheet(false)}
      battery={battery}
    />
    </>
  );
};
