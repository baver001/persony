export type AuthProvider = 'clerk' | 'dev';

export type PersonyUser = {
  id: string;
  authProvider: AuthProvider;
  authProviderId: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};
