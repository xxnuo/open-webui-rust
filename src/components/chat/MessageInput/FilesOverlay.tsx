import { useEffect, useRef } from 'react';
import { FileUp } from 'lucide-react';
import { useAppStore } from '@/store';

interface FilesOverlayProps {
  show: boolean;
}

export default function FilesOverlay({ show }: FilesOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const { showSidebar } = useAppStore();

  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [show]);

  if (!show) return null;

  return (
    <div
      ref={overlayRef}
      className={`fixed top-0 right-0 bottom-0 w-full h-full flex z-[9999] touch-none pointer-events-none ${
        showSidebar
          ? 'left-0 md:left-[260px] md:w-[calc(100%-260px)]'
          : 'left-0'
      }`}
      id="dropzone"
      role="region"
      aria-label="Drag and Drop Container"
    >
      <div className="absolute w-full h-full backdrop-blur-sm bg-gray-100/50 dark:bg-gray-900/80 flex justify-center">
        <div className="m-auto flex flex-col justify-center items-center">
          <div className="max-w-md text-center">
            <div className="mb-4">
              <FileUp className="size-16 mx-auto text-gray-600 dark:text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
              Drop files here
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Release to upload your files
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

