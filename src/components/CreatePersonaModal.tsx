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
  ChevronDown,
} from 'lucide-react';
import { Persona, VoiceName } from '../types';
import { generateSvgAvatar, PRESET_AVATARS } from '../utils/avatarGenerator';
import { getApiHeaders } from '../lib/api/headers';
import { AvatarStudioModal } from './AvatarStudioModal';
import { buildCustomPersonaSpec } from '../../shared/persona-spec/build-custom-spec';
import type { CustomPersonaStyleInput } from '../../shared/persona-spec/build-custom-spec';

interface CreatePersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (persona: Persona) => void;
  initialPersona?: Persona | null;
}

const inputClass =
  'w-full bg-py-input border border-py-border rounded-xl px-3 py-2 text-sm text-py-text placeholder:text-py-text-muted focus:outline-none focus:border-py-accent/45 transition-colors';

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
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isGeneratingWithAi, setIsGeneratingWithAi] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isAvatarStudioOpen, setIsAvatarStudioOpen] = useState(false);
  const [visibility, setVisibility] = useState<'private' | 'unlisted' | 'public'>(
    initialPersona?.visibility || 'private'
  );
  const [behaviorProfile, setBehaviorProfile] = useState<CustomPersonaStyleInput>({
    warmth: 60,
    directness: 55,
    creativity: 50,
    formality: 40,
    verbosity: 45,
    humor: 35,
  });

  const STYLE_SLIDERS: Array<{ key: keyof CustomPersonaStyleInput; label: string }> = [
    { key: 'warmth', label: t('styleWarmth') },
    { key: 'directness', label: t('styleDirectness') },
    { key: 'creativity', label: t('styleCreativity') },
    { key: 'formality', label: t('styleFormality') },
    { key: 'verbosity', label: t('styleVerbosity') },
    { key: 'humor', label: t('styleHumor') },
  ];

  if (!isOpen) return null;

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

    const slug = initialPersona?.id || `custom_${Date.now()}`;
    const spec = buildCustomPersonaSpec({
      slug,
      name: name.trim(),
      description: description.trim() || t('common:customPersonaDefault'),
      tagline: tagline.trim() || t('common:companionDefault'),
      style: behaviorProfile,
      starterMessages: starter1.trim() ? [starter1.trim()] : [t('defaultGreeting')],
      styleNotes: systemPrompt.trim() ? [systemPrompt.trim()] : undefined,
    });

    const newPersona: Persona = {
      id: slug,
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
      behaviorProfile,
      configurationJson: JSON.stringify(spec),
      visibility,
    };

    onSave(newPersona);
    onClose();
  };

  const sectionCardClass = 'rounded-2xl border border-py-border bg-py-elevated/70 p-4 space-y-3';

  const SectionHeader = ({ title, hint }: { title: string; hint?: string }) => (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-py-text-secondary">
        {title}
      </h3>
      {hint ? <span className="text-[10px] text-py-text-muted">{hint}</span> : null}
    </div>
  );

  return (
    <div
      id="create-persona-backdrop"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        className="w-full sm:max-w-3xl max-h-[100dvh] sm:max-h-[92dvh] bg-py-sidebar border-0 sm:border border-py-border rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-4 border-b border-py-border shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-py-text font-[family-name:var(--font-display)] leading-tight">
              {initialPersona ? t('editTitle') : t('createTitle')}
            </h2>
            <p className="text-xs text-py-text-muted mt-0.5">{t('createSubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="py-touch-target p-2 rounded-lg text-py-text-muted hover:text-py-text hover:bg-py-input transition-colors cursor-pointer shrink-0"
            aria-label={t('common:cancel')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-4 sm:px-5 py-4 space-y-4">
          {isAiOpen ? (
            <div className="rounded-2xl border border-py-accent/25 bg-py-accent/5 p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-py-accent">
                  <Wand2 className="w-3.5 h-3.5" />
                  {t('quickGenerate')}
                </div>
                <button
                  type="button"
                  onClick={() => setIsAiOpen(false)}
                  className="text-[11px] text-py-text-muted hover:text-py-text transition-colors"
                >
                  {t('createAiCollapse')}
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={t('conceptPlaceholder')}
                  className={inputClass}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleGenerateWithAI();
                  }}
                />
                <button
                  type="button"
                  onClick={() => void handleGenerateWithAI()}
                  disabled={isGeneratingWithAi || !aiPrompt.trim()}
                  className="shrink-0 px-4 py-2 rounded-xl bg-py-accent hover:opacity-90 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-opacity cursor-pointer"
                >
                  {isGeneratingWithAi ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {t('generating')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      {t('generateAi')}
                    </>
                  )}
                </button>
              </div>
              {generationError && <p className="text-[11px] text-rose-400">{generationError}</p>}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAiOpen(true)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-dashed border-py-accent/30 bg-py-accent/5 text-sm text-py-accent hover:bg-py-accent/10 transition-colors"
            >
              <span className="inline-flex items-center gap-2 font-medium">
                <Sparkles className="w-4 h-4" />
                {t('createAiToggle')}
              </span>
              <ChevronDown className="w-4 h-4 opacity-70" />
            </button>
          )}

          <section className={sectionCardClass}>
            <SectionHeader title={t('createSectionIdentity')} />
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={() => setIsAvatarStudioOpen(true)}
                className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden ring-1 ring-py-border bg-py-input shrink-0 self-center sm:self-start group cursor-pointer"
                title={t('changeAvatar')}
              >
                <img
                  src={avatar}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                  <ImagePlus className="w-4 h-4 text-white" />
                  <span className="text-[10px] text-white/90 font-medium">{t('art')}</span>
                </span>
              </button>

              <div className="flex-1 min-w-0 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-py-text-secondary">{t('nameLabel')}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('namePlaceholder')}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-py-text-secondary">{t('taglineLabel')}</label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder={t('taglinePlaceholder')}
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setIsAvatarStudioOpen(true)}
                  className="text-xs text-py-accent hover:opacity-80 font-medium inline-flex items-center gap-1.5"
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  {t('changeAvatar')}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="text-xs font-medium text-py-text-secondary">{t('categoryLabel')}</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                      category === cat.id
                        ? 'bg-py-accent/15 text-py-accent border-py-accent/35'
                        : 'bg-py-input text-py-text-muted border-py-border hover:text-py-text hover:border-py-text-muted'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className={sectionCardClass}>
            <SectionHeader title={t('createSectionVoice')} hint={t('voicesAvailable')} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {VOICES.map((v) => {
                const isSelected = voice === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVoice(v.id)}
                    className={`px-3 py-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-py-accent/10 border-py-accent/40 text-py-text ring-1 ring-py-accent/25'
                        : 'bg-py-input border-py-border text-py-text-secondary hover:border-py-text-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold truncate">{v.label}</span>
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-py-accent shrink-0" />
                      ) : (
                        <Mic className="w-3 h-3 opacity-40 shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-py-text-muted truncate block mt-0.5">
                      {v.tone}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className={sectionCardClass}>
            <SectionHeader title={t('styleTitle')} hint={t('styleHint')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STYLE_SLIDERS.map(({ key, label }) => (
                <label key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-py-text-secondary">{label}</span>
                    <span className="tabular-nums text-py-text-muted">{behaviorProfile[key]}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={behaviorProfile[key]}
                    onChange={(e) =>
                      setBehaviorProfile((prev) => ({
                        ...prev,
                        [key]: Number(e.target.value),
                      }))
                    }
                    className="w-full h-1.5 rounded-full appearance-none bg-py-input accent-py-accent cursor-pointer"
                  />
                </label>
              ))}
            </div>
          </section>

          <section className={sectionCardClass}>
            <SectionHeader title={t('createSectionInstructions')} hint={t('systemPromptHint')} />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-py-text-secondary">
                {t('systemPromptLabel')}
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder={t('systemPromptPlaceholder')}
                className={`${inputClass} min-h-[120px] resize-y leading-relaxed`}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-py-text-secondary">{t('starterLabel')}</label>
              <input
                type="text"
                value={starter1}
                onChange={(e) => setStarter1(e.target.value)}
                placeholder={t('starterPlaceholder')}
                className={inputClass}
              />
            </div>
          </section>

          <section className={sectionCardClass}>
            <SectionHeader title={t('visibilityTitle')} hint={t('visibilityHint')} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(['private', 'unlisted', 'public'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setVisibility(option)}
                  className={`px-3 py-2.5 rounded-xl border text-left transition-all ${
                    visibility === option
                      ? 'bg-py-accent/10 border-py-accent/40 ring-1 ring-py-accent/25'
                      : 'bg-py-input border-py-border hover:border-py-text-muted'
                  }`}
                >
                  <span className="text-xs font-semibold block">{t(`visibility_${option}`)}</span>
                  <span className="text-[10px] text-py-text-muted mt-0.5 block">
                    {t(`visibility_${option}Hint`)}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 sm:px-5 py-3 border-t border-py-border bg-py-sidebar shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-py-text-secondary hover:text-py-text hover:bg-py-input transition-colors cursor-pointer"
          >
            {t('common:cancel')}
          </button>
          <button
            type="button"
            id="save-persona-btn"
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-5 py-2 rounded-xl bg-py-accent hover:opacity-90 disabled:opacity-40 text-white text-sm font-semibold inline-flex items-center gap-1.5 transition-opacity cursor-pointer"
          >
            <Check className="w-4 h-4" />
            {t('savePersona')}
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
