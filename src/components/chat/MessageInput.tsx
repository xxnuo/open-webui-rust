import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Send, StopCircle, Paperclip, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import { WEBUI_BASE_URL } from '@/lib/constants';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { models, temporaryChatEnabled } = useAppStore();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage && files.length === 0) return;
    if (disabled || isGenerating) return;

    onSend(trimmedMessage, files);
    setMessage('');
    setFiles([]);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles: FileAttachment[] = selectedFiles.map((file) => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      type: file.type.startsWith('image/') ? 'image' : 'file',
      size: file.size,
      file: file,
      url: URL.createObjectURL(file)
    }));

    setFiles([...files, ...newFiles]);
    toast.success(`${selectedFiles.length} file(s) attached`);
    e.target.value = '';
  };

  const handleRemoveFile = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file?.url) {
      URL.revokeObjectURL(file.url);
    }
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

  const { settings } = useAppStore();
  const widescreenMode = settings?.widescreenMode ?? null;

  return (
    <div className="w-full font-primary">
      <div className="mx-auto inset-x-0 bg-transparent flex justify-center">
        <div className={`flex flex-col px-3 w-full ${widescreenMode ? 'max-w-full' : 'max-w-6xl'}`}>
          <div className="bg-transparent">
            <div className="px-2.5 mx-auto inset-x-0">
              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                hidden
                onChange={handleFileSelect}
                accept=".txt,.pdf,.doc,.docx,.csv,.json,.xml,.html"
              />
              <input
                ref={imageInputRef}
                type="file"
                multiple
                hidden
                onChange={handleFileSelect}
                accept="image/*"
              />

              <form
                className="w-full flex flex-col gap-1.5"
                onSubmit={handleSubmit}
              >
                <div
                  id="message-input-container"
                  className={`flex-1 flex flex-col relative w-full shadow-lg rounded-3xl border ${
                    temporaryChatEnabled
                      ? 'border-dashed border-gray-100 dark:border-gray-800 hover:border-gray-200 focus-within:border-gray-200 hover:dark:border-gray-700 focus-within:dark:border-gray-700'
                      : 'border-gray-100 dark:border-gray-850 hover:border-gray-200 focus-within:border-gray-100 hover:dark:border-gray-800 focus-within:dark:border-gray-800'
                  } transition px-1 bg-white/5 dark:bg-gray-500/5 backdrop-blur-sm dark:text-gray-100`}
                >
                  {/* File attachments */}
                  {files.length > 0 && (
                    <div className="mx-2 mt-2.5 pb-1.5 flex items-center flex-wrap gap-2">
                      {files.map((file) => (
                        <div key={file.id} className="relative group">
                          {file.type === 'image' && file.url ? (
                            <div className="relative flex items-center">
                              <img
                                src={file.url}
                                alt={file.name}
                                className="size-10 rounded-xl object-cover"
                              />
                              <div className="absolute -top-1 -right-1">
                                <button
                                  type="button"
                                  className="bg-white text-black border border-white rounded-full group-hover:visible invisible transition"
                                  onClick={() => handleRemoveFile(file.id)}
                                >
                                  <X className="size-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
                              <span className="text-xs truncate max-w-[150px]">{file.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(file.id)}
                                className="hover:text-red-500"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Input area */}
                  <div className="px-2.5">
                    <div
                      className={`scrollbar-hidden bg-transparent dark:text-gray-100 outline-hidden w-full pb-1 px-1 resize-none h-fit max-h-96 overflow-auto ${
                        files.length === 0 ? 'pt-2.5' : ''
                      }`}
                    >
                      <textarea
                        ref={textareaRef}
                        id="chat-input"
                        className="w-full bg-transparent outline-none resize-none min-h-[24px] max-h-96"
                        placeholder={placeholder}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        rows={1}
                      />
                    </div>
                  </div>

                  {/* Bottom controls */}
                  <div className="pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-1 px-2">
                      {/* Attach files button */}
                      <button
                        type="button"
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled || isGenerating}
                      >
                        <Paperclip className="size-5" />
                      </button>

                      {/* Attach images button */}
                      <button
                        type="button"
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={disabled || isGenerating}
                      >
                        <ImageIcon className="size-5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1 px-2">
                      {/* Send or Stop button */}
                      {isGenerating ? (
                        <button
                          type="button"
                          onClick={onStop}
                          className="p-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition"
                        >
                          <StopCircle className="size-5" />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={(!message.trim() && files.length === 0) || disabled}
                          className="p-2 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send className="size-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
