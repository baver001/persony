import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, MessageCircle, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  DISCOVER_SECTIONS,
  type DiscoverSectionId,
} from '../../shared/personas/discover-sections';
import type { Persona } from '../types';
import { fetchAvailablePersonas, installPersona, PersonasApiError } from '../lib/api/personas';
import { fetchInstalledPersonas } from '../lib/api/me';
import {
  applyLocaleToPersonas,
  formatPersonaBadge,
} from '../utils/personaPresentation';

type Props = {
  theme: 'dark' | 'light';
  onBack: () => void;
  onStartChat: (persona: Persona) => void;
};

type DiscoverFilter = 'all' | DiscoverSectionId;

const FILTER_ORDER: DiscoverFilter[] = [
  'all',
  'featured',
  'development',
  'business',
  'thinking',
  'creative',
  'lifestyle',
];

function personaMatchesQuery(persona: Persona, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    persona.name.toLowerCase().includes(q) ||
    persona.tagline.toLowerCase().includes(q) ||
    persona.description.toLowerCase().includes(q) ||
    (persona.badge?.toLowerCase().includes(q) ?? false) ||
    persona.voice.toLowerCase().includes(q)
  );
}

function uniquePersonas(personas: Persona[]) {
  const seen = new Set<string>();
  return personas.filter((persona) => {
    if (seen.has(persona.id)) return false;
    seen.add(persona.id);
    return true;
  });
}

