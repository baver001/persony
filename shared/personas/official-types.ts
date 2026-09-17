import type { PersonaSpecV1 } from '../persona-spec/types';

export type OfficialPersonaDefinition = {
  id: string;
  name: string;
  voice: string;
  color: string;
  avatarUrl: string;
  category: 'official';
  badge: string;
  sortOrder: number;
  spec: PersonaSpecV1;
};
