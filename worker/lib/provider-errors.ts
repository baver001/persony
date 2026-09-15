export type ProviderErrorKind =
  | 'model_unavailable'
  | 'rate_limit'
  | 'provider_timeout'
  | 'transient_server'
  | 'invalid_request'
  | 'billing_quota'
  | 'user_cancellation'
  | 'unknown';

function extractMessage(err: unknown): string {
  if (!err) return '';
  if (typeof err === 'string') return err;
  if (typeof err === 'object' && err && 'message' in err) {
    return String((err as Error).message);
  }
  return String(err);
}

export function classifyProviderError(err: unknown): ProviderErrorKind {
  const msg = extractMessage(err).toLowerCase();

  if (
    msg.includes('aborterror') ||
    msg.includes('aborted') ||
    msg.includes('cancelled') ||
    msg.includes('canceled')
  ) {
    return 'user_cancellation';
  }

  if (
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('too many requests') ||
    msg.includes('resource exhausted')
  ) {
    return 'rate_limit';
  }

  if (msg.includes('quota') || msg.includes('billing') || msg.includes('payment required')) {
    return 'billing_quota';
  }

  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('deadline')) {
    return 'provider_timeout';
  }

  if (
    msg.includes('no longer available') ||
    msg.includes('not found') ||
    msg.includes('does not exist') ||
    msg.includes('invalid model') ||
    msg.includes('is not supported') ||
    (msg.includes('404') && msg.includes('model'))
  ) {
    return 'model_unavailable';
  }

  if (
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('500') ||
    msg.includes('high demand') ||
    msg.includes('unavailable') ||
    msg.includes('service unavailable') ||
    msg.includes('internal error')
  ) {
    return 'transient_server';
  }

  if (
    msg.includes('400') ||
    msg.includes('bad request') ||
    msg.includes('invalid argument') ||
    msg.includes('malformed')
  ) {
    return 'invalid_request';
  }

  return 'unknown';
}

/** Whether trying the next model in a cascade is appropriate. */
export function shouldFallbackToNextModel(
  kind: ProviderErrorKind,
  streamedAny: boolean
): boolean {
  if (streamedAny) return false;

  return (
    kind === 'model_unavailable' ||
    kind === 'transient_server' ||
    kind === 'provider_timeout'
  );
}
