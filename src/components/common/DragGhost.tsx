import React, { useEffect, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface DragGhostProps {
  x: number;
  y: number;
  children: ReactNode;
}

export const DragGhost: React.FC<DragGhostProps> = ({ x, y, children }) => {
  const popupElementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Disable body scroll when component mounts
    document.body.style.overflow = 'hidden';

    return () => {
      // Re-enable body scroll when component unmounts
      document.body.style.overflow = 'unset';
    };
  }, []);

  return createPortal(
    <div className="fixed top-0 left-0 w-screen h-[100dvh] z-50 touch-none pointer-events-none">
      <div
        ref={popupElementRef}
        className="absolute text-white z-[99999]"
        style={{ top: `${y + 10}px`, left: `${x + 10}px` }}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default DragGhost;

