export type VoiceName = 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' | 'Aoede';

export interface Persona {
  id: string;
  name: string;
  tagline: string;
  description: string;
  systemPrompt: string;
  avatar: string; // URL, data URL, or SVG
  voice: VoiceName;
  category:
    | 'tech'
    | 'philosophy'
    | 'creative'
    | 'mentor'
    | 'fantasy'
    | 'custom'
    | 'official'
    | 'legacy';
  color: string; // Hex color or gradient name
  badge?: string;
  isCustom?: boolean;
  createdAt?: number;
  starterMessages?: string[];
  isOfficial?: boolean;
  sortOrder?: number;
  disclosure?: string;
  installedVersion?: number;
  pinned?: boolean;
}

export interface ChatMessage {
  id: string;
  characterId: string;
  sender: 'user' | 'character' | 'system';
  text: string;
  timestamp: number;
  status?: 'sending' | 'sent' | 'read';
  audioDuration?: number; // if voice message
  audioBlobUrl?: string; // voice audio playback URL
  isVoiceNote?: boolean;
  transcript?: string; // verbatim transcribed speech
  isTranscribing?: boolean; // indicator while Gemini transcribes
  isCallSummary?: boolean;
  callDurationSecs?: number;
  callTranscripts?: Array<{ id: string; sender: 'user' | 'character'; text: string }>;
  isFromVoiceCall?: boolean;
  voiceCallSessionId?: string;
  isError?: boolean;
  clientRequestId?: string;
}

export type CallStatus =
  | 'idle'
  | 'requesting_permissions'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'error'
  | 'auth_required';

export interface CallState {
  characterId: string | null;
  status: CallStatus;
  isMuted: boolean;
  isSpeakerOn: boolean;
  durationSeconds: number;
  errorMessage?: string;
  isModelSpeaking: boolean;
  isUserSpeaking: boolean;
  liveSubtitles: Array<{ id: string; sender: 'user' | 'character'; text: string }>;
}
