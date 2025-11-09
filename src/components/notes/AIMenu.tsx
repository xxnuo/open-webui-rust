import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sparkles, MessageSquare, Edit } from 'lucide-react';

interface AIMenuProps {
  trigger?: ReactNode;
  onEnhance: () => void;
  onChat: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export default function AIMenu({
  trigger,
  onEnhance,
  onChat,
  open,
  onOpenChange,
  className = '',
}: AIMenuProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <Sparkles className="h-4 w-4" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={className}>
        <DropdownMenuItem onClick={onEnhance}>
          <Sparkles className="h-4 w-4 mr-2" />
          Enhance
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onChat}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Chat
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

