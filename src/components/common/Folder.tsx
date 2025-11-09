import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface FolderProps {
  name: string;
  children: ReactNode;
  open?: boolean;
  collapsible?: boolean;
  chevron?: boolean;
  className?: string;
  buttonClassName?: string;
  onAdd?: () => void;
  onAddLabel?: string;
  onChange?: (open: boolean) => void;
}

/**
 * Folder Component
 * Matches Svelte's src/lib/components/common/Folder.svelte
 * 
 * A collapsible folder component for organizing chat items
 */
export default function Folder({
  name,
  children,
  open: initialOpen = true,
  collapsible = true,
  chevron = true,
  className = '',
  buttonClassName = 'text-gray-600 dark:text-gray-400',
  onAdd,
  onAddLabel = '',
  onChange,
}: FolderProps) {
  const [open, setOpen] = useState(initialOpen);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onChange?.(newOpen);
  };

  if (!collapsible) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn('relative', className)}>
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <div
          id="sidebar-folder-button"
          className={cn(
            'w-full group rounded-xl relative flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-900 transition',
            buttonClassName
          )}
        >
          <CollapsibleTrigger asChild>
            <button className="w-full py-1.5 pl-2 flex items-center gap-1.5 text-xs font-medium">
              {chevron && (
                <div className="p-[1px]">
                  {open ? (
                    <ChevronDown className="size-3" strokeWidth={2} />
                  ) : (
                    <ChevronRight className="size-3" strokeWidth={2} />
                  )}
                </div>
              )}

              <div className={cn('translate-y-[0.5px]', chevron ? '' : 'pl-0.5')}>
                {name}
              </div>
            </button>
          </CollapsibleTrigger>

          {onAdd && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    className="absolute z-10 right-2 invisible group-hover:visible self-center flex items-center dark:text-gray-300"
                    onPointerUp={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAdd();
                    }}
                  >
                    <button
                      className="p-0.5 dark:hover:bg-gray-850 rounded-lg touch-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Plus className="size-3" strokeWidth={2.5} />
                    </button>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{onAddLabel}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <CollapsibleContent className="w-full">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
