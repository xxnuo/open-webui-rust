import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WEBUI_BASE_URL } from '@/lib/constants';
import ImagePreview from './ImagePreview';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface ImageProps {
  src: string;
  alt?: string;
  className?: string;
  imageClassName?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export default function Image({
  src,
  alt = '',
  className = 'w-full',
  imageClassName = 'rounded-lg',
  dismissible = false,
  onDismiss
}: ImageProps) {
  const { t } = useTranslation();
  const [showPreview, setShowPreview] = useState(false);

  const _src = src.startsWith('/') ? `${WEBUI_BASE_URL}${src}` : src;

  return (
    <>
      <ImagePreview
        show={showPreview}
        onClose={() => setShowPreview(false)}
        src={_src}
        alt={alt}
      />

      <div className="relative group w-fit flex items-center">
        <button
          type="button"
          className={className}
          onClick={() => setShowPreview(true)}
          aria-label={t('Show image preview')}
        >
          <img src={_src} alt={alt} className={imageClassName} draggable={false} data-cy="image" />
        </button>

        {dismissible && (
          <div className="absolute -top-1 -right-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 bg-white text-black border border-white rounded-full group-hover:visible invisible transition"
              onClick={onDismiss}
              aria-label={t('Remove image')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

