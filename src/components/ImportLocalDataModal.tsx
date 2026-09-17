import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CloudUpload, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ImportLocalDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const ImportLocalDataModal: React.FC<ImportLocalDataModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation('common');
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch {
      setError(t('importFailed'));
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl border border-py-border bg-py-surface p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-py-accent/15 flex items-center justify-center">
              <CloudUpload className="w-5 h-5 text-py-accent" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-py-text">{t('importTitle')}</h2>
              <p className="text-sm text-py-muted mt-1">{t('importDescription')}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-py-muted hover:text-py-text" aria-label={t('cancel')}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 rounded-xl text-sm text-py-muted hover:text-py-text"
          >
            {t('later')}
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isImporting}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-py-accent text-white hover:opacity-90 disabled:opacity-60"
          >
            {isImporting ? t('importing') : t('import')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
