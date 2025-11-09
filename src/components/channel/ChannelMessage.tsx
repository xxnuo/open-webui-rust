import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { MoreVertical, Reply, Smile, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import Markdown from '@/components/chat/Markdown';

interface ChannelMessageProps {
  message: {
    id: string;
    content: string;
    user: {
      id: string;
      name: string;
      profile_image_url?: string;
    };
    created_at: number;
    reactions?: Array<{
      emoji: string;
      count: number;
      user_ids: string[];
    }>;
    thread_count?: number;
  };
  currentUserId: string;
  onReply?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onDelete?: (messageId: string) => void;
}

export default function ChannelMessage({
  message,
  currentUserId,
  onReply,
  onReact,
  onDelete
}: ChannelMessageProps) {
  const { t } = useTranslation();
  const [showActions, setShowActions] = useState(false);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const isOwnMessage = message.user.id === currentUserId;

  return (
    <div
      className="group px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="shrink-0">
          {message.user.profile_image_url ? (
            <img
              src={message.user.profile_image_url}
              alt={message.user.name}
              className="size-10 rounded-full"
            />
          ) : (
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
              {message.user.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-semibold text-sm">{message.user.name}</span>
            <span className="text-xs text-gray-500">
              {formatTime(message.created_at)}
            </span>
          </div>

          {/* Content */}
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Markdown content={message.content} />
          </div>

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {message.reactions.map((reaction, index) => (
                <button
                  key={index}
                  onClick={() => onReact?.(message.id, reaction.emoji)}
                  className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${
                    reaction.user_ids.includes(currentUserId)
                      ? 'bg-primary/20 border border-primary'
                      : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                  } hover:bg-primary/30 transition`}
                >
                  <span>{reaction.emoji}</span>
                  <span>{reaction.count}</span>
                </button>
              ))}
              <button
                onClick={() => {
                  // Show emoji picker
                  toast.info(t('Emoji picker coming soon'));
                }}
                className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                <Smile className="size-3" />
              </button>
            </div>
          )}

          {/* Thread info */}
          {message.thread_count && message.thread_count > 0 && (
            <button
              onClick={() => onReply?.(message.id)}
              className="mt-2 text-xs text-primary hover:underline"
            >
              {message.thread_count} {message.thread_count === 1 ? t('reply') : t('replies')}
            </button>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-start gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReact?.(message.id, '👍')}
            >
              <Smile className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onReply?.(message.id)}
            >
              <Reply className="size-4" />
            </Button>
            {isOwnMessage && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onDelete?.(message.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="size-4 mr-2" />
                    {t('Delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

