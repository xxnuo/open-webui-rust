import React, { useState, useEffect, ReactNode } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

interface NotePanelProps {
  show: boolean;
  onClose?: () => void;
  children: ReactNode;
  containerId?: string;
}

export const NotePanel: React.FC<NotePanelProps> = ({
  show,
  onClose,
  children,
  containerId = 'note-container',
}) => {
  const [largeScreen, setLargeScreen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1000px)');
    
    const handleMediaQuery = (e: MediaQueryListEvent | MediaQueryList) => {
      setLargeScreen(e.matches);
    };

    handleMediaQuery(mediaQuery);
    mediaQuery.addEventListener('change', handleMediaQuery);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaQuery);
    };
  }, []);

  if (!show) return null;

  if (!largeScreen) {
    return (
      <Sheet open={show} onOpenChange={onClose}>
        <SheetContent side="right" className="w-full sm:w-[400px] p-0">
          <div className="px-3.5 py-2.5 h-screen max-h-dvh flex flex-col">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div className="flex max-h-full min-h-full border-l border-gray-50 dark:border-gray-850">
      <div className="w-full overflow-auto">{children}</div>
    </div>
  );
};

export default NotePanel;

