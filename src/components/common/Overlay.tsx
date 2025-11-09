import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  showCloseButton?: boolean;
  closeOnClickOutside?: boolean;
  className?: string;
  contentClassName?: string;
}

export default function Overlay({
  open,
  onClose,
  children,
  title,
  showCloseButton = true,
  closeOnClickOutside = true,
  className = '',
  contentClassName = '',
}: OverlayProps) {
  useEffect(() => {
    if (open) {
      // Prevent body scroll when overlay is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm',
        'animate-in fade-in duration-200',
        className
      )}
      onClick={closeOnClickOutside ? onClose : undefined}
    >
      <div
        className={cn(
          'fixed inset-4 md:inset-8 bg-card rounded-lg shadow-lg',
          'flex flex-col overflow-hidden',
          'animate-in zoom-in-95 duration-200',
          contentClassName
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b">
            {title && <h2 className="text-lg font-semibold">{title}</h2>}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className={cn(!title && 'ml-auto')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

