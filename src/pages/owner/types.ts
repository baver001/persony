export type OwnerSectionId =
  | 'overview'
  | 'economy'
  | 'ai'
  | 'pricing'
  | 'inference'
  | 'users'
  | 'personas'
  | 'memory'
  | 'battery'
  | 'audit'
  | 'errors'
  | 'settings';

export type OwnerNavGroup = {
  id: string;
  labelKey: string;
  sections: OwnerSectionId[];
};
