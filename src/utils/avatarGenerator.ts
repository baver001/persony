// Generates rich stylized SVG avatars based on persona seed and palette
export function generateSvgAvatar(name: string, category: string = 'custom', seed: string = ''): string {
  const hash = (name + seed).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const gradients = [
    { start: '#52525b', end: '#27272a', text: '#FFFFFF', icon: 'zap' },
    { start: '#8B5CF6', end: '#6D28D9', text: '#FFFFFF', icon: 'sparkles' },
    { start: '#71717a', end: '#3f3f46', text: '#FFFFFF', icon: 'heart' },
    { start: '#10B981', end: '#047857', text: '#FFFFFF', icon: 'terminal' },
    { start: '#F59E0B', end: '#D97706', text: '#FFFFFF', icon: 'flame' },
    { start: '#3f3f46', end: '#18181b', text: '#FFFFFF', icon: 'bot' },
    { start: '#52525b', end: '#3f3f46', text: '#FFFFFF', icon: 'brain' },
    { start: '#14B8A6', end: '#0F766E', text: '#FFFFFF', icon: 'compass' },
  ];

  const grad = gradients[hash % gradients.length];
  const initials = name
    .split(' ')
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'AI';

  // Shapes & symbols based on hash
  const shapeType = hash % 4;
  let shapeMarkup = '';
  if (shapeType === 0) {
    // Rings
    shapeMarkup = `
      <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="6" />
      <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="4" stroke-dasharray="8 6" />
    `;
  } else if (shapeType === 1) {
    // Cyber hexagons
    shapeMarkup = `
      <polygon points="100,30 160,65 160,135 100,170 40,135 40,65" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="4" />
      <circle cx="100" cy="100" r="45" fill="rgba(255,255,255,0.08)" />
    `;
  } else if (shapeType === 2) {
    // Stars / Sparkles
    shapeMarkup = `
      <path d="M100,35 L108,85 L158,93 L108,101 L100,151 L92,101 L42,93 L92,85 Z" fill="rgba(255,255,255,0.18)" />
      <circle cx="45" cy="45" r="4" fill="rgba(255,255,255,0.4)" />
      <circle cx="155" cy="155" r="4" fill="rgba(255,255,255,0.4)" />
    `;
  } else {
    // Modern orbital arcs
    shapeMarkup = `
      <path d="M40,100 A60,60 0 0,1 160,100" fill="none" stroke="rgba(255,255,255,0.25)" stroke-width="6" stroke-linecap="round" />
      <path d="M160,100 A60,60 0 0,1 40,100" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="3" stroke-dasharray="4 4" />
    `;
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="g_${hash}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${grad.start}" />
      <stop offset="100%" stop-color="${grad.end}" />
    </linearGradient>
    <filter id="f_${hash}" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="200" height="200" rx="48" fill="url(#g_${hash})" />
  ${shapeMarkup}
  <text x="100" y="116" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="46" font-weight="700" fill="${grad.text}" text-anchor="middle" filter="url(#f_${hash})">${initials}</text>
</svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=faces&auto=format&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=faces&auto=format&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=faces&auto=format&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=faces&auto=format&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&h=300&fit=crop&crop=faces&auto=format&q=80',
  'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&h=300&fit=crop&crop=faces&auto=format&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=300&fit=crop&auto=format&q=80', // Abstract 3d Neon
  'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=300&h=300&fit=crop&auto=format&q=80', // Cyber sphere
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=300&h=300&fit=crop&auto=format&q=80', // Neon aesthetic
];
