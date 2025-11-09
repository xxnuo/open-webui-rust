import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { FileText, X, Loader2, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FileItemProps {
  name: string;
  type?: string;
  size?: number;
  url?: string | null;
  item?: any;
  dismissible?: boolean;
  modal?: boolean;
  loading?: boolean;
  edit?: boolean;
  small?: boolean;
  className?: string;
  colorClassName?: string;
  onDismiss?: () => void;
  onClick?: () => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

const decodeString = (str: string): string => {
  try {
    return decodeURIComponent(str);
  } catch (e) {
    return str;
  }
};

export default function FileItem({
  name,
  type = 'file',
  size = 0,
  url = null,
  item = null,
  dismissible = false,
  modal = false,
  loading = false,
  edit = false,
  small = false,
  className = 'w-60',
  colorClassName = 'bg-white dark:bg-gray-850 border border-gray-50 dark:border-gray-800',
  onDismiss,
  onClick
}: FileItemProps) {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    if (item?.file?.data?.content || item?.type === 'file' || modal) {
      setShowModal(true);
    } else if (url) {
      if (type === 'file') {
        window.open(`${url}/content`, '_blank')?.focus();
      } else {
        window.open(url, '_blank')?.focus();
      }
    }
    onClick?.();
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss?.();
  };

  return (
    <>
      <TooltipProvider>
        <div className="relative group">
          <button
            type="button"
            onClick={handleClick}
            className={`relative p-1.5 ${className} flex items-center gap-1 ${colorClassName} ${
              small ? 'rounded-xl p-2' : 'rounded-2xl'
            } text-left hover:opacity-80 transition-opacity`}
          >
            {!small ? (
              <div className="size-10 shrink-0 flex justify-center items-center bg-black/20 dark:bg-white/10 text-white rounded-xl">
                {loading ? (
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <FileText className="h-4.5 w-4.5" />
                )}
              </div>
            ) : (
              <div className="pl-1.5">
                {loading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <FileText className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{type}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div
                className={`font-medium ${small ? 'text-xs' : 'text-sm'} line-clamp-1 break-all`}
              >
                {decodeString(name)}
              </div>
              {!small && size > 0 && (
                <div className="text-xs text-muted-foreground">{formatFileSize(size)}</div>
              )}
            </div>

            {url && !dismissible && (
              <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
            )}

            {dismissible && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleDismiss}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </button>
        </div>
      </TooltipProvider>

      {/* File Modal */}
      {item && (
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {item.filename || name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {item.meta && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold">{t('Metadata')}</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {item.meta.size && (
                      <div>
                        <span className="text-muted-foreground">{t('Size')}:</span>{' '}
                        {formatFileSize(item.meta.size)}
                      </div>
                    )}
                    {item.meta.content_type && (
                      <div>
                        <span className="text-muted-foreground">{t('Type')}:</span>{' '}
                        {item.meta.content_type}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {item.file?.data?.content && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold">{t('Content')}</div>
                  <div className="p-4 rounded-lg bg-muted max-h-96 overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap break-words">
                      {item.file.data.content}
                    </pre>
                  </div>
                </div>
              )}

              {url && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('Open in new tab')}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

