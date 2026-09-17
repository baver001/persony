import { useEffect, useState } from 'react';

const MOBILE_LAYOUT_QUERY = '(max-width: 767px)';

/** True when the app uses single-pane mobile navigation (list ↔ chat). */
export function useMobileLayout(): boolean {
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_LAYOUT_QUERY).matches : false
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_LAYOUT_QUERY);
    const sync = () => setIsMobileLayout(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return isMobileLayout;
}
