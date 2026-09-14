import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  Sparkles,
  Wand2,
  Check,
  RefreshCw,
  Upload,
  Mic,
  Palette,
} from 'lucide-react';
import { Persona, VoiceName } from '../types';
import { generateSvgAvatar, PRESET_AVATARS } from '../utils/avatarGenerator';
import { PersonyLogo } from './PersonyLogo';

interface CreatePersonaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (persona: Persona) => void;
  initialPersona?: Persona | null;
}

const VOICES: Array<{ id: VoiceName; label: string; tone: string }> = [
  { id: 'Aoede', label: 'Aoede', tone: 'Женский' },
  { id: 'Charon', label: 'Charon', tone: 'Мужской (низкий)' },
  { id: 'Puck', label: 'Puck', tone: 'Молодежный' },
  { id: 'Zephyr', label: 'Zephyr', tone: 'Спокойный' },
  { id: 'Kore', label: 'Kore', tone: 'Поэтичный' },
  { id: 'Fenrir', label: 'Fenrir', tone: 'Харизматичный' },
];

const CATEGORIES: Array<{ id: Persona['category']; label: string }> = [
  { id: 'tech', label: 'IT & Кибер' },
  { id: 'mentor', label: 'Менторы' },
  { id: 'philosophy', label: 'Философия' },
  { id: 'creative', label: 'Творчество' },
  { id: 'fantasy', label: 'Фэнтези' },
  { id: 'custom', label: 'Свой стиль' },
];

