import React from 'react';
import { useClerk } from '@clerk/clerk-react';
import { Brain, LogOut, Settings, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type SidebarAccountActionsProps = {
  isDark: boolean;
  onClose: () => void;
};

export const SidebarAccountActions: React.FC<SidebarAccountActionsProps> = ({
  isDark,
  onClose,
}) => {
  const { openUserProfile, signOut } = useClerk();
  const { t } = useTranslation('common');

  const go = (path: string) => {
    onClose();
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <>
      <button
        type="button"
        onClick={() => go('/memory')}
        className={`w-full px-2.5 py-2 rounded-lg flex items-center gap-2 text-left transition-colors cursor-pointer ${
          isDark ? 'hover:bg-zinc-700' : 'hover:bg-neutral-100'
        }`}
      >
        <Brain className="w-3.5 h-3.5" />
        <span>{t('memory')}</span>
      </button>
      <button
        type="button"
        onClick={() => go('/settings')}
        className={`w-full px-2.5 py-2 rounded-lg flex items-center gap-2 text-left transition-colors cursor-pointer ${
          isDark ? 'hover:bg-zinc-700' : 'hover:bg-neutral-100'
        }`}
      >
        <Settings className="w-3.5 h-3.5" />
        <span>{t('settings')}</span>
      </button>
      <button
        type="button"
        onClick={() => {
          onClose();
          openUserProfile();
        }}
        className={`w-full px-2.5 py-2 rounded-lg flex items-center gap-2 text-left transition-colors cursor-pointer ${
          isDark ? 'hover:bg-zinc-700' : 'hover:bg-neutral-100'
        }`}
      >
        <User className="w-3.5 h-3.5" />
        <span>Аккаунт</span>
      </button>
      <button
        type="button"
        onClick={() => {
          onClose();
          void signOut({ redirectUrl: '/' });
        }}
        className={`w-full px-2.5 py-2 rounded-lg flex items-center gap-2 text-left transition-colors cursor-pointer ${
          isDark ? 'hover:bg-zinc-700 text-zinc-300' : 'hover:bg-neutral-100 text-neutral-700'
        }`}
      >
        <LogOut className="w-3.5 h-3.5" />
        <span>Выйти</span>
      </button>
      <div className={`my-1 h-px ${isDark ? 'bg-zinc-700' : 'bg-neutral-200'}`} />
    </>
  );
};
