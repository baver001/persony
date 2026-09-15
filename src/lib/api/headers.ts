const DEV_USER_KEY = 'persony_dev_user_id';

export function getApiHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const clerkToken = localStorage.getItem('persony_clerk_token');
  if (clerkToken) {
    headers.Authorization = `Bearer ${clerkToken}`;
  } else if (import.meta.env?.DEV) {
    let devUser = localStorage.getItem(DEV_USER_KEY);
    if (!devUser) {
      devUser = `dev_${crypto.randomUUID().slice(0, 8)}`;
      localStorage.setItem(DEV_USER_KEY, devUser);
    }
    headers['X-Persony-Dev-User-Id'] = devUser;
  }

  return headers;
}
