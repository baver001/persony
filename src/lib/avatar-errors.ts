export type AvatarErrorCode =
  | 'MODEL_UNAVAILABLE'
  | 'RATE_LIMIT'
  | 'NETWORK'
  | 'INVALID_IMAGE'
  | 'UPLOAD_FAILED'
  | 'GENERATION_FAILED';

export function avatarErrorMessage(
  code: string | undefined,
  fallback: string,
  t: (key: string) => string
): string {
  switch (code) {
    case 'MODEL_UNAVAILABLE':
      return t('avatarErrorModelUnavailable');
    case 'RATE_LIMIT':
      return t('avatarErrorRateLimit');
    case 'NETWORK':
      return t('avatarErrorNetwork');
    case 'INVALID_IMAGE':
    case 'UPLOAD_FAILED':
      return t('avatarUploadFailed');
    case 'GENERATION_FAILED':
      return t('avatarErrorGenerationFailed');
    default:
      return fallback;
  }
}
