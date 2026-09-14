import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Check } from 'lucide-react';

export const PwaInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [showManualTip, setShowManualTip] = useState<boolean>(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      setShowManualTip(true);
      setTimeout(() => setShowManualTip(false), 5000);
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || isDismissed) return null;

  return (
    <div
      id="pwa-install-banner"
      className="bg-[#18181b] border-b border-zinc-800 px-3 sm:px-4 py-1.5 sm:py-2 flex flex-row items-center justify-between gap-2 text-[10px] sm:text-xs text-white/80 relative shrink-0"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="p-1 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 shrink-0">
          <Smartphone className="w-3.5 h-3.5" />
        </div>
        <span className="line-clamp-2 sm:line-clamp-none sm:truncate leading-snug">
          {showManualTip ? (
            <span className="text-zinc-200">
              Меню браузера → <strong>«Установить приложение»</strong> или «На экран Домой».
            </span>
          ) : (
            <span>
              Установите <strong className="text-white">Persony</strong> для быстрых звонков
            </span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium text-[11px] flex items-center gap-1 transition-colors border border-zinc-700 shadow-sm cursor-pointer"
        >
          <Download className="w-3 h-3" /> Установить
        </button>
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded-md text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Скрыть"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
