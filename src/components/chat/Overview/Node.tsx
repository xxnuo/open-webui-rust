import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Bot, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NodeData {
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  avatar?: string;
  error?: boolean;
  timestamp?: number;
}

function CustomNode({ data, selected }: NodeProps<NodeData>) {
  const isUser = data.role === 'user';
  const isAssistant = data.role === 'assistant';
  const isSystem = data.role === 'system';

  const truncateContent = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div
      className={cn(
        'px-4 py-3 rounded-lg shadow-md border-2 bg-card min-w-[200px] max-w-[300px]',
        selected ? 'border-primary' : 'border-border',
        data.error && 'border-destructive'
      )}
    >
      <Handle type="target" position={Position.Top} className="w-2 h-2" />
      
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="h-8 w-8 shrink-0">
          {data.avatar ? (
            <AvatarImage src={data.avatar} alt={data.role} />
          ) : (
            <AvatarFallback>
              {isUser && <User className="h-4 w-4" />}
              {isAssistant && <Bot className="h-4 w-4" />}
              {isSystem && <AlertCircle className="h-4 w-4" />}
            </AvatarFallback>
          )}
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium capitalize">{data.role}</span>
            {data.model && (
              <Badge variant="secondary" className="text-xs">
                {data.model}
              </Badge>
            )}
            {data.error && (
              <Badge variant="destructive" className="text-xs">
                Error
              </Badge>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground line-clamp-3 break-words">
            {truncateContent(data.content)}
          </p>

          {data.timestamp && (
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(data.timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} className="w-2 h-2" />
    </div>
  );
}

export default memo(CustomNode);

