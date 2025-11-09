import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface StatusItem {
  done: boolean;
  action: string;
  description: string;
  urls?: string[];
  query?: string;
}

interface StatusHistoryProps {
  statusHistory: StatusItem[];
  currentStatus?: StatusItem;
}

export default function StatusHistory({ statusHistory, currentStatus }: StatusHistoryProps) {
  if (!statusHistory || statusHistory.length === 0) {
    return null;
  }

  return (
    <div className="my-2 space-y-1">
      {statusHistory.map((status, idx) => (
        <div
          key={idx}
          className="flex items-center gap-2 text-xs"
        >
          {!status.done && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
          <Badge variant="outline" className="text-xs">
            {status.action}
          </Badge>
          {status.description && (
            <span className="text-muted-foreground">{status.description}</span>
          )}
        </div>
      ))}

      {currentStatus && !currentStatus.done && (
        <div className="flex items-center gap-2 text-xs animate-pulse">
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          <Badge variant="outline" className="text-xs">
            {currentStatus.action}
          </Badge>
          {currentStatus.description && (
            <span className="text-muted-foreground">{currentStatus.description}</span>
          )}
        </div>
      )}
    </div>
  );
}

