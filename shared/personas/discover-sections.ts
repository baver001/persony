import { ATHENA_PERSONA_ID } from './athena-spec';
import { VIKTOR_PERSONA_ID } from './viktor-spec';
import { SOFIA_PERSONA_ID } from './sofia-spec';
import { MARC_NOVA_PERSONA_ID } from './marc-nova-spec';
import { ELSA_PERSONA_ID } from './elsa-spec';
import { CHEF_MARCO_PERSONA_ID } from './chef-marco-spec';

export type DiscoverSectionId =
  | 'featured'
  | 'development'
  | 'business'
  | 'thinking'
  | 'creative'
  | 'lifestyle';

export const DISCOVER_SECTIONS: Array<{
  id: DiscoverSectionId;
  personaIds: string[];
}> = [
  {
    id: 'featured',
    personaIds: [ATHENA_PERSONA_ID, VIKTOR_PERSONA_ID, MARC_NOVA_PERSONA_ID],
  },
  {
    id: 'development',
    personaIds: [VIKTOR_PERSONA_ID],
  },
  {
    id: 'business',
    personaIds: [MARC_NOVA_PERSONA_ID],
  },
  {
    id: 'thinking',
    personaIds: [ATHENA_PERSONA_ID, SOFIA_PERSONA_ID],
  },
  {
    id: 'creative',
    personaIds: [ELSA_PERSONA_ID],
  },
  {
    id: 'lifestyle',
    personaIds: [CHEF_MARCO_PERSONA_ID, SOFIA_PERSONA_ID],
  },
];
