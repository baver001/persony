import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Copy, MessagesSquare, Trash2 } from 'lucide-react';

export type MessageContextMenuItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
};

type MessageContextMenuProps = {
  x: number;
  y: number;
  items: MessageContextMenuItem[];
  onClose: () => void;
};

export const MessageContextMenu: React.FC<MessageContextMenuProps> = ({
  x,
  y,
  items,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const padding = 8;
    let left = x;
    let top = y;

    if (left + rect.width > window.innerWidth - padding) {
      left = window.innerWidth - rect.width - padding;
    }
    if (top + rect.height > window.innerHeight - padding) {
      top = window.innerHeight - rect.height - padding;
    }

    setPosition({
      left: Math.max(padding, left),
      top: Math.max(padding, top),
    });
  }, [x, y, items.length]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) return;
      onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const handleScroll = () => onClose();

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', onClose);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[80] min-w-[210px] rounded-xl border border-py-border bg-py-elevated/95 backdrop-blur-md shadow-2xl py-1.5"
      style={{ left: position.left, top: position.top }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="menuitem"
          onClick={() => {
            item.onSelect();
            onClose();
          }}
          className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2.5 transition-colors ${
            item.destructive
              ? 'text-rose-300 hover:bg-rose-500/10'
              : 'text-py-text hover:bg-white/5'
          }`}
        >
          <span className="opacity-70 shrink-0">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export const messageMenuIcons = {
  copy: <Copy className="w-4 h-4" />,
  copyDialog: <MessagesSquare className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
};
