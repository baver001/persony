import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ImagePlus, Link2, MoreHorizontal, Plus, Share2, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Persona } from '../types';
import {
  deletePersonaOnCloud,
  fetchMyPersonas,
  PersonasApiError,
  updatePersonaOnCloud,
} from '../lib/api/personas';
import { copyPersonaShareLink } from '../lib/sharePersona';
import { usePersonyAuth } from '../components/PersonyAuthProvider';

type Props = {
  theme: 'dark' | 'light';
  onBack: () => void;
  onStartChat: (persona: Persona) => void;
  onCreatePersona: () => void;
  onEditPersona: (persona: Persona) => void;
  onDuplicatePersona: (persona: Persona) => void;
  onChangeAvatar: (persona: Persona) => void;
};

export function MyPersonasPage({
  theme,
  onBack,
  onStartChat,
  onCreatePersona,
  onEditPersona,
  onDuplicatePersona,
  onChangeAvatar,
}: Props) {
  const { t } = useTranslation(['personas', 'common']);
  const { isSignedIn, apiAuthReady, clerkEnabled, isLoaded: isAuthLoaded } = usePersonyAuth();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [menuPersonaId, setMenuPersonaId] = useState<string | null>(null);
  const [shareNoticeId, setShareNoticeId] = useState<string | null>(null);
  const [visibilityUpdatingId, setVisibilityUpdatingId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const isDark = theme === 'dark';

  const canFetch = !clerkEnabled || (isAuthLoaded && isSignedIn && apiAuthReady);

  const load = useCallback(async () => {
    if (!canFetch) return;
    setLoading(true);
    setError(false);
    setAuthRequired(false);
    try {
      const mine = await fetchMyPersonas();
      setPersonas(mine.filter((persona) => persona.isCustom));
    } catch (err) {
      if (err instanceof PersonasApiError && err.status === 401) {
        setPersonas([]);
        setAuthRequired(true);
      } else {
        setError(true);
        setPersonas([]);
      }
    } finally {
      setLoading(false);
    }
  }, [canFetch]);

  useEffect(() => {
    if (!isAuthLoaded) return;
    if (!canFetch) {
      setLoading(false);
      setPersonas([]);
      setAuthRequired(clerkEnabled && isAuthLoaded && !isSignedIn);
      return;
    }
    void load();
  }, [canFetch, isAuthLoaded, isSignedIn, load]);

  useEffect(() => {
    if (!menuPersonaId) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuPersonaId(null);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [menuPersonaId]);

  const handleDelete = async (persona: Persona) => {
    setMenuPersonaId(null);
    if (!confirm(t('personas:deletePersonaConfirm', { name: persona.name }))) return;
    setDeletingId(persona.id);
    const ok = await deletePersonaOnCloud(persona.id);
    setDeletingId(null);
    if (ok) {
      setPersonas((prev) => prev.filter((p) => p.id !== persona.id));
    }
  };

  const handleVisibilityChange = async (
    persona: Persona,
    visibility: 'private' | 'unlisted' | 'public'
  ) => {
    if (persona.visibility === visibility) {
      setMenuPersonaId(null);
      return;
    }
    setVisibilityUpdatingId(persona.id);
    const updated = await updatePersonaOnCloud({ ...persona, visibility });
    setVisibilityUpdatingId(null);
    setMenuPersonaId(null);
    if (updated) {
      setPersonas((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    }
  };

  const handleShare = async (persona: Persona) => {
    setMenuPersonaId(null);
    if (persona.visibility === 'private') {
      setShareNoticeId(persona.id);
      window.setTimeout(() => setShareNoticeId(null), 2500);
      return;
    }
    const ok = await copyPersonaShareLink(persona.id);
    if (ok) {
      setShareNoticeId(persona.id);
      window.setTimeout(() => setShareNoticeId(null), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-py-chat text-py-text px-4 py-8 sm:py-12">
      <div className="py-chat-thread space-y-8">
        <header className="space-y-4">
          <button
            type="button"
            onClick={onBack}
            className={`inline-flex items-center gap-1.5 text-xs transition-colors ${
              isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('common:back')}
          </button>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                {t('personas:myPersonasTitle')}
              </h1>
              <p className="text-sm text-py-text-secondary max-w-lg leading-relaxed">
                {t('personas:myPersonasSubtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={onCreatePersona}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-py-accent text-white hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('common:createPersona')}
            </button>
          </div>
        </header>

        {loading ? (
          <p className="text-sm text-py-text-muted">{t('common:loading')}</p>
        ) : error ? (
          <div className="py-surface-card p-6 text-center space-y-3">
            <p className="text-sm text-py-text-secondary">{t('personas:myPersonasError')}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex px-4 py-2 rounded-full text-xs font-semibold bg-py-accent text-white hover:opacity-90"
            >
              {t('personas:myPersonasRetry')}
            </button>
          </div>
        ) : authRequired ? (
          <div className="py-surface-card p-6 text-center space-y-3">
            <p className="text-sm text-py-text-secondary">{t('personas:myPersonasSignIn')}</p>
          </div>
        ) : personas.length === 0 ? (
          <div className="py-surface-card p-6 text-center space-y-3">
            <p className="text-sm text-py-text-secondary">{t('personas:myPersonasEmpty')}</p>
            <button
              type="button"
              onClick={onCreatePersona}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-py-accent text-white hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('personas:createTitle')}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {personas.map((persona) => (
              <article
                key={persona.id}
                className="py-surface-card p-4 flex gap-4 transition-colors hover:border-py-text-muted"
              >
                <img
                  src={persona.avatar}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover ring-1 ring-py-border shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{persona.name}</h3>
                      <p className="text-xs text-py-text-secondary truncate">{persona.tagline}</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-py-text-muted shrink-0">
                      {persona.visibility || 'private'}
                    </span>
                  </div>
                  <p className="text-xs text-py-text-muted mt-2 line-clamp-2 leading-relaxed">
                    {persona.description}
                  </p>
                  {shareNoticeId === persona.id && (
                    <p className="text-[10px] text-py-accent mt-1">
                      {persona.visibility === 'private'
                        ? t('personas:myPersonasSharePrivate')
                        : t('personas:myPersonasShareCopied')}
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onStartChat(persona)}
                      className="px-4 py-2 rounded-full text-xs font-semibold bg-py-accent text-white hover:opacity-90"
                    >
                      {t('personas:startChat')}
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditPersona(persona)}
                      className="px-3 py-2 rounded-full text-xs font-medium border border-py-border hover:border-py-text-muted"
                    >
                      {t('personas:editTitle')}
                    </button>
                    <div className="relative" ref={menuPersonaId === persona.id ? menuRef : null}>
                      <button
                        type="button"
                        onClick={() =>
                          setMenuPersonaId((prev) => (prev === persona.id ? null : persona.id))
                        }
                        disabled={deletingId === persona.id}
                        className="p-2 rounded-full text-py-text-muted hover:text-py-text border border-transparent hover:border-py-border disabled:opacity-50"
                        aria-label={t('personas:myPersonasMenu')}
                        aria-expanded={menuPersonaId === persona.id}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {menuPersonaId === persona.id && (
                        <div
                          className={`absolute right-0 bottom-full mb-1 z-20 min-w-[11rem] rounded-xl border py-1 shadow-lg ${
                            isDark
                              ? 'bg-zinc-900 border-zinc-700'
                              : 'bg-white border-neutral-200'
                          }`}
                        >
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-white/5"
                            onClick={() => {
                              setMenuPersonaId(null);
                              onChangeAvatar(persona);
                            }}
                          >
                            <ImagePlus className="w-3.5 h-3.5" />
                            {t('personas:myPersonasChangeAvatar')}
                          </button>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-white/5"
                            onClick={() => void handleShare(persona)}
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            {t('personas:myPersonasShare')}
                          </button>
                          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wide text-py-text-muted">
                            {t('personas:myPersonasChangeVisibility')}
                          </div>
                          {(['private', 'unlisted', 'public'] as const).map((visibility) => (
                            <button
                              key={visibility}
                              type="button"
                              disabled={visibilityUpdatingId === persona.id}
                              className={`w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-white/5 disabled:opacity-50 ${
                                persona.visibility === visibility ? 'text-py-accent' : ''
                              }`}
                              onClick={() => void handleVisibilityChange(persona, visibility)}
                            >
                              <Link2 className="w-3.5 h-3.5 opacity-60" />
                              {t(`personas:visibility_${visibility}`)}
                              {persona.visibility === visibility && (
                                <span className="ml-auto text-[10px]">✓</span>
                              )}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-white/5"
                            onClick={() => {
                              setMenuPersonaId(null);
                              onDuplicatePersona(persona);
                            }}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {t('personas:myPersonasDuplicate')}
                          </button>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 text-rose-400 hover:bg-rose-500/10"
                            onClick={() => void handleDelete(persona)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {t('personas:deletePersona')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
