import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Paperclip,
  Image as ImageIcon,
  FileText,
  Globe,
  Wrench,
  Terminal,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

interface InputMenuProps {
  onFileSelect?: (files: File[]) => void;
  onImageSelect?: (files: File[]) => void;
  webSearchEnabled?: boolean;
  onWebSearchToggle?: () => void;
  imageGenerationEnabled?: boolean;
  onImageGenerationToggle?: () => void;
  codeInterpreterEnabled?: boolean;
  onCodeInterpreterToggle?: () => void;
  selectedToolIds?: string[];
  onToolsSelect?: (toolIds: string[]) => void;
  disabled?: boolean;
}

export default function InputMenu({
  onFileSelect,
  onImageSelect,
  webSearchEnabled = false,
  onWebSearchToggle,
  imageGenerationEnabled = false,
  onImageGenerationToggle,
  codeInterpreterEnabled = false,
  onCodeInterpreterToggle,
  selectedToolIds = [],
  onToolsSelect,
  disabled = false
}: InputMenuProps) {
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleFileClick = () => {
    fileInputRef.current?.click();
    setOpen(false);
  };

  const handleImageClick = () => {
    imageInputRef.current?.click();
    setOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && onFileSelect) {
      onFileSelect(files);
    }
    e.target.value = '';
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0 && onImageSelect) {
      onImageSelect(files);
    }
    e.target.value = '';
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
        accept=".txt,.pdf,.doc,.docx,.csv,.json,.xml,.html"
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleImageChange}
        accept="image/*"
      />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="shrink-0"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="start">
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={handleFileClick}
            >
              <FileText className="h-4 w-4" />
              <span>Upload Files</span>
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={handleImageClick}
            >
              <ImageIcon className="h-4 w-4" />
              <span>Upload Images</span>
            </Button>

            <div className="h-px bg-border my-1" />

            {onWebSearchToggle && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => {
                  onWebSearchToggle();
                  setOpen(false);
                }}
                data-active={webSearchEnabled}
              >
                <Globe className="h-4 w-4" />
                <span>Web Search</span>
                {webSearchEnabled && (
                  <span className="ml-auto text-xs text-green-600">ON</span>
                )}
              </Button>
            )}

            {onImageGenerationToggle && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => {
                  onImageGenerationToggle();
                  setOpen(false);
                }}
                data-active={imageGenerationEnabled}
              >
                <Sparkles className="h-4 w-4" />
                <span>Image Generation</span>
                {imageGenerationEnabled && (
                  <span className="ml-auto text-xs text-green-600">ON</span>
                )}
              </Button>
            )}

            {onCodeInterpreterToggle && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => {
                  onCodeInterpreterToggle();
                  setOpen(false);
                }}
                data-active={codeInterpreterEnabled}
              >
                <Terminal className="h-4 w-4" />
                <span>Code Interpreter</span>
                {codeInterpreterEnabled && (
                  <span className="ml-auto text-xs text-green-600">ON</span>
                )}
              </Button>
            )}

            {onToolsSelect && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={() => {
                  toast.info('Tools selection coming soon');
                  setOpen(false);
                }}
              >
                <Wrench className="h-4 w-4" />
                <span>Tools</span>
                {selectedToolIds.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {selectedToolIds.length}
                  </span>
                )}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

