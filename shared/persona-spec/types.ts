export type SafetyProfile = 'GENERAL' | 'SENSITIVE' | 'REGULATED';

export type BehaviorVector = {
  warmth: number;
  directness: number;
  initiative: number;
  creativity: number;
  skepticism: number;
  empathy: number;
  humor: number;
  formality: number;
  verbosity: number;
  challenge_level: number;
};

export type ExpertiseDomain = {
  domain: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
};

export type PersonaCapability =
  | 'chat'
  | 'voice'
  | 'web_search'
  | 'files'
  | 'knowledge_base'
  | 'code'
  | 'github'
  | 'images'
  | 'calendar'
  | 'email'
  | 'tools';

export type LocalizedPresentation = Record<
  string,
  {
    tagline?: string;
    description?: string;
    starterMessages?: string[];
    disclosure?: string;
  }
>;

export type PersonaSpecV1 = {
  schemaVersion: 1;
  identity: {
    slug: string;
    isOfficial?: boolean;
    supportedLocales?: string[];
  };
  mission: {
    summary: string;
    objectives: string[];
  };
  behavior: {
    profile: BehaviorVector;
    styleNotes: string[];
  };
  expertise: ExpertiseDomain[];
  capabilities: PersonaCapability[];
  knowledgePolicy: {
    allowUserUploads: boolean;
    citeSources: boolean;
  };
  memoryPolicy: {
    userMemory: boolean;
    relationshipMemory: boolean;
    autoExtract: boolean;
    sensitivePromptRequired: boolean;
  };
  contextPolicy: {
    maxRecentMessages: number;
    includeSummaries: boolean;
  };
  modelPolicy: {
    preferredProvider?: string;
    preferredModel?: string;
  };
  safetyProfile: SafetyProfile;
  presentation: {
    localized: LocalizedPresentation;
  };
  provenance?: {
    author?: string;
    sourcePersonaId?: string;
  };
};

export type PersonaPortableDocument = PersonaSpecV1 & {
  exportVersion: 1;
  exportedAt: string;
};
