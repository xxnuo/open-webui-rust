import { useState } from 'react';
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
  sources?: any[];
  code_executions?: any[];
  followUps?: any[];
  embeds?: any[];
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
}

export default function Message({ 
  message, 
  isLast = false, 
  siblings = [],
  currentIndex = 0,
  onRegenerate,
  onEdit,
  onDelete,
  onRate,
  onContinue,
  onNavigate
}: MessageProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const user = useAppStore(state => state.user);

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

  return (
    <div className={`group flex gap-3 px-4 py-6 ${isUser ? 'bg-muted/30' : ''} ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
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

      <div className={`flex-1 space-y-2 overflow-hidden ${isUser ? 'text-right' : 'text-left'}`}>
        {/* Header */}
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

        {/* Files */}
        {message.files && message.files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.files.map((file) => (
              <Badge key={file.id} variant="secondary" className="gap-1">
                {file.type === 'image' && file.url && (
                  <img 
                    src={file.url} 
                    alt={file.name}
                    className="h-4 w-4 rounded object-cover"
                  />
                )}
                <span className="max-w-[200px] truncate">{file.name}</span>
              </Badge>
            ))}
          </div>
        )}

        {/* Content */}
        <div className={`prose dark:prose-invert max-w-none ${isUser ? 'text-left' : ''}`}>
          {!message.done && message.content === '' ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ) : isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full min-h-[100px] p-2 border rounded-md bg-background"
                autoFocus
              />
              <div className="flex gap-2">
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
              {isAssistant ? (
                <Markdown content={message.content} id={`message-${message.id}`} />
              ) : (
                <div className={`${isUser ? 'inline-block max-w-[90%] rounded-3xl px-4 py-2 bg-gray-100 dark:bg-gray-800' : ''}`}>
                  <p className="whitespace-pre-wrap break-words text-left m-0">{message.content}</p>
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

        {/* Status indicators */}
        {message.statusHistory && message.statusHistory.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.statusHistory.map((status: any, idx: number) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {status.action || status.description}
              </Badge>
            ))}
          </div>
        )}

        {/* Sources/Citations */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">Sources:</p>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source: any, idx: number) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {source.name || source.title || `Source ${idx + 1}`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Code executions */}
        {message.code_executions && message.code_executions.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.code_executions.map((execution: any, idx: number) => (
              <div key={idx} className="p-2 rounded-md bg-muted text-xs">
                <div className="font-semibold mb-1">Code Execution {idx + 1}</div>
                <pre className="overflow-x-auto">{execution.output || execution.result}</pre>
              </div>
            ))}
          </div>
        )}

        {/* Follow-ups */}
        {message.followUps && message.followUps.length > 0 && (
          <div className="mt-2 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">Suggested follow-ups:</p>
            <div className="flex flex-wrap gap-2">
              {message.followUps.map((followUp: any, idx: number) => (
                <Button key={idx} variant="outline" size="sm" className="text-xs h-7">
                  {followUp}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'justify-end' : 'justify-start'}`}>
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
  );
}
