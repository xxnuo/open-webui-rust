import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AttachWebpageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { type: 'web' | 'youtube'; url: string }) => void;
}

const isValidHttpUrl = (string: string) => {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
};

const isYoutubeUrl = (url: string) => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

export default function AttachWebpageModal({
  open,
  onOpenChange,
  onSubmit
}: AttachWebpageModalProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isValidHttpUrl(url)) {
      onSubmit({
        type: isYoutubeUrl(url) ? 'youtube' : 'web',
        url: url
      });
      
      onOpenChange(false);
      setUrl('');
    } else {
      toast.error(t('Please enter a valid URL.'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('Attach Webpage')}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="webpage-url">{t('Webpage URL')}</Label>
            <Input
              id="webpage-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              autoComplete="off"
              required
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('Cancel')}
            </Button>
            <Button type="submit">
              {t('Add')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

