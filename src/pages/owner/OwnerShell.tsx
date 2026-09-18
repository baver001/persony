import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Menu, X } from 'lucide-react';
import {
  MOBILE_MORE_SECTIONS,
  MOBILE_PRIMARY_SECTIONS,
  OWNER_NAV_GROUPS,
} from './nav';
import type { OwnerSectionId } from './types';

type Props = {
  section: OwnerSectionId;
  onSectionChange: (section: OwnerSectionId) => void;
  onBack: () => void;
  title: string;
  children: ReactNode;
};

export function OwnerShell({ section, onSectionChange, onBack, title, children }: Props) {
  const { t } = useTranslation(['owner', 'common']);
  const [moreOpen, setMoreOpen] = useState(false);

  const sectionLabel = (id: OwnerSectionId) => t(`owner:sections.${id}`);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8 xl:px-10 flex flex-col lg:flex-row gap-4 lg:gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block lg:w-56 shrink-0 space-y-4">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-zinc-400 hover:text-zinc-200"
          >
            ← {t('common:back')}
          </button>
          <h1 className="text-lg font-semibold px-1">{title}</h1>
          <nav className="space-y-4">
            {OWNER_NAV_GROUPS.map((group) => (
              <div key={group.id}>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 px-2 mb-1">
                  {t(`owner:${group.labelKey}`)}
                </div>
                <div className="space-y-0.5">
                  {group.sections.map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onSectionChange(id)}
                      className={`w-full px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        section === id
                          ? 'bg-white/10 text-white'
                          : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                      }`}
                    >
                      {sectionLabel(id)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between gap-3">
          <button type="button" onClick={onBack} className="text-sm text-zinc-400">
            ← {t('common:back')}
          </button>
          <h1 className="text-base font-semibold truncate">{title}</h1>
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-white/5"
            aria-label={t('owner:nav.more')}
            onClick={() => setMoreOpen((v) => !v)}
          >
            {moreOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {moreOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMoreOpen(false)}>
            <div
              className="absolute right-0 top-0 bottom-0 w-[min(100%,280px)] bg-zinc-950 border-l border-white/10 p-4 space-y-1 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-xs uppercase text-zinc-500 mb-2">{t('owner:nav.more')}</div>
              {MOBILE_MORE_SECTIONS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onSectionChange(id);
                    setMoreOpen(false);
                  }}
                  className={`w-full px-3 py-3 rounded-lg text-left text-sm min-h-[44px] ${
                    section === id ? 'bg-white/10 text-white' : 'text-zinc-300'
                  }`}
                >
                  {sectionLabel(id)}
                </button>
              ))}
            </div>
          </div>
        )}

        <main className="flex-1 min-w-0 space-y-4 lg:space-y-6">
          <h2 className="text-xl font-semibold hidden lg:block">{sectionLabel(section)}</h2>
          <h2 className="text-lg font-semibold lg:hidden">{sectionLabel(section)}</h2>
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-white/10 bg-zinc-950/95 backdrop-blur"
        aria-label={t('owner:nav.mobile')}
      >
        <div className="grid grid-cols-5 max-w-lg mx-auto">
          {MOBILE_PRIMARY_SECTIONS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onSectionChange(id)}
              className={`py-3 text-[11px] min-h-[52px] ${
                section === id ? 'text-white' : 'text-zinc-500'
              }`}
            >
              {sectionLabel(id)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={`py-3 text-[11px] min-h-[52px] ${
              MOBILE_MORE_SECTIONS.includes(section) ? 'text-white' : 'text-zinc-500'
            }`}
          >
            {t('owner:nav.more')}
          </button>
        </div>
      </nav>
    </div>
  );
}
