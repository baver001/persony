import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import {
  X,
  Sparkles,
  Wand2,
  Check,
  RefreshCw,
  Mic,
  ImagePlus,
} from 'lucide-react';
import { Persona, VoiceName } from '../types';
import { generateSvgAvatar, PRESET_AVATARS } from '../utils/avatarGenerator';
import { getApiHeaders } from '../lib/api/headers';
import { AvatarStudioModal } from './AvatarStudioModal';

interface CreatePersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (persona: Persona) => void;
  initialPersona?: Persona | null;
}

export const CreatePersonaModal: React.FC<CreatePersonaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPersona,
}) => {
  const { t } = useTranslation(['personas', 'common']);

  const VOICES = useMemo(
    (): Array<{ id: VoiceName; label: string; tone: string }> => [
      { id: 'Aoede', label: 'Aoede', tone: t('voiceFemale') },
      { id: 'Charon', label: 'Charon', tone: t('voiceMaleLow') },
      { id: 'Puck', label: 'Puck', tone: t('voiceYouth') },
      { id: 'Zephyr', label: 'Zephyr', tone: t('voiceCalm') },
      { id: 'Kore', label: 'Kore', tone: t('voicePoetic') },
      { id: 'Fenrir', label: 'Fenrir', tone: t('voiceCharismatic') },
    ],
    [t]
  );

  const CATEGORIES = useMemo(
    (): Array<{ id: Persona['category']; label: string }> => [
      { id: 'tech', label: t('categoryTech') },
      { id: 'mentor', label: t('categoryMentor') },
      { id: 'philosophy', label: t('categoryPhilosophy') },
      { id: 'creative', label: t('categoryCreative') },
      { id: 'fantasy', label: t('categoryFantasy') },
      { id: 'custom', label: t('categoryCustom') },
    ],
    [t]
  );

  const [name, setName] = useState(initialPersona?.name || '');
  const [tagline, setTagline] = useState(initialPersona?.tagline || '');
  const [description, setDescription] = useState(initialPersona?.description || '');
  const [systemPrompt, setSystemPrompt] = useState(initialPersona?.systemPrompt || '');
  const [voice, setVoice] = useState<VoiceName>(initialPersona?.voice || 'Aoede');
  const [category, setCategory] = useState<Persona['category']>(initialPersona?.category || 'custom');
  const [avatar, setAvatar] = useState(initialPersona?.avatar || PRESET_AVATARS[0]);
  const [starter1, setStarter1] = useState(
    initialPersona?.starterMessages?.[0] || t('defaultStarter')
  );

  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingWithAi, setIsGeneratingWithAi] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isAvatarStudioOpen, setIsAvatarStudioOpen] = useState(false);

  if (!isOpen) return null;

  // AI-Assisted persona generator
  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingWithAi(true);
    setGenerationError(null);

    try {
      const res = await fetch('/api/generate-character', {
        method: 'POST',
        headers: await getApiHeaders(),
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errJson?.error || t('generateFailed'));
      }

      const data = (await res.json()) as Record<string, unknown>;
      if (typeof data.name === 'string') setName(data.name);
      if (typeof data.tagline === 'string') setTagline(data.tagline);
      if (typeof data.description === 'string') setDescription(data.description);
      if (typeof data.systemPrompt === 'string') setSystemPrompt(data.systemPrompt);
      if (typeof data.voice === 'string' && VOICES.some((v) => v.id === data.voice)) {
        setVoice(data.voice as VoiceName);
      }
      if (typeof data.category === 'string' && CATEGORIES.some((c) => c.id === data.category)) {
        setCategory(data.category);
      }
      const starters = data.starterMessages;
      if (Array.isArray(starters) && typeof starters[0] === 'string') {
        setStarter1(starters[0]);
      }

      const svgAvatar = generateSvgAvatar(
        (typeof data.name === 'string' ? data.name : aiPrompt),
        (typeof data.category === 'string' ? data.category : 'custom'),
        Date.now().toString()
      );
      setAvatar(svgAvatar);
    } catch (err: any) {
      setGenerationError(err.message || t('generationError'));
    } finally {
      setIsGeneratingWithAi(false);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const newPersona: Persona = {
      id: initialPersona?.id || `custom_${Date.now()}`,
      name: name.trim(),
      tagline: tagline.trim() || t('common:companionDefault'),
      description: description.trim() || t('common:customPersonaDefault'),
      systemPrompt:
        systemPrompt.trim() ||
        t('defaultSystemPrompt', { name: name.trim() }),
      avatar: avatar || generateSvgAvatar(name, category),
      voice,
      category,
      color: initialPersona?.color || '#71717a',
      badge: 'Custom',
      isCustom: true,
      createdAt: initialPersona?.createdAt || Date.now(),
      starterMessages: starter1.trim() ? [starter1.trim()] : [t('defaultGreeting')],
    };

    onSave(newPersona);
    onClose();
  };

  return (
    <div
      id="create-persona-backdrop"
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto py-safe-top"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="w-full sm:max-w-4xl h-full sm:h-auto bg-zinc-900 border-0 sm:border border-zinc-800 rounded-none sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:my-auto sm:max-h-[96vh]"
      >
        {/* Compact Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 bg-[#18181b] shrink-0">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
              {initialPersona ? t('editTitle') : t('createTitle')}
            </h2>
            <p className="text-[11px] text-white/50">{t('createSubtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="py-touch-target p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* AI Quick Generator Strip */}
        <div className="px-4 sm:px-5 py-2.5 bg-zinc-800/60 border-b border-zinc-700/60 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 shrink-0 hidden sm:flex">
              <Wand2 className="w-3.5 h-3.5" />
              <span>{t('quickGenerate')}</span>
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={t('conceptPlaceholder')}
                className="w-full bg-black/40 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-zinc-500 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleGenerateWithAI();
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleGenerateWithAI}
              disabled={isGeneratingWithAi || !aiPrompt.trim()}
              className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer"
            >
              {isGeneratingWithAi ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>{t('generating')}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  <span className="sm:hidden">{t('generateShort')}</span>
                  <span className="hidden sm:inline">{t('generateAi')}</span>
                </>
              )}
            </button>
          </div>
          {generationError && <p className="text-[11px] text-rose-400 mt-1">{generationError}</p>}
        </div>

        {/* Main 2-Column Layout (Fits directly on single screen) */}
        <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5 overflow-y-auto md:overflow-visible">
          {/* LEFT COLUMN: Identity & Voice (5 cols) */}
          <div className="md:col-span-6 space-y-3">
            {/* Avatar Row */}
            <div className="flex items-center gap-3 bg-[#18181b] p-3 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setIsAvatarStudioOpen(true)}
                className="relative w-16 h-16 rounded-xl overflow-hidden ring-1 ring-zinc-600 bg-black/40 shrink-0 group cursor-pointer"
                title={t('changeAvatar')}
              >
                <img
                  src={avatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ImagePlus className="w-4 h-4 text-white" />
                </span>
              </button>

              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-[11px] text-zinc-400">{t('avatarHint')}</p>
                <button
                  type="button"
                  onClick={() => setIsAvatarStudioOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white font-medium inline-flex items-center gap-1.5 transition-colors"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  {t('changeAvatar')}
                </button>
              </div>
            </div>

            {/* Name and Tagline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-white/70">{t('nameLabel')}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('namePlaceholder')}
                  className="w-full bg-[#18181b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-white/70">{t('taglineLabel')}</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder={t('taglinePlaceholder')}
                  className="w-full bg-[#18181b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>
            </div>

            {/* Category Chips */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-white/70">{t('categoryLabel')}</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                      category === cat.id
                        ? 'bg-zinc-200 text-zinc-900 shadow-sm font-semibold'
                        : 'bg-white/5 hover:bg-white/10 text-white/60 border border-white/5'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Compact Voice Selector (3 cols x 2 rows) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-white/70 flex items-center gap-1">
                  <Mic className="w-3.5 h-3.5 text-zinc-400" /> {t('voiceLabel')}
                </label>
                <span className="text-[10px] text-white/40">{t('voicesAvailable')}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {VOICES.map((v) => {
                  const isSelected = voice === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVoice(v.id)}
                      className={`px-2 py-1.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-zinc-800 border-zinc-500 text-white shadow-sm ring-1 ring-zinc-500'
                          : 'bg-[#18181b] border-white/5 hover:bg-white/5 text-white/70'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold truncate leading-tight text-white">{v.label}</span>
                        {isSelected && <Check className="w-3 h-3 text-zinc-300 shrink-0 ml-0.5" />}
                      </div>
                      <span className="text-[10px] text-white/50 truncate mt-0.5">{v.tone}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Instructions & Greeting (6 cols) */}
          <div className="md:col-span-6 flex flex-col space-y-3">
            {/* System Prompt */}
            <div className="flex-1 flex flex-col space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-white/70">
                  {t('systemPromptLabel')}
                </label>
                <span className="text-[10px] text-white/40">{t('systemPromptHint')}</span>
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder={t('systemPromptPlaceholder')}
                className="w-full flex-1 min-h-[140px] md:min-h-[160px] bg-[#18181b] border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-zinc-500 transition-colors leading-relaxed resize-none"
              />
            </div>

            {/* First Starter Message */}
            <div className="space-y-1 shrink-0">
              <label className="text-[11px] font-semibold text-white/70">
                {t('starterLabel')}
              </label>
              <input
                type="text"
                value={starter1}
                onChange={(e) => setStarter1(e.target.value)}
                placeholder={t('starterPlaceholder')}
                className="w-full bg-[#18181b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-zinc-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Compact Footer */}
        <div className="flex items-center justify-end gap-2.5 px-4 sm:px-5 py-3 border-t border-zinc-800 bg-[#18181b] shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            {t('common:cancel')}
          </button>
          <button
            type="button"
            id="save-persona-btn"
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-1.5 rounded-lg bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-900 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{t('savePersona')}</span>
          </button>
        </div>
      </motion.div>

      <AvatarStudioModal
        isOpen={isAvatarStudioOpen}
        onClose={() => setIsAvatarStudioOpen(false)}
        onApply={setAvatar}
        personaName={name}
        category={category}
        currentAvatar={avatar}
      />
    </div>
  );
};

