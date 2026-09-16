import React from 'react';
/** Cream mark — for dark UI surfaces */
import iconForDarkUi from '../assets/persony-icon-light.svg';
/** Graphite mark — for light UI surfaces */
import iconForLightUi from '../assets/persony-icon-dark.svg';

/** Source artwork viewBox aspect ratio (120.564×140.437). */
const MARK_ASPECT = 120.564 / 140.437;

export type PersonyLogoTheme = 'dark' | 'light';

interface PersonyLogoProps {
  size?: number;
  theme?: PersonyLogoTheme;
  className?: string;
}

/**
 * Persony brand mark (vector). Transparent background — adapts to sidebar surface.
 */
export const PersonyLogo: React.FC<PersonyLogoProps> = ({
  size = 24,
  theme = 'dark',
  className = '',
}) => {
  const src = theme === 'dark' ? iconForDarkUi : iconForLightUi;
  const height = size;
  const width = Math.round(size * MARK_ASPECT);

  return (
    <img
      src={src}
      width={width}
      height={height}
      className={`block object-contain select-none ${className}`}
      alt=""
      aria-hidden
      draggable={false}
    />
  );
};
