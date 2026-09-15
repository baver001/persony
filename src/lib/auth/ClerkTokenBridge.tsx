import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { setClerkTokenGetter } from '../api/headers';

export function ClerkTokenBridge() {
  const { isSignedIn, getToken } = useAuth();

  useEffect(() => {
    if (isSignedIn) {
      setClerkTokenGetter(() => getToken());
    } else {
      setClerkTokenGetter(null);
    }
  }, [isSignedIn, getToken]);

  return null;
}
