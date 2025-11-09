import { useState } from 'react';
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
import { addNewMemory } from '@/lib/apis/memories';

interface AddMemoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export default function AddMemoryModal({
  open,
  onOpenChange,
  onSave
}: AddMemoryModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error(t('Please enter memory content'));
      return;
    }

    setLoading(true);

    try {
      const res = await addNewMemory(localStorage.token, content);
      
      if (res) {
        toast.success(t('Memory added successfully'));
        setContent('');
        onOpenChange(false);
        onSave();
      }
    } catch (error) {
      console.error('Error adding memory:', error);
      toast.error(t('Failed to add memory'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('Add Memory')}</DialogTitle>
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
              {t('Add')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

