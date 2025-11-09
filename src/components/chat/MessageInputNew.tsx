import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, StopCircle } from 'lucide-react';
import { toast } from 'sonner';
import RichTextInput, { type RichTextInputHandle } from '@/components/common/RichTextInput';
import InputMenu from './MessageInput/InputMenu';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  file?: File;
}

interface MessageInputProps {
  onSend: (message: string, files?: FileAttachment[]) => void;
  onStop?: () => void;
  isGenerating?: boolean;
  disabled?: boolean;
  placeholder?: string;
  richText?: boolean;
  webSearchEnabled?: boolean;
  onWebSearchToggle?: () => void;
  imageGenerationEnabled?: boolean;
  onImageGenerationToggle?: () => void;
  codeInterpreterEnabled?: boolean;
  onCodeInterpreterToggle?: () => void;
  selectedToolIds?: string[];
  onToolsSelect?: (toolIds: string[]) => void;
}

export default function MessageInput({
  onSend,
  onStop,
  isGenerating = false,
  disabled = false,
  placeholder = 'Send a message... (Press Enter to send, Shift + Enter for new line)',
  richText = true,
  webSearchEnabled = false,
  onWebSearchToggle,
  imageGenerationEnabled = false,
  onImageGenerationToggle,
  codeInterpreterEnabled = false,
  onCodeInterpreterToggle,
  selectedToolIds = [],
  onToolsSelect
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<FileAttachment[]>([]);

  const editorRef = useRef<RichTextInputHandle>(null);

  const handleSubmit = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled || isGenerating) return;

    onSend(trimmedMessage, files);
    setMessage('');
    setFiles([]);
    
    // Reset editor
    editorRef.current?.setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      // Let RichTextInput handle special cases (code blocks, lists, etc.)
      // If not in special context, submit
      const selection = window.getSelection();
      const node = selection?.focusNode?.parentElement;
      
      // Check if in code block or list
      const isInCodeBlock = node?.closest('pre, code');
      const isInList = node?.closest('ul, ol');
      
      if (!isInCodeBlock && !isInList) {
        e.preventDefault();
        handleSubmit();
        return true;
      }
    }
    return false;
  };

  const handleFileSelect = (selectedFiles: File[]) => {
    const newFiles: FileAttachment[] = selectedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      type: file.type,
      size: file.size,
      file: file,
      url: URL.createObjectURL(file)
    }));

    setFiles([...files, ...newFiles]);
    toast.success(`${selectedFiles.length} file(s) attached`);
  };

  const handleImageSelect = (selectedFiles: File[]) => {
    const newFiles: FileAttachment[] = selectedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      type: 'image',
      size: file.size,
      file: file,
      url: URL.createObjectURL(file)
    }));

    setFiles([...files, ...newFiles]);
    toast.success(`${selectedFiles.length} image(s) attached`);
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles(files.filter((f) => f.id !== fileId));
  };

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((file) => {
        if (file.url) {
          URL.revokeObjectURL(file.url);
        }
      });
    };
  }, [files]);

  return (
    <div className="border-t bg-background">
      <div className="mx-auto max-w-3xl p-4">
        {/* File attachments */}
        {files.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {files.map((file) => (
              <Badge
                key={file.id}
                variant="secondary"
                className="gap-2 pr-1"
              >
                <span className="max-w-[200px] truncate">{file.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 hover:bg-transparent"
                  onClick={() => handleRemoveFile(file.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}

        {/* Feature indicators */}
        {(webSearchEnabled || imageGenerationEnabled || codeInterpreterEnabled || selectedToolIds.length > 0) && (
          <div className="mb-2 flex flex-wrap gap-2">
            {webSearchEnabled && (
              <Badge variant="outline" className="text-xs">
                Web Search Enabled
              </Badge>
            )}
            {imageGenerationEnabled && (
              <Badge variant="outline" className="text-xs">
                Image Generation Enabled
              </Badge>
            )}
            {codeInterpreterEnabled && (
              <Badge variant="outline" className="text-xs">
                Code Interpreter Enabled
              </Badge>
            )}
            {selectedToolIds.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {selectedToolIds.length} Tool(s) Selected
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-end gap-2">
          <InputMenu
            onFileSelect={handleFileSelect}
            onImageSelect={handleImageSelect}
            webSearchEnabled={webSearchEnabled}
            onWebSearchToggle={onWebSearchToggle}
            imageGenerationEnabled={imageGenerationEnabled}
            onImageGenerationToggle={onImageGenerationToggle}
            codeInterpreterEnabled={codeInterpreterEnabled}
            onCodeInterpreterToggle={onCodeInterpreterToggle}
            selectedToolIds={selectedToolIds}
            onToolsSelect={onToolsSelect}
            disabled={disabled || isGenerating}
          />

          <div className="flex-1 relative">
            <RichTextInput
              ref={editorRef}
              value={message}
              onChange={(md) => setMessage(md)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="min-h-[60px] max-h-[200px] overflow-y-auto"
              editable={!disabled}
              richText={richText}
              messageInput={true}
              shiftEnter={true}
            />
          </div>

          {isGenerating ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onStop}
              className="shrink-0"
            >
              <StopCircle className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!message.trim() || disabled}
              className="shrink-0"
            >
              <Send className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

