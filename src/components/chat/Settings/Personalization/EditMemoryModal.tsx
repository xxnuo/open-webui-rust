import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { updateMemoryById } from '@/lib/apis/memories';

interface Memory {
  id: string;
  content: string;
}

interface EditMemoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memory: Memory | null;
  onSave: () => void;
}

export default function EditMemoryModal({
  open,
  onOpenChange,
  memory,
  onSave
}: EditMemoryModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');

  useEffect(() => {
    if (open && memory) {
      setContent(memory.content);
    }
  }, [open, memory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!memory || !content.trim()) {
      toast.error(t('Please enter memory content'));
      return;
    }

    setLoading(true);

    try {
      const res = await updateMemoryById(localStorage.token, memory.id, content);
      
      if (res) {
        toast.success(t('Memory updated successfully'));
        onOpenChange(false);
        onSave();
      }
    } catch (error) {
      console.error('Error updating memory:', error);
      toast.error(t('Failed to update memory'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('Edit Memory')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[150px] resize-y"
              placeholder={t('Enter a detail about yourself for your LLMs to recall')}
              disabled={loading}
            />
            <div className="text-xs text-muted-foreground">
              ⓘ {t('Refer to yourself as "User" (e.g., "User is learning Spanish")')}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('Save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

