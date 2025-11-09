import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';

interface FollowUpsProps {
  followUps: string[];
  onFollowUpClick: (followUp: string) => void;
}

export default function FollowUps({ followUps, onFollowUpClick }: FollowUpsProps) {
  if (!followUps || followUps.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
        <MessageSquare className="h-3 w-3" />
        <span>Suggested follow-ups:</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {followUps.map((followUp, idx) => (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            onClick={() => onFollowUpClick(followUp)}
            className="h-8 text-xs"
          >
            {followUp}
          </Button>
        ))}
      </div>
    </div>
  );
}

