import React, { useState } from 'react';
import {
  Search,
  Plus,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Phone,
  X,
  PanelLeftClose,
  SquarePen,
  CheckCheck,
  ShieldAlert,
  Settings2,
} from 'lucide-react';
import { Persona, ChatMessage } from '../types';
import { PersonyLogo } from './PersonyLogo';

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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const isDark = theme === 'dark';

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
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return days[d.getDay()];
  };

  return (
    <aside
      id="sidebar-container"
      className="w-full h-full flex flex-col select-none transition-colors overflow-hidden bg-py-sidebar text-py-text"
    >
      {/* 1. Header: Brand, New Persona & ChatGPT-style Sidebar Collapse Button */}
      <div
        className="p-3 border-b border-py-border flex flex-col gap-2.5 shrink-0 bg-py-sidebar"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                isDark ? 'bg-zinc-800 text-zinc-200' : 'bg-neutral-100 text-neutral-800'
              }`}
            >
              <PersonyLogo size={18} />
            </div>
            <div className="leading-tight">
              <h1 className="text-sm font-bold tracking-tight font-[family-name:var(--font-display)]">Persony</h1>
              <p className="text-[11px] text-py-text-muted">AI-собеседники</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Create Persona Button */}
            <button
              id="sidebar-create-persona-btn"
              onClick={onOpenCreateModal}
              className={`py-touch-target p-2 rounded-lg transition-colors cursor-pointer ${
                isDark
                  ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                  : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
              title="Создать нового персонажа"
            >
              <SquarePen className="w-4 h-4" />
            </button>

            {/* Collapse Sidebar Button (ChatGPT style) */}
            {onToggleSidebar && (
              <button
                id="sidebar-collapse-btn"
                onClick={onToggleSidebar}
                className={`py-touch-target p-2 rounded-lg transition-colors cursor-pointer hidden sm:inline-flex ${
                  isDark
                    ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                    : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
                }`}
                title="Свернуть панель"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-all ${
            isDark
              ? 'bg-[#27272a] border-zinc-700/60 focus-within:border-zinc-500 text-zinc-100'
              : 'bg-neutral-100 border-neutral-200 focus-within:border-neutral-400 text-neutral-900'
          }`}
        >
          <Search
            className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-zinc-400' : 'text-neutral-400'}`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск диалогов..."
            className="w-full bg-transparent focus:outline-none placeholder-zinc-500 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`py-touch-target p-1 rounded-md transition-colors ${
                isDark
                  ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                  : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Persona / Chat List */}
      <div
        id="sidebar-chats-scroll"
        className={`flex-1 overflow-y-auto overflow-x-hidden divide-y ${
          isDark ? 'divide-zinc-800/40' : 'divide-neutral-100'
        }`}
      >
        {filteredPersonas.length === 0 ? (
          <div className="p-8 text-center text-zinc-500 space-y-2.5">
            <PersonyLogo size={32} className="mx-auto opacity-40" />
            <p className="text-xs">Персонажи не найдены</p>
            <button
              onClick={onOpenCreateModal}
              className={`text-xs font-semibold hover:underline cursor-pointer ${
                isDark ? 'text-zinc-300' : 'text-neutral-800'
              }`}
            >
              Создать персонажа
            </button>
          </div>
        ) : (
          filteredPersonas.map((persona) => {
            const isSelected = selectedPersona.id === persona.id;
            const lastMsg = lastMessages[persona.id];
            const isLastMsgUser = lastMsg?.sender === 'user';
            const isCallSummary = lastMsg?.isCallSummary;

            return (
              <div
                key={persona.id}
                id={`chat-item-${persona.id}`}
                onClick={() => onSelectPersona(persona)}
                className={`group relative flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all ${
                  isSelected
                    ? isDark
                      ? 'bg-zinc-800 text-white'
                      : 'bg-neutral-100 text-neutral-900 font-medium'
                    : isDark
                    ? 'hover:bg-zinc-800/50 text-zinc-300 hover:text-white'
                    : 'hover:bg-neutral-50 text-neutral-700 hover:text-neutral-900'
                }`}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden ring-1 ring-black/10 dark:ring-white/10">
                    <img
                      src={persona.avatar}
                      alt={persona.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Online Indicator */}
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

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-sm truncate leading-tight">
                        {persona.name}
                      </span>
                      {persona.badge && (
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
                          {persona.badge}
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

                  <div className="flex items-center justify-between gap-2">
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
                          <span>Голосовой звонок</span>
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

                    {/* Quick Call Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartCall(persona);
                      }}
                      className={`py-touch-target p-2 rounded-full transition-all shrink-0 ${
                        isSelected
                          ? isDark
                            ? 'hover:bg-zinc-700 text-zinc-200'
                            : 'hover:bg-neutral-200 text-neutral-700'
                          : isDark
                          ? 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-zinc-700 text-zinc-400 hover:text-white'
                          : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-neutral-200 text-neutral-600'
                      }`}
                      title="Позвонить голосом"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Bottom Bar: Theme, Sound & Settings */}
      <div
        className={`px-3 py-2.5 border-t text-xs flex items-center justify-between shrink-0 ${
          isDark ? 'bg-[#18181b] border-zinc-800 text-zinc-400' : 'bg-neutral-50 border-neutral-200 text-neutral-600'
        }`}
      >
        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className={`py-touch-target p-2 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-neutral-200 text-neutral-600'
            }`}
            title={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className={`py-touch-target p-2 rounded-lg transition-colors cursor-pointer ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-neutral-200 text-neutral-600'
            }`}
            title="Звуковые эффекты"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-500" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-zinc-400">В сети</span>
          </div>

          {/* Settings Menu Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className={`py-touch-target p-2 rounded-lg transition-colors cursor-pointer ${
                isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200' : 'hover:bg-neutral-200 text-neutral-600'
              }`}
              title="Настройки"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {showSettingsMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowSettingsMenu(false)}
                />
                <div
                  className={`absolute bottom-full right-0 mb-2 w-52 rounded-xl p-1.5 shadow-xl border z-50 text-xs ${
                    isDark
                      ? 'bg-zinc-800 border-zinc-700 text-zinc-200'
                      : 'bg-white border-neutral-200 text-neutral-800'
                  }`}
                >
                  <button
                    onClick={() => {
                      setShowSettingsMenu(false);
                      onOpenCreateModal();
                    }}
                    className={`w-full px-2.5 py-2 rounded-lg flex items-center gap-2 text-left transition-colors cursor-pointer ${
                      isDark ? 'hover:bg-zinc-700' : 'hover:bg-neutral-100'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Создать персонажа</span>
                  </button>

                  {onResetDefaults && (
                    <button
                      onClick={() => {
                        setShowSettingsMenu(false);
                        if (confirm('Сбросить список персонажей к исходному состоянию?')) {
                          onResetDefaults();
                        }
                      }}
                      className={`w-full px-2.5 py-2 rounded-lg flex items-center gap-2 text-left transition-colors cursor-pointer text-rose-400 ${
                        isDark ? 'hover:bg-rose-500/10' : 'hover:bg-rose-50'
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Сбросить персонажей</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
};
