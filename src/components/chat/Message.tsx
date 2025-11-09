import { useState, memo } from 'react';
import { useAppStore } from '@/store';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Copy, Check, RefreshCw, ThumbsUp, ThumbsDown, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import Markdown from './Markdown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Citations from './Messages/Citations';
import CodeExecutions from './Messages/CodeExecutions';
import StatusHistory from './Messages/StatusHistory';
import WebSearchResults from './Messages/WebSearchResults';
import FollowUps from './Messages/FollowUps';

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  url?: string;
}

interface ChatMessage {
  id: string;
  parentId: string | null;
  childrenIds: string[];
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  files?: FileAttachment[];
  model?: string;
  modelName?: string;
  done?: boolean;
  error?: any;
  statusHistory?: any[];
  status?: any;
  sources?: any[];
  code_executions?: any[];
  followUps?: string[];
  embeds?: any[];
  info?: any;
  annotation?: any;
}

interface MessageProps {
  message: ChatMessage;
  isLast?: boolean;
  siblings?: string[];
  currentIndex?: number;
  onRegenerate?: () => void;
  onEdit?: (content: string) => void;
  onDelete?: () => void;
  onRate?: (rating: number) => void;
  onContinue?: () => void;
  onNavigate?: (direction: 'prev' | 'next') => void;
  onFollowUpClick?: (followUp: string) => void;
  onEmbedClick?: (url: string, title: string) => void;
}

