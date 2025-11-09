import React, { useEffect, useState, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface NotificationToastProps {
  title?: string;
  content: string;
  onClick?: () => void;
  onClose?: () => void;
  playSound?: boolean;
}

const DRAG_THRESHOLD_PX = 6;

export const NotificationToast: React.FC<NotificationToastProps> = ({
  title = 'Notification',
  content,
  onClick,
  onClose,
  playSound = true,
}) => {
  const [moved, setMoved] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);

  useEffect(() => {
    if (playSound) {
      // Check if user has interacted with the page
      if (navigator.userActivation?.hasBeenActive) {
        const audio = new Audio('/audio/notification.mp3');
        audio.play().catch(() => {
          // Silently fail if audio playback is not allowed
        });
      }
    }
  }, [playSound]);

  const handlePointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    startY.current = e.clientY;
    setMoved(false);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (moved) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (dx * dx + dy * dy > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
      setMoved(true);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (!moved && onClick) {
      onClick();
      onClose?.();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onClick) {
        onClick();
        onClose?.();
      }
    }
  };

  const renderContent = () => {
    try {
      const html = marked(content || '') as string;
      return DOMPurify.sanitize(html);
    } catch {
      return content;
    }
  };

  return (
    <div
      className="flex gap-2.5 text-left min-w-[var(--width)] w-full dark:bg-gray-850 dark:text-white bg-white text-black border border-gray-100 dark:border-gray-800 rounded-3xl px-4 py-3.5 cursor-pointer select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => setMoved(true)}
      onKeyDown={handleKeyDown}
      onDragStart={(e) => e.preventDefault()}
      tabIndex={0}
      role="button"
    >
      <div className="shrink-0 self-top -translate-y-0.5">
        <img
          src="/favicon.png"
          alt="favicon"
          className="size-6 rounded-full"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      <div>
        {title && (
          <div className="text-[13px] font-medium mb-0.5 line-clamp-1">{title}</div>
        )}

        <div
          className="line-clamp-2 text-xs self-center dark:text-gray-300 font-normal"
          dangerouslySetInnerHTML={{ __html: renderContent() }}
        />
      </div>
    </div>
  );
};

export default NotificationToast;

