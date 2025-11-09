import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface ManifestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  manifest: {
    funding_url?: string;
  };
}

export default function ManifestModal({
  open,
  onOpenChange,
  manifest
}: ManifestModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('Show your support!')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <p>
            {t(
              'The developers behind this plugin are passionate volunteers from the community. If you find this plugin helpful, please consider contributing to its development.'
            )}
          </p>

          <p>
            {t(
              'Your entire contribution will go directly to the plugin developer; Open WebUI does not take any percentage. However, the chosen funding platform might have its own fees.'
            )}
          </p>

          <hr className="dark:border-gray-800" />

          {manifest.funding_url && (
            <p>
              {t('Support this plugin:')}
              {' '}
              <a
                href={manifest.funding_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {manifest.funding_url}
              </a>
            </p>
          )}

          <div className="flex justify-end pt-2">
            <Button onClick={() => onOpenChange(false)}>
              {t('Done')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

