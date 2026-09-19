type TokenGetter = () => Promise<string | null>;

let tokenGetter: TokenGetter | null = null;

export function setAuthTokenGetter(getter: TokenGetter | null): void {
  tokenGetter = getter;
}

async function clerkSessionToken(): Promise<string | null> {
  const clerk = (window as { Clerk?: { session?: { getToken: () => Promise<string | null> } } })
    .Clerk;
  if (!clerk?.session?.getToken) return null;
  try {
    return await clerk.session.getToken();
  } catch {
    return null;
  }
}

export async function getClerkToken(): Promise<string | null> {
  if (tokenGetter) {
    try {
      const token = await tokenGetter();
      if (token) return token;
    } catch {
      // fall through to Clerk.session
    }
  }
  return clerkSessionToken();
}
