export type StructuredLogPayload = Record<string, unknown>;

export function logEvent(event: string, payload: StructuredLogPayload = {}): void {
  const line = JSON.stringify({
    event,
    ts: new Date().toISOString(),
    ...payload,
  });
  console.log(line);
}