export const CreatePersonaModal: React.FC<CreatePersonaModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPersona,
}) => {
  const [name, setName] = useState(initialPersona?.name || '');
  const [tagline, setTagline] = useState(initialPersona?.tagline || '');
  const [description, setDescription] = useState(initialPersona?.description || '');
  const [systemPrompt, setSystemPrompt] = useState(initialPersona?.systemPrompt || '');
  const [voice, setVoice] = useState<VoiceName>(initialPersona?.voice || 'Aoede');
  const [category, setCategory] = useState<Persona['category']>(initialPersona?.category || 'custom');
  const [avatar, setAvatar] = useState(initialPersona?.avatar || PRESET_AVATARS[0]);
  const [starter1, setStarter1] = useState(initialPersona?.starterMessages?.[0] || 'Привет! Чем могу помочь?');

  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingWithAi, setIsGeneratingWithAi] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  if (!isOpen) return null;

  // AI-Assisted persona generator
  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGeneratingWithAi(true);
    setGenerationError(null);

    try {
      const res = await fetch('/api/generate-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || 'Не удалось сгенерировать персонажа. Повторите попытку.');
      }

      const data = await res.json();
      if (data.name) setName(data.name);
      if (data.tagline) setTagline(data.tagline);
      if (data.description) setDescription(data.description);
      if (data.systemPrompt) setSystemPrompt(data.systemPrompt);
      if (data.voice && VOICES.some((v) => v.id === data.voice)) {
        setVoice(data.voice as VoiceName);
      }
      if (data.category && CATEGORIES.some((c) => c.id === data.category)) {
        setCategory(data.category);
      }
      if (data.starterMessages?.[0]) {
        setStarter1(data.starterMessages[0]);
      }

      const svgAvatar = generateSvgAvatar(data.name || aiPrompt, data.category || 'custom', Date.now().toString());
      setAvatar(svgAvatar);
    } catch (err: any) {
      setGenerationError(err.message || 'Ошибка генерации');
    } finally {
      setIsGeneratingWithAi(false);
    }
  };

  const handleGenerateProceduralAvatar = () => {
    const seed = Date.now().toString();
    const newSvg = generateSvgAvatar(name || 'Custom Character', category, seed);
    setAvatar(newSvg);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const newPersona: Persona = {
      id: initialPersona?.id || `custom_${Date.now()}`,
      name: name.trim(),
      tagline: tagline.trim() || 'AI Собеседник',
      description: description.trim() || 'Пользовательский персонаж для живого общения.',
      systemPrompt:
        systemPrompt.trim() ||
        `Ты — ${name.trim()}. Общайся в мессенджере Persony в своем характерном стиле. Отвечай на русском языке.`,
      avatar: avatar || generateSvgAvatar(name, category),
      voice,
      category,
      color: initialPersona?.color || '#71717a',
      badge: 'Custom',
      isCustom: true,
      createdAt: initialPersona?.createdAt || Date.now(),
      starterMessages: starter1.trim() ? [starter1.trim()] : ['Привет! Рад познакомиться.'],
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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700 flex items-center justify-center">
              <PersonyLogo size={18} />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white leading-tight">
                {initialPersona ? 'Редактировать персонажа' : 'Создать нового персонажа'}
              </h2>
              <p className="text-[11px] text-white/50">
                Настройте образ, голос и системный промпт
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* AI Quick Generator Strip */}
        <div className="px-4 sm:px-5 py-2.5 bg-zinc-800/60 border-b border-zinc-700/60 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 shrink-0 hidden sm:flex">
              <Wand2 className="w-3.5 h-3.5" />
              <span>Быстрая генерация:</span>
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Опишите концепт (например: Саркастичный кот-детектив из Токио...)"
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
                  <span>Генерация...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  <span className="sm:hidden">Сгенерировать</span>
                  <span className="hidden sm:inline">Создать AI</span>
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
            <div className="flex items-center gap-3 bg-[#18181b] p-2.5 rounded-xl border border-white/5">
              <div className="relative w-14 h-14 rounded-xl overflow-hidden ring-2 ring-zinc-600 shadow-md bg-black/40 shrink-0">
                <img
                  src={avatar}
                  alt="Avatar"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleGenerateProceduralAvatar}
                    className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 text-[11px] text-white font-medium flex items-center gap-1 transition-colors cursor-pointer"
                    title="Сгенерировать векторный арт-аватар"
                  >
                    <Palette className="w-3 h-3 text-zinc-400" /> Арт
                  </button>
                  <label className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 text-[11px] text-white font-medium flex items-center gap-1 transition-colors cursor-pointer">
                    <Upload className="w-3 h-3" /> Загрузить
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                {/* Preset Avatars Circles */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                  {PRESET_AVATARS.slice(0, 8).map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setAvatar(url)}
                      className={`relative w-6 h-6 rounded-md overflow-hidden shrink-0 transition-transform cursor-pointer ${
                        avatar === url ? 'ring-2 ring-white scale-110' : 'opacity-50 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Preset ${i}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Name and Tagline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-white/70">Имя персонажа *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Кибер-Детектив"
                  className="w-full bg-[#18181b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-white/70">Краткий статус (Tagline)</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="Специалист по защите"
                  className="w-full bg-[#18181b] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>
            </div>

            {/* Category Chips */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-white/70">Категория</label>
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
                  <Mic className="w-3.5 h-3.5 text-zinc-400" /> Голос для звонков
                </label>
                <span className="text-[10px] text-white/40">6 доступных голосов</span>
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
                  Системная инструкция (System Prompt)
                </label>
                <span className="text-[10px] text-white/40">Характер и знания персонажа</span>
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Опишите характер, манеру речи, предысторию и правила поведения персонажа в Persony..."
                className="w-full flex-1 min-h-[140px] md:min-h-[160px] bg-[#18181b] border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-zinc-500 transition-colors leading-relaxed resize-none"
              />
            </div>

            {/* First Starter Message */}
            <div className="space-y-1 shrink-0">
              <label className="text-[11px] font-semibold text-white/70">
                Первое приветствие в чате
              </label>
              <input
                type="text"
                value={starter1}
                onChange={(e) => setStarter1(e.target.value)}
                placeholder="Привет! Чем могу помочь?"
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
            Отмена
          </button>
          <button
            type="button"
            id="save-persona-btn"
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-4 py-1.5 rounded-lg bg-zinc-100 hover:bg-white disabled:opacity-50 text-zinc-900 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Сохранить персонажа</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

