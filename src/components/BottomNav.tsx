import React from 'react';
import { MessageCircle, Compass, User, Users } from 'lucide-react';

export type AppView = 'chats' | 'discover' | 'rooms' | 'profile';

interface BottomNavProps {
  active: AppView;
  onChange: (view: AppView) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ active, onChange }) => {
  const items: Array<{ id: AppView; label: string; icon: React.ReactNode }> = [
    { id: 'chats', label: 'Chats', icon: <MessageCircle size={20} /> },
    { id: 'discover', label: 'Discover', icon: <Compass size={20} /> },
    { id: 'rooms', label: 'Rooms', icon: <Users size={20} /> },
    { id: 'profile', label: 'Profile', icon: <User size={20} /> },
  ];

  return (
    <nav className="sm:hidden flex border-t border-py-border bg-py-sidebar shrink-0">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] ${
            active === item.id ? 'text-py-accent' : 'text-py-text-muted'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  );
};
