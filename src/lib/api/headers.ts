const DEV_USER_KEY = 'persony_dev_user_id';

let tokenGetter: (() => Promise<string | null>) | null = null;

export function setClerkTokenGetter(getter: (() => Promise<string | null>) | null): void {
  tokenGetter = getter;
}

export async function getApiHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (tokenGetter) {
    try {
      const token = await tokenGetter();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
        return headers;
      }
    } catch {
      // fall through to dev headers
    }
  }

  if (import.meta.env?.DEV) {
    let devUser = localStorage.getItem(DEV_USER_KEY);
    if (!devUser) {
      devUser = `dev_${crypto.randomUUID().slice(0, 8)}`;
      localStorage.setItem(DEV_USER_KEY, devUser);
    }
    headers['X-Persony-Dev-User-Id'] = devUser;
  }

  return headers;
}
