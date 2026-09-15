import React from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/clerk-react';

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

export const AuthBar: React.FC = () => {
  if (!clerkKey) return null;

  return (
    <div className="flex items-center gap-2">
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-lg border border-py-border px-3 py-1.5 text-xs font-medium text-py-text hover:bg-py-hover"
          >
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  );
};

export function isClerkEnabled(): boolean {
  return Boolean(clerkKey);
}
