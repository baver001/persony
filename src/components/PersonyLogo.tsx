import React from 'react';

interface PersonyLogoProps {
  size?: number;
  className?: string;
}

const PLANE =
  'M 20.9 9.75 C 21.7 8.75 23.1 9.5 22.8 10.9 L 21.7 14.2 C 21.4 15.25 20.2 15.75 19.1 15.1 L 15.75 13.25 C 14.75 12.75 14.5 11.5 15.25 10.75 L 18 9.9 L 16.4 11.75 L 17.15 13.45 L 19 12.25 L 20.9 9.75 Z';

const P_OUTER =
  'M 7.4 6 V 26 H 10.5 V 24.25 H 12.25 C 19.4 24.25 23.9 19.75 23.9 14.25 C 23.9 8.75 19.4 6 12.25 6 H 7.4 Z';

/** Persony mark: bold P with a paper-plane shaped counter */
export const PersonyLogo: React.FC<PersonyLogoProps> = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect width="32" height="32" rx="7" fill="var(--py-bg-sidebar, #111113)" />
    <path fill="var(--py-accent, #4ec9a0)" d={PLANE} />
    <path
      fill="var(--py-text-primary, #f4f4f5)"
      fillRule="evenodd"
      clipRule="evenodd"
      d={`${P_OUTER} ${PLANE}`}
    />
  </svg>
);
