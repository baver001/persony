import React from 'react';

interface PersonyLogoProps {
  size?: number;
  className?: string;
}

/** AI monogram shaped as a messenger paper plane */
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
    <path d="M6 20 L15 6 L19 14 Z" fill="var(--py-accent, #4ec9a0)" />
    <path d="M15 6 L26 16 L19 14 Z" fill="var(--py-text-primary, #e4e4e7)" opacity="0.9" />
    <path d="M10 17 L15 9 L17 13 Z" fill="var(--py-bg-sidebar, #111113)" />
    <path
      d="M10.5 15.5 L18 11"
      stroke="var(--py-accent, #4ec9a0)"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <circle cx="24" cy="13" r="2.2" fill="var(--py-text-primary, #f4f4f5)" />
    <rect x="14.5" y="19" width="2" height="6" rx="0.5" fill="var(--py-text-muted, #a1a1aa)" />
  </svg>
);
