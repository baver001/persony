import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Upload, RefreshCw, X, Wand2, ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { generateSvgAvatar, PRESET_AVATARS } from '../utils/avatarGenerator';
import { compressAvatarDataUrl, readImageFileAsDataUrl } from '../utils/avatarImage';
import { getApiHeaders } from '../lib/api/headers';

interface AvatarStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (avatar: string) => void;
  personaName?: string;
  personaId?: string;
  category?: string;
  currentAvatar?: string;
}

export const AvatarStudioModal: React.FC<AvatarStudioModalProps> = ({
  isOpen,
  onClose,
  onApply,
  personaName = '',
  personaId,
  category = 'custom',
  currentAvatar,
}) => {
  const { t } = useTranslation(['personas', 'common']);
  const [preview, setPreview] = useState(currentAvatar || PRESET_AVATARS[0]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPreview(currentAvatar || PRESET_AVATARS[0]);
      setPrompt('');
      setError(null);
    }
  }, [isOpen, currentAvatar]);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-avatar', {
        method: 'POST',
        headers: await getApiHeaders(),
        body: JSON.stringify({
          prompt: trimmed,
          personaName: personaName.trim() || undefined,
          personaId,
          clientRequestId: `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        }),
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(errJson?.error || t('avatarGenerateFailed'));
      }

      const data = (await res.json()) as { imageDataUrl?: string };
      if (!data.imageDataUrl) throw new Error(t('avatarGenerateFailed'));

      const compressed = await compressAvatarDataUrl(data.imageDataUrl);
      setPreview(compressed);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('avatarGenerateFailed');
      setError(message);
      const fallback = generateSvgAvatar(
        personaName || trimmed,
        category,
        `${Date.now()}-${trimmed}`
      );
      setPreview(fallback);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readImageFileAsDataUrl(file);
      setPreview(dataUrl);
      setError(null);
    } catch {
      setError(t('avatarUploadFailed'));
    }
    e.target.value = '';
  };

  const handleRandomStyle = () => {
    setPreview(generateSvgAvatar(personaName || 'Persona', category, Date.now().toString()));
    setError(null);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-md bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div>
              <h3 className="text-sm font-semibold text-white">{t('avatarStudioTitle')}</h3>
              <p className="text-[11px] text-zinc-500">{t('avatarStudioSubtitle')}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label={t('common:cancel')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-2xl overflow-hidden ring-1 ring-zinc-700 bg-zinc-800 shadow-lg">
                <img
                  src={preview}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-medium text-zinc-400">{t('avatarPromptLabel')}</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder={t('avatarPromptPlaceholder')}
                className="w-full resize-none bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={isGenerating || !prompt.trim()}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white text-zinc-900 text-xs font-semibold disabled:opacity-50 transition-opacity"
              >
                {isGenerating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {t('avatarGenerateAi')}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-semibold text-white transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                {t('avatarUpload')}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleUpload(e)}
              />
              <button
                type="button"
                onClick={handleRandomStyle}
                className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 transition-colors"
              >
                <Wand2 className="w-3.5 h-3.5" />
                {t('avatarRandomStyle')}
              </button>
            </div>

            <div>
              <p className="text-[11px] font-medium text-zinc-500 mb-2">{t('avatarPresets')}</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-none px-1 py-2 -mx-1">
                {PRESET_AVATARS.slice(0, 8).map((url, i) => {
                  const selected = preview === url;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPreview(url)}
                      className={`relative shrink-0 w-9 h-9 rounded-lg overflow-hidden transition-all ${
                        selected
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900'
                          : 'opacity-55 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={url}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {error && (
              <p className="text-[11px] text-amber-400/90 flex items-start gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-zinc-800 bg-zinc-950/50">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              {t('common:cancel')}
            </button>
            <button
              type="button"
              onClick={() => {
                onApply(preview);
                onClose();
              }}
              className="px-4 py-2 rounded-lg bg-py-accent text-zinc-900 text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              {t('avatarApply')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