const Message = memo(function Message({ 
  message, 
  isLast = false, 
  siblings = [],
  currentIndex = 0,
  onRegenerate,
  onEdit,
  onDelete,
  onRate,
  onContinue,
  onNavigate,
  onFollowUpClick,
  onEmbedClick
}: MessageProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const user = useAppStore(state => state.user);
  const settings = useAppStore(state => state.settings);
  const widescreenMode = settings?.widescreenMode ?? null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy');
    }
  };

  const handleEdit = () => {
    if (isEditing && onEdit) {
      onEdit(editContent);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const showSiblingNav = siblings.length > 1;

  const chatBubble = settings?.chatBubble ?? true;

  return (
    <div className={`flex flex-col justify-between px-5 mb-3 w-full ${widescreenMode ? 'max-w-full' : 'max-w-5xl'} mx-auto rounded-lg group`}>
      <div className="flex w-full">
        {/* Avatar - only show for non-bubble or assistant */}
        {(!chatBubble || !isUser) && (
          <div className="shrink-0 mr-3 mt-1">
            <Avatar className="h-8 w-8">
              {isUser ? (
                <>
                  <AvatarImage src={user?.profile_image_url} />
                  <AvatarFallback>{user?.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                </>
              ) : (
                <>
                  <AvatarImage src="/static/favicon.png" />
                  <AvatarFallback>AI</AvatarFallback>
                </>
              )}
            </Avatar>
          </div>
        )}

        <div className={`flex-1 w-0 max-w-full ${isUser && chatBubble ? 'pl-1' : ''}`}>
        {/* Header - only show in non-bubble mode or for assistant */}
        {(!chatBubble || !isUser) && (
          <div className={`flex items-center justify-between gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`flex items-center gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
              <span className="font-semibold text-sm">
                {isUser ? (user?.name || 'You') : (message.modelName || 'Assistant')}
              </span>
              
              {message.model && !isUser && (
                <Badge variant="outline" className="text-xs">
                  {message.model}
                </Badge>
              )}
            </div>

            {/* Sibling navigation */}
            {showSiblingNav && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onNavigate?.('prev')}
                  disabled={currentIndex === 0}
                >
                  <span>←</span>
                </Button>
                <span>{currentIndex + 1} / {siblings.length}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onNavigate?.('next')}
                  disabled={currentIndex === siblings.length - 1}
                >
                  <span>→</span>
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Files */}
        {message.files && message.files.length > 0 && (
          <div className={`mb-1 w-full flex flex-col gap-1 flex-wrap ${isUser && chatBubble ? 'items-end' : ''}`}>
            {message.files.map((file) => (
              <div key={file.id} className={isUser && chatBubble ? 'self-end' : ''}>
                {file.type === 'image' && file.url ? (
                  <img 
                    src={file.url} 
                    alt={file.name}
                    className="max-h-96 rounded-lg"
                  />
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <span className="max-w-[200px] truncate">{file.name}</span>
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="w-full markdown-prose">
          {!message.done && message.content === '' ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : isEditing ? (
            <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-3xl px-5 py-3 mb-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[100px] bg-transparent outline-none resize-none"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={handleEdit}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              {message.content && (
                <div className="w-full">
                  <div className={`flex w-full ${isUser && chatBubble ? 'justify-end pb-1' : ''}`}>
                    <div className={`${
                      isUser && chatBubble 
                        ? 'max-w-[90%] px-4 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-3xl'
                        : 'w-full'
                    }`}>
                      {isAssistant ? (
                        <div className="prose dark:prose-invert max-w-none">
                          <Markdown content={message.content} id={`message-${message.id}`} />
                        </div>
                      ) : (
                        <div className="prose dark:prose-invert max-w-none">
                          <p className="whitespace-pre-wrap break-words m-0">{message.content}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Error display */}
              {message.error && (
                <div className="mt-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {message.error.content || 'An error occurred'}
                </div>
              )}
            </>
          )}
        </div>

        {/* Status History and Web Search Results */}
        <StatusHistory 
          statusHistory={message.statusHistory || []} 
          currentStatus={message.status}
        />
        <WebSearchResults statusHistory={message.statusHistory} />

        {/* Code Executions */}
        {message.code_executions && message.code_executions.length > 0 && (
          <CodeExecutions codeExecutions={message.code_executions} />
        )}

        {/* Citations/Sources */}
        {message.sources && message.sources.length > 0 && (
          <Citations 
            id={message.id}
            sources={message.sources} 
            onEmbedClick={onEmbedClick}
          />
        )}

        {/* Follow-ups */}
        {message.followUps && message.followUps.length > 0 && onFollowUpClick && (
          <FollowUps 
            followUps={message.followUps}
            onFollowUpClick={onFollowUpClick}
          />
        )}

        {/* Action buttons */}
        <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 dark:text-gray-500 ${isUser && chatBubble ? 'justify-end' : 'justify-start'}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2"
            title="Copy"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>

          {isAssistant && isLast && onRegenerate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRegenerate}
              className="h-7 px-2"
              title="Regenerate"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          )}

          {isAssistant && isLast && onContinue && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onContinue}
              className="h-7 px-2 text-xs"
              title="Continue"
            >
              Continue
            </Button>
          )}

          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="h-7 px-2"
              title="Edit"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          )}

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isAssistant && onRate && (
                <>
                  <DropdownMenuItem onClick={() => onRate(1)}>
                    <ThumbsUp className="h-3.5 w-3.5 mr-2" />
                    Good response
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onRate(-1)}>
                    <ThumbsDown className="h-3.5 w-3.5 mr-2" />
                    Bad response
                  </DropdownMenuItem>
                </>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo - only re-render if message content actually changed
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.done === nextProps.message.done &&
    prevProps.message.error === nextProps.message.error &&
    prevProps.isLast === nextProps.isLast &&
    JSON.stringify(prevProps.message.statusHistory) === JSON.stringify(nextProps.message.statusHistory) &&
    JSON.stringify(prevProps.message.sources) === JSON.stringify(nextProps.message.sources) &&
    JSON.stringify(prevProps.message.code_executions) === JSON.stringify(nextProps.message.code_executions) &&
    JSON.stringify(prevProps.message.followUps) === JSON.stringify(nextProps.message.followUps)
  );
});

export default Message;
