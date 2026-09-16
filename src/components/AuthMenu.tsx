import React from 'react';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react';
import { usePersonyAuth } from './PersonyAuthProvider';

export const AuthMenu: React.FC = () => {
  const { clerkEnabled } = usePersonyAuth();

  if (!clerkEnabled) return null;

  return (
    <div className="flex items-center gap-2 shrink-0">
      <SignedOut>
        <SignInButton mode="modal">
          <button type="button" className="text-xs font-medium text-py-muted hover:text-py-text px-2 py-1">
            Войти
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            type="button"
            className="text-xs font-medium bg-py-accent text-white rounded-lg px-2.5 py-1 hover:opacity-90"
          >
            Регистрация
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'w-8 h-8' } }} />
      </SignedIn>
    </div>
  );
};
