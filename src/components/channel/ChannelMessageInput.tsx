import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, Smile } from 'lucide-react';
import RichTextInput, { type RichTextInputHandle } from '@/components/common/RichTextInput';

interface ChannelMessageInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
  typingUsers?: Array<{ name: string }>;
}

export default function ChannelMessageInput({
  onSend,
  placeholder,
  disabled = false,
  typingUsers = []
}: ChannelMessageInputProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const editorRef = useRef<RichTextInputHandle>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setMessage('');
    editorRef.current?.setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
      return true;
    }
    return false;
  };

  return (
    <div className="w-full border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-4">
        {/* Typing indicators */}
        {typingUsers.length > 0 && (
          <div className="text-xs text-gray-500 mb-2">
            {typingUsers.map(u => u.name).join(', ')} {typingUsers.length === 1 ? t('is') : t('are')} typing...
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1 border border-gray-200 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-800/50 focus-within:border-primary transition">
            <RichTextInput
              ref={editorRef}
              value={message}
              onChange={(md) => setMessage(md)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || t('Type a message...')}
              editable={!disabled}
              richText={false}
              messageInput={true}
              className="min-h-[60px] max-h-[200px] p-3"
            />
          </div>

          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
            >
              <Paperclip className="size-5" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={disabled}
            >
              <Smile className="size-5" />
            </Button>

            <Button
              type="submit"
              size="icon"
              disabled={!message.trim() || disabled}
              className="shrink-0"
            >
              <Send className="size-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

