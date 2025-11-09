import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import Markdown from '../Markdown';

interface ThinkingDisplayProps {
  content: string;
  defaultExpanded?: boolean;
  className?: string;
}

export default function ThinkingDisplay({ 
  content, 
  defaultExpanded = false,
  className = '' 
}: ThinkingDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!content || content.trim().length === 0) {
    return null;
  }

  return (
    <div className={cn(
      "my-2 rounded-lg border bg-muted/30 overflow-hidden",
      className
    )}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-start gap-2 rounded-none hover:bg-muted/50"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <span className="font-medium text-sm">Reasoning Process</span>
        <span className="text-xs text-muted-foreground ml-auto">
          {isExpanded ? 'Hide' : 'Show'} thinking
        </span>
      </Button>

      {isExpanded && (
        <div className="p-4 border-t bg-card/50">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Markdown content={content} />
          </div>
        </div>
      )}
    </div>
  );
}

