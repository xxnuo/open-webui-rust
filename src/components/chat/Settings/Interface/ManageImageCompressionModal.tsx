import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useTranslation } from 'react-i18next';

interface ImageCompressionSettings {
  enabled: boolean;
  maxWidth: number;
  maxHeight: number;
  quality: number;
}

interface ManageImageCompressionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: ImageCompressionSettings;
  onSave: (settings: ImageCompressionSettings) => void;
}

export default function ManageImageCompressionModal({
  open,
  onOpenChange,
  settings,
  onSave
}: ManageImageCompressionModalProps) {
  const { t } = useTranslation();
  const [localSettings, setLocalSettings] = useState<ImageCompressionSettings>(settings);

  useEffect(() => {
    if (open) {
      setLocalSettings(settings);
    }
  }, [open, settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(localSettings);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('Image Compression Settings')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="maxWidth">{t('Max Width (px)')}</Label>
              <Input
                id="maxWidth"
                type="number"
                min="100"
                max="4096"
                value={localSettings.maxWidth}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    maxWidth: parseInt(e.target.value) || 1920
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxHeight">{t('Max Height (px)')}</Label>
              <Input
                id="maxHeight"
                type="number"
                min="100"
                max="4096"
                value={localSettings.maxHeight}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    maxHeight: parseInt(e.target.value) || 1080
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="quality">{t('Quality')}</Label>
                <span className="text-sm text-muted-foreground">
                  {Math.round(localSettings.quality * 100)}%
                </span>
              </div>
              <Slider
                id="quality"
                min={0.1}
                max={1}
                step={0.05}
                value={[localSettings.quality]}
                onValueChange={([value]) =>
                  setLocalSettings({
                    ...localSettings,
                    quality: value
                  })
                }
              />
              <div className="text-xs text-muted-foreground">
                {t('Lower quality reduces file size but may reduce image clarity')}
              </div>
            </div>
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
              {t('Save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

