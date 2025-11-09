import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, ThumbsDown, X, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface RateCommentProps {
  messageId: string;
  rating: number; // 1 for thumbs up, -1 for thumbs down
  existingComment?: string;
  onSubmit: (rating: number, comment: string) => void;
  onClose: () => void;
}

export default function RateComment({
  messageId,
  rating,
  existingComment = '',
  onSubmit,
  onClose
}: RateCommentProps) {
  const [comment, setComment] = useState(existingComment);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(rating, comment);
      onClose();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {rating > 0 ? (
              <>
                <ThumbsUp className="h-5 w-5 text-green-600 dark:text-green-500" />
                Provide Additional Feedback
              </>
            ) : (
              <>
                <ThumbsDown className="h-5 w-5 text-red-600 dark:text-red-500" />
                What Went Wrong?
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {rating > 0
              ? 'Tell us what you liked about this response.'
              : 'Help us improve by explaining what was incorrect or unhelpful.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Your Feedback
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                rating > 0
                  ? 'This response was helpful because...'
                  : 'This response was not helpful because...'
              }
              rows={6}
              className="resize-none"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Your feedback helps improve the AI's responses.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

