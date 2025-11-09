import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Mic, Headphones, Upload, CloudUpload } from 'lucide-react';

interface RecordMenuProps {
  trigger?: ReactNode;
  onRecord: () => void;
  onCaptureAudio: () => void;
  onUpload: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export default function RecordMenu({
  trigger,
  onRecord,
  onCaptureAudio,
  onUpload,
  open,
  onOpenChange,
  className = '',
}: RecordMenuProps) {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="icon">
            <Mic className="h-4 w-4" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={className}>
        <DropdownMenuItem onClick={onRecord}>
          <Mic className="h-4 w-4 mr-2" />
          Record
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCaptureAudio}>
          <Headphones className="h-4 w-4 mr-2" />
          Capture Audio
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onUpload}>
          <CloudUpload className="h-4 w-4 mr-2" />
          Upload Audio
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

