import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Phone,
  Trash2,
  Edit3,
  ImagePlus,
  Sparkles,
  Mic,
  Share2,
  Terminal,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Persona } from '../types';
import { getLocalizedPersonaPresentation } from '../utils/personaPresentation';
import { AvatarStudioModal } from './AvatarStudioModal';
import { fetchRelationshipProfile } from '../lib/api/relationship';
import { copyPersonaShareLink } from '../lib/sharePersona';
import { usePersonyAuth } from './PersonyAuthProvider';

interface PersonaProfileDrawerProps {
  character: Persona | null;
  isOpen: boolean;
  onClose: () => void;
  onCall: (character: Persona) => void;
  onEdit: (character: Persona) => void;
  onDelete?: (characterId: string) => void;
  onClearChat?: (characterId: string) => void;
  onAvatarChange?: (character: Persona, avatar: string) => void;
}

export const PersonaProfileDrawer: React.FC<PersonaProfileDrawerProps> = ({
  character,
  isOpen,
  onClose,
  onCall,
  onEdit,
  onDelete,
  onClearChat,
  onAvatarChange,
}) => {
  const { t, i18n } = useTranslation(['personas', 'common', 'chat']);
  const { isSignedIn } = usePersonyAuth();
  const [copiedPrompt, setCopiedPrompt] = React.useState(false);
  const [copiedShare, setCopiedShare] = React.useState(false);
  const [isAvatarStudioOpen, setIsAvatarStudioOpen] = React.useState(false);
  const [relationshipBullets, setRelationshipBullets] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!isOpen || !character || !isSignedIn) {
      setRelationshipBullets([]);
      return;
    }
    void fetchRelationshipProfile(character.id)
      .then((profile) => setRelationshipBullets(profile.bullets))
      .catch(() => setRelationshipBullets([]));
  }, [isOpen, character?.id, isSignedIn]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen || !character) return null;

  const localized = getLocalizedPersonaPresentation(character, i18n.language);

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(character.systemPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <AnimatePresence>
      <div
        id="profile-drawer-backdrop"
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex justify-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 260 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:w-96 h-full max-w-full bg-[#18181b] border-l border-zinc-800 flex flex-col shadow-2xl overflow-hidden pb-[env(safe-area-inset-bottom,0px)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/50">
            <span className="text-sm font-semibold text-white/90">{t('personas:profileTitle')}</span>
            <button
              onClick={onClose}
              className="py-touch-target p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6 scrollbar-thin scrollbar-thumb-white/10 min-h-0">
            {/* Avatar & Hero */}
            <div className="flex flex-col items-center text-center">
              <button
                type="button"
                onClick={() => character.isCustom && setIsAvatarStudioOpen(true)}
                className={`relative w-28 h-28 rounded-full overflow-hidden p-1 ring-2 ring-zinc-700 bg-zinc-800 shadow-xl ${
                  character.isCustom ? 'group cursor-pointer' : 'cursor-default'
                }`}
                disabled={!character.isCustom}
              >
                <img
                  src={character.avatar}
                  alt={character.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-full"
                />
                {character.isCustom && (
                  <span className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImagePlus className="w-5 h-5 text-white" />
                  </span>
                )}
              </button>

              <h3 className="mt-4 text-xl font-bold text-white tracking-tight">{character.name}</h3>
              {character.isCustom && onAvatarChange && (
                <button
                  type="button"
                  onClick={() => setIsAvatarStudioOpen(true)}
                  className="mt-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  {t('changeAvatar')}
                </button>
              )}
              <p className="text-xs text-zinc-400 font-medium mt-0.5">{localized.tagline}</p>

              {/* Call to action: Voice call */}
              <div className="flex items-center gap-3 mt-5 w-full">
                <button
                  id="drawer-call-btn"
                  onClick={() => {
                    onClose();
                    onCall(character);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold flex items-center justify-center gap-2 border border-zinc-700 shadow-sm transition-all cursor-pointer"
                >
                  <Phone className="w-4 h-4" /> {t('personas:call')}
                </button>
                <button
                  onClick={() => onEdit(character)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition-colors border border-white/5"
                  title={t('common:edit')}
                  aria-label={t('common:edit')}
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void copyPersonaShareLink(character.id).then((ok) => {
                      if (ok) {
                        setCopiedShare(true);
                        window.setTimeout(() => setCopiedShare(false), 2000);
                      }
                    });
                  }}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 transition-colors border border-white/5"
                  title={
                    character.visibility === 'private'
                      ? t('personas:shareLinkPrivateHint')
                      : t('personas:shareLink')
                  }
                  aria-label={t('personas:shareLink')}
                >
                  {copiedShare ? (
                    <Check className="w-4 h-4 text-py-accent" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">{t('personas:about')}</span>
              <p className="text-xs text-white/80 leading-relaxed">{localized.description}</p>
            </div>

            {isSignedIn && (
              <div className="space-y-2 bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                  {t('personas:relationshipRemembersTitle', { name: character.name.split(' ')[0] })}
                </span>
                {relationshipBullets.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-white/80 list-disc pl-4">
                    {relationshipBullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-white/45 leading-relaxed">{t('personas:relationshipRemembersEmpty')}</p>
                )}
              </div>
            )}

            {/* Voice Settings */}
            <div className="space-y-3 bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-zinc-400" /> {t('personas:voice')}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                  {character.voice}
                </span>
              </div>
            </div>

            {/* System Prompt (Inspectable) */}
            <div className="space-y-2 bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-zinc-400" /> {t('personas:systemPrompt')}
                </span>
                <button
                  onClick={handleCopyPrompt}
                  className="text-[11px] text-zinc-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedPrompt ? <Check className="w-3 h-3 text-py-accent" /> : <Share2 className="w-3 h-3" />}
                  {copiedPrompt ? t('chat:copied') : t('chat:copy')}
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto font-mono text-[11px] text-white/60 bg-black/40 p-2.5 rounded-xl border border-white/5 scrollbar-thin scrollbar-thumb-white/10 leading-relaxed whitespace-pre-wrap">
                {character.systemPrompt}
              </div>
            </div>

            {/* Management Actions */}
            <div className="space-y-2 pt-2">
              {onClearChat && (
                <button
                  onClick={() => {
                    if (confirm(t('personas:clearHistoryConfirm'))) {
                      onClearChat(character.id);
                    }
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-white/70 hover:text-white transition-colors text-left flex items-center justify-between"
                >
                  <span>{t('personas:clearHistory')}</span>
                  <Trash2 className="w-3.5 h-3.5 text-white/40" />
                </button>
              )}

              {character.isCustom && onDelete && (
                <button
                  onClick={() => {
                    if (confirm(t('personas:deletePersonaConfirm', { name: character.name }))) {
                      onDelete(character.id);
                      onClose();
                    }
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs text-rose-400 transition-colors text-left flex items-center justify-between"
                >
                  <span>{t('personas:deletePersona')}</span>
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {character && onAvatarChange && (
        <AvatarStudioModal
          isOpen={isAvatarStudioOpen}
          onClose={() => setIsAvatarStudioOpen(false)}
          onApply={(nextAvatar) => onAvatarChange(character, nextAvatar)}
          personaName={character.name}
          personaId={character.id}
          category={character.category}
          currentAvatar={character.avatar}
        />
      )}
    </AnimatePresence>
  );
};
