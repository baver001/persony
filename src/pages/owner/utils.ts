import { useEffect } from 'react';

export function formatMicrousd(value: number | null, precision = 6): string {
  if (value === null) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}`;
  if (value >= 10_000) return `$${(value / 1_000_000).toFixed(4)}`;
  return `$${(value / 1_000_000).toFixed(precision)}`;
}

export function useOwnerNoIndex(title: string, appTitle: string) {
  useEffect(() => {
    const existing = document.querySelector('meta[name="robots"]');
    const tag = existing ?? document.createElement('meta');
    tag.setAttribute('name', 'robots');
    tag.setAttribute('content', 'noindex, nofollow, noarchive');
    if (!existing) document.head.appendChild(tag);
    document.title = title;
    return () => {
      tag.setAttribute('content', 'index,follow');
      document.title = appTitle;
    };
  }, [title, appTitle]);
}