export function DiscoverPage({ theme, onBack, onStartChat }: Props) {
  const { t, i18n } = useTranslation(['personas', 'common']);
  const [rawPersonas, setRawPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const personas = useMemo(
    () => applyLocaleToPersonas(rawPersonas, i18n.language),
    [rawPersonas, i18n.language]
  );
  const [installedIds, setInstalledIds] = useState<Set<string>>(() => new Set());
  const [actionId, setActionId] = useState<string | null>(null);
  const [installErrorId, setInstallErrorId] = useState<string | null>(null);
  const [installAuthRequiredId, setInstallAuthRequiredId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<DiscoverFilter>('all');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isDark = theme === 'dark';

  const loadGallery = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [gallery, installed] = await Promise.all([
        fetchAvailablePersonas(),
        fetchInstalledPersonas().catch(() => []),
      ]);
      setRawPersonas(gallery);
      setInstalledIds(new Set(installed.map((p) => p.id)));
    } catch (err) {
      if (err instanceof PersonasApiError && err.status === 401) {
        setRawPersonas([]);
      } else {
        setLoadError(true);
        setRawPersonas([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGallery();
  }, []);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  const personaById = useMemo(
    () => new Map(personas.map((persona) => [persona.id, persona])),
    [personas]
  );

  const searchablePersonas = useMemo(
    () => personas.filter((persona) => personaMatchesQuery(persona, searchQuery)),
    [personas, searchQuery]
  );

  const filteredPersonas = useMemo(() => {
    if (activeFilter === 'all') return uniquePersonas(searchablePersonas);

    const section = DISCOVER_SECTIONS.find((item) => item.id === activeFilter);
    if (!section) return [];

    return uniquePersonas(
      section.personaIds
        .map((id) => personaById.get(id))
        .filter((persona): persona is Persona => Boolean(persona))
        .filter((persona) => personaMatchesQuery(persona, searchQuery))
    );
  }, [activeFilter, personaById, searchablePersonas, searchQuery]);

  const communityPersonas = useMemo(
    () =>
      uniquePersonas(
        searchablePersonas.filter((persona) => !persona.isOfficial)
      ),
    [searchablePersonas]
  );

  const groupedSections = useMemo(() => {
    if (activeFilter !== 'all' || searchQuery.trim()) return [];

    return DISCOVER_SECTIONS.map((section) => ({
      ...section,
      personas: uniquePersonas(
        section.personaIds
          .map((id) => personaById.get(id))
          .filter((persona): persona is Persona => Boolean(persona))
      ),
    })).filter((section) => section.personas.length > 0);
  }, [activeFilter, personaById, searchQuery]);

  const handlePersonaAction = async (persona: Persona) => {
    if (installedIds.has(persona.id)) {
      onStartChat(persona);
      return;
    }

    setActionId(persona.id);
    setInstallErrorId(null);
    setInstallAuthRequiredId(null);
    try {
      await installPersona(persona.id);
      setInstalledIds((prev) => new Set(prev).add(persona.id));
      onStartChat(persona);
    } catch (err) {
      if (err instanceof PersonasApiError && err.status === 401) {
        setInstallAuthRequiredId(persona.id);
      } else {
        setInstallErrorId(persona.id);
      }
    } finally {
      setActionId(null);
    }
  };

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const toggleSearch = () => {
    if (isSearchOpen) {
      closeSearch();
      return;
    }
    setIsSearchOpen(true);
  };

  const toolbarBtnClass = (active = false) =>
    `py-touch-target p-2 rounded-lg transition-colors ${
      active
        ? isDark
          ? 'bg-zinc-800 text-zinc-100'
          : 'bg-neutral-100 text-neutral-900'
        : isDark
          ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
          : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
    }`;

  const filterChipClass = (active: boolean) =>
    `px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
      active
        ? 'bg-py-accent/15 text-py-accent border-py-accent/35'
        : isDark
          ? 'bg-py-elevated text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
          : 'bg-white text-neutral-600 border-neutral-200 hover:text-neutral-900 hover:border-neutral-300'
    }`;

  const renderCard = (persona: Persona) => {
    const badge = formatPersonaBadge(persona, t);
    return (
    <article
      key={persona.id}
      className="py-surface-card p-3 flex flex-col gap-2.5 transition-colors hover:border-py-accent/25"
    >
      <div className="flex items-start gap-2.5 min-w-0">
        <img
          src={persona.avatar}
          alt=""
          className="w-12 h-12 rounded-xl object-cover ring-1 ring-py-border shrink-0"
          referrerPolicy="no-referrer"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-tight truncate">{persona.name}</h3>
            <div className="flex flex-col items-end gap-1 shrink-0 max-w-[42%]">
              {installedIds.has(persona.id) && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 truncate">
                  {t('personas:discoverInstalled')}
                </span>
              )}
              {badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-py-accent/15 text-py-accent truncate">
                  {badge}
                </span>
              )}
            </div>
          </div>
          <p className="text-[11px] text-py-text-secondary mt-0.5 line-clamp-1">{persona.tagline}</p>
        </div>
      </div>

      <p className="text-[11px] text-py-text-muted line-clamp-2 leading-relaxed">
        {persona.description}
      </p>

      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-md ${
            isDark ? 'bg-zinc-800/80 text-zinc-400' : 'bg-neutral-100 text-neutral-600'
          }`}
        >
          {persona.voice}
        </span>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            disabled={actionId === persona.id}
            onClick={() => void handlePersonaAction(persona)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-py-accent text-white hover:opacity-90 disabled:opacity-50"
          >
            <MessageCircle className="w-3 h-3" />
            {actionId === persona.id
              ? t('personas:discoverInstalling')
              : installedIds.has(persona.id)
                ? t('personas:discoverOpen')
                : t('personas:startChat')}
          </button>
          {installAuthRequiredId === persona.id && (
            <span className="text-[10px] text-py-accent max-w-[9rem] text-right leading-tight">
              {t('personas:discoverSignInToInstall')}
            </span>
          )}
          {installErrorId === persona.id && (
            <span className="text-[10px] text-rose-400 max-w-[9rem] text-right leading-tight">
              {t('personas:discoverInstallFailed')}
            </span>
          )}
        </div>
      </div>
    </article>
    );
  };

  const showGrouped = activeFilter === 'all' && !searchQuery.trim();
  const searchActive = isSearchOpen || Boolean(searchQuery.trim());

  return (
    <div className="h-dvh overflow-y-auto overscroll-y-contain bg-py-chat text-py-text">
      <div className="py-chat-thread pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onBack}
            className={toolbarBtnClass()}
            aria-label={t('common:back')}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0 px-1">
            <h1 className="text-sm font-semibold tracking-tight truncate">
              {t('personas:discoverPageTitle')}
            </h1>
            {!loading && (
              <p className="text-[11px] text-py-text-muted truncate">
                {t('personas:discoverResultsCount', { count: filteredPersonas.length })}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={toggleSearch}
            className={toolbarBtnClass(searchActive)}
            aria-label={t('personas:discoverSearchToggle')}
            aria-expanded={searchActive}
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {isSearchOpen && (
          <div
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${
              isDark
                ? 'bg-py-input border-zinc-800 focus-within:border-zinc-600'
                : 'bg-white border-neutral-200 focus-within:border-neutral-400'
            }`}
          >
            <Search className="w-3.5 h-3.5 shrink-0 text-py-text-muted" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('personas:discoverSearchPlaceholder')}
              className="w-full bg-transparent focus:outline-none placeholder:text-py-text-muted text-xs"
            />
            <button
              type="button"
              onClick={closeSearch}
              className="py-touch-target p-1 rounded-md text-py-text-muted hover:text-py-text transition-colors"
              aria-label={t('common:cancel')}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t('personas:discoverCategoriesLabel')}>
          {FILTER_ORDER.map((filter) => (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={activeFilter === filter}
              onClick={() => setActiveFilter(filter)}
              className={filterChipClass(activeFilter === filter)}
            >
              {filter === 'all'
                ? t('personas:discoverFilterAll')
                : t(`personas:discoverSection.${filter}`)}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-py-text-muted py-4">{t('common:loading')}</p>
        ) : loadError ? (
          <div className="py-surface-card p-5 text-center space-y-3">
            <p className="text-sm text-py-text-secondary">{t('personas:discoverError')}</p>
            <button
              type="button"
              onClick={() => void loadGallery()}
              className="inline-flex px-4 py-2 rounded-full text-xs font-semibold bg-py-accent text-white hover:opacity-90"
            >
              {t('personas:discoverRetry')}
            </button>
          </div>
        ) : filteredPersonas.length === 0 ? (
          <div className="py-surface-card p-5 text-center space-y-2">
            <p className="text-sm text-py-text-secondary">{t('personas:discoverEmpty')}</p>
            {(searchQuery || activeFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                  setIsSearchOpen(false);
                }}
                className="text-xs font-semibold text-py-accent hover:opacity-80"
              >
                {t('personas:discoverResetFilters')}
              </button>
            )}
          </div>
        ) : showGrouped ? (
          <div className="space-y-5">
            {groupedSections.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-[11px] font-semibold tracking-wide text-py-text-secondary uppercase px-0.5">
                  {t('personas:discoverOfficialTitle')}
                </h2>
                {groupedSections.map((section) => (
                  <div key={section.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 px-0.5">
                      <h3 className="text-[11px] font-medium text-py-text-muted">
                        {t(`personas:discoverSection.${section.id}`)}
                      </h3>
                      <span className="text-[10px] text-py-text-muted">{section.personas.length}</span>
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {section.personas.map(renderCard)}
                    </div>
                  </div>
                ))}
              </section>
            )}
            {communityPersonas.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-3 px-0.5">
                  <h2 className="text-[11px] font-semibold tracking-wide text-py-text-secondary uppercase">
                    {t('personas:discoverCommunityTitle')}
                  </h2>
                  <span className="text-[10px] text-py-text-muted">{communityPersonas.length}</span>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {communityPersonas.map(renderCard)}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">{filteredPersonas.map(renderCard)}</div>
        )}
      </div>
    </div>
  );
}
