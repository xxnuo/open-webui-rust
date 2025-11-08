import { ReactNode, useState } from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface FolderProps {
  name: string;
  children?: ReactNode;
  open?: boolean;
  collapsible?: boolean;
  className?: string;
  buttonClassName?: string;
  chevron?: boolean;
  onAdd?: (() => void) | null;
  onAddLabel?: string;
  onChange?: (open: boolean) => void;
}

export default function Folder({
  name,
  children,
  open: initialOpen = true,
  collapsible = true,
  className = '',
  buttonClassName = 'text-gray-600 dark:text-gray-400',
  chevron = true,
  onAdd = null,
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
    <div className={`relative ${className}`}>
      <Collapsible open={open} onOpenChange={handleOpenChange}>
        <div
          id="sidebar-folder-button"
          className={`w-full group rounded-xl relative flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-900 transition ${buttonClassName}`}
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
              <div className={`translate-y-[0.5px] ${chevron ? '' : 'pl-0.5'}`}>
                {name}
              </div>
            </button>
          </CollapsibleTrigger>

          {onAdd && (
            <button
              className="absolute z-10 right-2 invisible group-hover:visible self-center flex items-center dark:text-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                onAdd();
              }}
              title={onAddLabel}
            >
              <div className="p-0.5 dark:hover:bg-gray-850 rounded-lg">
                <Plus className="size-3" strokeWidth={2.5} />
              </div>
            </button>
          )}
        </div>

        <CollapsibleContent>
          <div className="w-full">{children}</div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

