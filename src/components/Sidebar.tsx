import React, { useEffect, useRef, useState } from 'react';
import {
  Search,
  Phone,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  SquarePen,
  CheckCheck,
  Compass,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Persona, ChatMessage } from '../types';
import { SidebarBottomBar } from './SidebarBottomBar';
import { SidebarBatteryControl } from './SidebarBatteryControl';

interface SidebarProps {
  personas: Persona[];
  selectedPersona: Persona;
  onSelectPersona: (persona: Persona) => void;
  onOpenCreateModal: () => void;
  onStartCall: (persona: Persona) => void;
  lastMessages: Record<string, ChatMessage | undefined>;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onResetDefaults?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  isCollapsed?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  personas,
  selectedPersona,
  onSelectPersona,
  onOpenCreateModal,
  onStartCall,
  lastMessages,
  theme,
  onToggleTheme,
  soundEnabled,
  onToggleSound,
  onResetDefaults,
  onToggleSidebar,
  isCollapsed = false,
}) => {
  const { t, i18n } = useTranslation(['common', 'chat', 'personas']);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)').matches : true
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const isDark = theme === 'dark';
  const locale = i18n.language.startsWith('ru') ? 'ru-RU' : 'en-US';

  const filteredPersonas = personas.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.tagline.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.badge && p.badge.toLowerCase().includes(q))
    );
  });

  const formatMessageTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString(locale, { weekday: 'short' });
  };

  const personaBadge = (persona: Persona) => {
    if (!persona.badge || persona.isOfficial || persona.badge === 'AI Persona') return null;
    if (persona.badge === 'Custom') return t('common:customBadge');
    return persona.badge;
  };

  const railIconBtn = (active = false) =>
    `py-touch-target p-2 rounded-lg transition-colors cursor-pointer ${
      active
        ? isDark
          ? 'bg-zinc-800 text-zinc-100'
          : 'bg-neutral-100 text-neutral-900'
        : isDark
          ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
          : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
    }`;

  if (isCollapsed && isDesktop) {
    return (
      <aside
        id="sidebar-container"
        className="w-full h-full flex flex-col select-none transition-colors overflow-hidden bg-py-sidebar text-py-text"
      >
        <div className="p-2 border-b border-py-border flex flex-col items-center gap-1 shrink-0">
          <SidebarBatteryControl />
          {onToggleSidebar && isDesktop && (
            <button
              id="sidebar-expand-btn"
              type="button"
              onClick={onToggleSidebar}
              className={railIconBtn()}
              title={t('chat:expandSidebar')}
              aria-label={t('chat:expandSidebar')}
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenCreateModal}
            className={railIconBtn()}
            title={t('common:createNewPersona')}
            aria-label={t('common:createNewPersona')}
          >
            <SquarePen className="w-4 h-4" />
          </button>
        </div>

        <div
          id="sidebar-chats-scroll"
          className="flex-1 overflow-y-auto overflow-x-hidden py-2 flex flex-col items-center gap-1"
        >
          {filteredPersonas.map((persona) => {
            const isSelected = selectedPersona.id === persona.id;
            return (
              <button
                key={persona.id}
                type="button"
                id={`chat-item-${persona.id}`}
                onClick={() => onSelectPersona(persona)}
                title={persona.name}
                aria-label={persona.name}
                className={`relative rounded-xl p-0.5 transition-all cursor-pointer ${
                  isSelected
                    ? isDark
                      ? 'ring-2 ring-py-accent/70 bg-zinc-800'
                      : 'ring-2 ring-py-accent/60 bg-neutral-100'
                    : isDark
                      ? 'hover:bg-zinc-800/60'
                      : 'hover:bg-neutral-100'
                }`}
              >
                <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-black/10 dark:ring-white/10">
                  <img
                    src={persona.avatar}
                    alt=""
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span
                  className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ring-2 ${
                    isSelected
                      ? isDark
                        ? 'ring-zinc-800 bg-emerald-400'
                        : 'ring-neutral-100 bg-emerald-500'
                      : isDark
                        ? 'ring-[#18181b] bg-emerald-500'
                        : 'ring-white bg-emerald-500'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <SidebarBottomBar
          isDark={isDark}
          theme={theme}
          onToggleTheme={onToggleTheme}
          soundEnabled={soundEnabled}
          onToggleSound={onToggleSound}
          onOpenCreateModal={onOpenCreateModal}
          onResetDefaults={onResetDefaults}
          compact
        />
      </aside>
    );
  }

  return (
    <aside
      id="sidebar-container"
      className="w-full h-full flex flex-col select-none transition-colors overflow-hidden bg-py-sidebar text-py-text"
    >
      <div
        className="p-3 border-b border-py-border flex flex-col gap-2 shrink-0 bg-py-sidebar"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <SidebarBatteryControl className="shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-tight font-[family-name:var(--font-display)]">Persony</h1>
              <p className="text-[11px] text-py-text-muted truncate">{t('common:sidebarSubtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              id="sidebar-search-btn"
              type="button"
              onClick={() => setIsSearchOpen((prev) => !prev)}
              className={`py-touch-target p-2 rounded-lg transition-colors cursor-pointer ${
                isSearchOpen
                  ? isDark
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'bg-neutral-100 text-neutral-900'
                  : isDark
                    ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                    : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
              title={t('common:searchChats')}
              aria-label={t('common:searchChats')}
              aria-expanded={isSearchOpen}
            >
              <Search className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => navigateTo('/discover')}
              className={`py-touch-target p-2 rounded-lg transition-colors cursor-pointer ${
                isDark
                  ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                  : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
              title={t('personas:discoverTitle')}
              aria-label={t('personas:discoverTitle')}
            >
              <Compass className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => navigateTo('/my-personas')}
              className={`py-touch-target p-2 rounded-lg transition-colors cursor-pointer ${
                isDark
                  ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                  : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
              title={t('personas:myPersonasTitle')}
              aria-label={t('personas:myPersonasTitle')}
            >
              <Users className="w-4 h-4" />
            </button>

            <button
              id="sidebar-create-persona-btn"
              type="button"
              onClick={onOpenCreateModal}
              className={`py-touch-target p-2 rounded-lg transition-colors cursor-pointer ${
                isDark
                  ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                  : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
              title={t('common:createNewPersona')}
              aria-label={t('common:createNewPersona')}
            >
              <SquarePen className="w-4 h-4" />
            </button>

            {onToggleSidebar && isDesktop && (
              <button
                id="sidebar-collapse-btn"
                type="button"
                onClick={onToggleSidebar}
                className={`py-touch-target p-2 rounded-lg transition-colors cursor-pointer ${
                  isDark
                    ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                    : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                }`}
                title={t('chat:collapseSidebar')}
                aria-label={t('chat:collapseSidebar')}
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {isSearchOpen && (
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all bg-py-input border-py-border focus-within:border-py-text-muted text-py-text`}
          >
            <Search
              className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-zinc-400' : 'text-neutral-400'}`}
            />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('common:searchChats')}
              className="w-full bg-transparent focus:outline-none placeholder-zinc-500 text-xs"
            />
            <button
              type="button"
              onClick={closeSearch}
              className={`py-touch-target p-1 rounded-md transition-colors ${
                isDark
                  ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200'
              }`}
              aria-label={t('common:cancel')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div
        id="sidebar-chats-scroll"
        className={`flex-1 overflow-y-auto overflow-x-hidden divide-y ${
          isDark ? 'divide-zinc-800/40' : 'divide-neutral-100'
        }`}
      >
        {filteredPersonas.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 space-y-2.5">
            <p className="text-xs">{t('common:noPersonasFound')}</p>
            <button
              onClick={onOpenCreateModal}
              className={`text-xs font-semibold hover:underline cursor-pointer ${
                isDark ? 'text-zinc-300' : 'text-neutral-800'
              }`}
            >
              {t('common:createPersona')}
            </button>
          </div>
        ) : (
          filteredPersonas.map((persona) => {
            const isSelected = selectedPersona.id === persona.id;
            const lastMsg = lastMessages[persona.id];
            const isLastMsgUser = lastMsg?.sender === 'user';
            const isCallSummary = lastMsg?.isCallSummary;
            const badge = personaBadge(persona);

            return (
              <div
                key={persona.id}
                id={`chat-item-${persona.id}`}
                onClick={() => onSelectPersona(persona)}
                className={`group relative flex items-center gap-3 px-3 py-3 cursor-pointer transition-all ${
                  isSelected
                    ? isDark
                      ? 'bg-zinc-800 text-white'
                      : 'bg-neutral-100 text-neutral-900 font-medium'
                    : isDark
                    ? 'hover:bg-zinc-800/50 text-zinc-300 hover:text-white'
                    : 'hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900'
                }`}
              >
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden ring-1 ring-black/10 dark:ring-white/10">
                    <img
                      src={persona.avatar}
                      alt={persona.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ${
                      isSelected
                        ? isDark
                          ? 'ring-zinc-800 bg-emerald-400'
                          : 'ring-neutral-100 bg-emerald-500'
                        : isDark
                        ? 'ring-[#18181b] bg-emerald-500'
                        : 'ring-white bg-emerald-500'
                    }`}
                  />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 pr-9">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-sm truncate leading-tight">
                        {persona.name}
                      </span>
                      {badge && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-medium truncate shrink-0 ${
                            isSelected
                              ? isDark
                                ? 'bg-zinc-700 text-zinc-200'
                                : 'bg-neutral-200 text-neutral-800'
                              : isDark
                              ? 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
                              : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                    </div>

                    <span
                      className={`text-[11px] shrink-0 ${
                        isSelected
                          ? isDark
                            ? 'text-zinc-300'
                            : 'text-neutral-600'
                          : 'text-zinc-500'
                      }`}
                    >
                      {lastMsg ? formatMessageTime(lastMsg.timestamp) : persona.voice}
                    </span>
                  </div>

                  <p
                    className={`text-xs truncate leading-snug flex items-center gap-1 ${
                      isSelected
                        ? isDark
                          ? 'text-zinc-300'
                          : 'text-neutral-600'
                        : 'text-zinc-500'
                    }`}
                  >
                    {isCallSummary ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Phone className="w-3 h-3" />
                        <span>{t('common:voiceCallPreview')}</span>
                      </span>
                    ) : lastMsg ? (
                      <>
                        {isLastMsgUser && (
                          <CheckCheck
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isSelected ? 'text-zinc-200' : 'text-zinc-400'
                            }`}
                          />
                        )}
                        <span className="truncate">{lastMsg.text}</span>
                      </>
                    ) : (
                      <span className="truncate italic opacity-75">{persona.tagline}</span>
                    )}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStartCall(persona);
                  }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 py-touch-target p-2 rounded-full transition-all shrink-0 hidden sm:inline-flex ${
                    isSelected
                      ? isDark
                        ? 'hover:bg-zinc-700 text-zinc-200'
                        : 'hover:bg-neutral-200 text-neutral-700'
                      : isDark
                      ? 'opacity-0 group-hover:opacity-100 hover:bg-zinc-700 text-zinc-400 hover:text-white'
                      : 'opacity-0 group-hover:opacity-100 hover:bg-neutral-200 text-neutral-600'
                  }`}
                  title={t('common:callVoice')}
                  aria-label={t('common:callVoice')}
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      <SidebarBottomBar
        isDark={isDark}
        theme={theme}
        onToggleTheme={onToggleTheme}
        soundEnabled={soundEnabled}
        onToggleSound={onToggleSound}
        onOpenCreateModal={onOpenCreateModal}
        onResetDefaults={onResetDefaults}
      />
    </aside>
  );
};
