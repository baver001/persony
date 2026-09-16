import { getClerkToken } from './auth';

const DEV_USER_KEY = 'persony_dev_user_id';

export async function getApiHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const clerkToken = await getClerkToken();
  if (clerkToken) {
    headers.Authorization = `Bearer ${clerkToken}`;
    return headers;
  }

  if (import.meta.env.DEV) {
    let devUser = localStorage.getItem(DEV_USER_KEY);
    if (!devUser) {
      devUser = `dev_${crypto.randomUUID().slice(0, 8)}`;
      localStorage.setItem(DEV_USER_KEY, devUser);
    }
    headers['X-Persony-Dev-User-Id'] = devUser;
  }

  return headers;
}

export async function getLiveInitCredentials(): Promise<{
  authToken?: string;
  devUserId?: string;
}> {
  const clerkToken = await getClerkToken();
  if (clerkToken) return { authToken: clerkToken };

  if (import.meta.env.DEV) {
    let devUser = localStorage.getItem(DEV_USER_KEY);
    if (!devUser) {
      devUser = `dev_${crypto.randomUUID().slice(0, 8)}`;
      localStorage.setItem(DEV_USER_KEY, devUser);
    }
    return { devUserId: devUser };
  }

  return {};
}
