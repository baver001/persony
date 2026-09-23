import { getApiHeaders } from './headers';

export const BATTERY_TOPUP_CLICK_EVENT = 'battery_topup_click';

export async function trackProductAnalyticsEvent(
  eventName: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const res = await fetch('/api/me/analytics/events', {
    method: 'POST',
    headers: {
      ...(await getApiHeaders()),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ eventName, properties }),
  });

  if (res.status === 401) return;
  if (!res.ok) throw new Error('Failed to track analytics event');
}
