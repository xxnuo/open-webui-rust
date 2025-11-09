import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { WEBUI_BASE_URL } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { X, ExternalLink } from 'lucide-react';
import type { Banner as BannerType } from '@/store';

interface BannerProps {
  banner: BannerType;
  className?: string;
  onDismiss?: (id: string) => void;
}

const Banner = ({ banner, className = 'mx-2 px-2 rounded-lg', onDismiss }: BannerProps) => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const classNames: Record<string, string> = {
    info: 'bg-blue-500/20 text-blue-700 dark:text-blue-200',
    success: 'bg-green-500/20 text-green-700 dark:text-green-200',
    warning: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-200',
    error: 'bg-red-500/20 text-red-700 dark:text-red-200'
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.(banner.id);
  };

  const getBannerTypeLabel = (type: string) => {
    switch (type.toLowerCase()) {
      case 'info': return t('Info');
      case 'warning': return t('Warning');
      case 'error': return t('Error');
      case 'success': return t('Success');
      default: return type;
    }
  };

  if (dismissed || !mounted) return null;

  const sanitizedContent = DOMPurify.sanitize(
    marked.parse((banner?.content ?? '').replace(/\n/g, '<br>')) as string
  );

  return (
    <div
      className={cn(
        className,
        'top-0 left-0 right-0 py-1 flex justify-center items-center relative border border-transparent',
        'text-gray-800 dark:text-gray-100 bg-transparent backdrop-blur-xl z-30',
        'animate-in fade-in duration-300'
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center flex-1 text-sm w-fit gap-1.5">
        <div className="flex justify-between self-start">
          <div
            className={cn(
              'text-xs font-semibold w-fit px-2 rounded-sm uppercase line-clamp-1 mr-0.5',
              classNames[banner.type] ?? classNames['info']
            )}
          >
            {getBannerTypeLabel(banner.type)}
          </div>

          {banner.url && (
            <div className="flex md:hidden group w-fit md:items-center">
              <a
                className="text-gray-700 dark:text-white text-xs font-semibold underline"
                href={banner.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('Learn More')}
              </a>
              <div className="ml-1 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-white">
                <ExternalLink className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>

        <div
          className="flex-1 text-xs text-gray-700 dark:text-white max-h-60 overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      </div>

      {banner.url && (
        <div className="hidden md:flex group w-fit md:items-center">
          <a
            className="text-gray-700 dark:text-white text-xs font-semibold underline"
            href={banner.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('Learn More')}
          </a>
          <div className="ml-1 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-white">
            <ExternalLink className="size-4" />
          </div>
        </div>
      )}

      {banner.dismissible && (
        <div className="flex self-start">
          <button
            aria-label={t('Close Banner')}
            onClick={handleDismiss}
            className="-mt-1 -mb-2 -translate-y-[1px] ml-1.5 mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default Banner;







