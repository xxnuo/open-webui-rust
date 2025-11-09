import { ReactNode, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CollapsibleProps {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  icon?: ReactNode;
}

export default function Collapsible({
  title,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  className = '',
  contentClassName = '',
  headerClassName = '',
  icon,
}: CollapsibleProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  
  const handleToggle = () => {
    const newOpen = !isOpen;
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      <Button
        variant="ghost"
        onClick={handleToggle}
        className={cn(
          'w-full justify-start gap-2 rounded-none hover:bg-muted/50',
          headerClassName
        )}
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="flex-1 text-left">{title}</span>
      </Button>

      {isOpen && (
        <div className={cn('p-4 border-t bg-card', contentClassName)}>
          {children}
        </div>
      )}
    </div>
  );
}

