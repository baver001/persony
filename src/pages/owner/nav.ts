import type { OwnerNavGroup, OwnerSectionId } from './types';

/** Desktop sidebar groups (goal §32). */
export const OWNER_NAV_GROUPS: OwnerNavGroup[] = [
  { id: 'root', labelKey: 'nav.overview', sections: ['overview'] },
  {
    id: 'ai',
    labelKey: 'nav.ai',
    sections: ['ai', 'pricing', 'inference'],
  },
  {
    id: 'economy',
    labelKey: 'nav.economy',
    sections: ['economy', 'battery'],
  },
  {
    id: 'people',
    labelKey: 'nav.people',
    sections: ['users', 'personas'],
  },
  {
    id: 'usage',
    labelKey: 'nav.usage',
    sections: ['memory'],
  },
  {
    id: 'system',
    labelKey: 'nav.system',
    sections: ['settings', 'audit'],
  },
];

/** Mobile bottom bar (goal §34). */
export const MOBILE_PRIMARY_SECTIONS: OwnerSectionId[] = [
  'overview',
  'ai',
  'economy',
  'inference',
];

export const MOBILE_MORE_SECTIONS: OwnerSectionId[] = [
  'pricing',
  'users',
  'personas',
  'memory',
  'battery',
  'audit',
  'settings',
];

export function allOwnerSections(): OwnerSectionId[] {
  return OWNER_NAV_GROUPS.flatMap((g) => g.sections);
}
