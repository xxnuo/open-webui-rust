import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import panzoom, { PanZoom } from 'panzoom';
import DOMPurify from 'dompurify';
import { toast } from 'sonner';
import { Download, RotateCcw, Copy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

interface SVGPanZoomProps {
  className?: string;
  svg: string;
  content?: string;
}

export const SVGPanZoom: React.FC<SVGPanZoomProps> = ({
  className = '',
  svg,
  content,
}) => {
  const { t } = useTranslation();
  const sceneElementRef = useRef<HTMLDivElement>(null);
  const [instance, setInstance] = useState<PanZoom | null>(null);

  useEffect(() => {
    if (sceneElementRef.current) {
      const panzoomInstance = panzoom(sceneElementRef.current, {
        bounds: true,
        boundsPadding: 0.1,
        zoomSpeed: 0.065,
      });

      setInstance(panzoomInstance);

      return () => {
        panzoomInstance.dispose();
      };
    }
  }, []);

  const resetPanZoomViewport = () => {
    if (instance) {
      instance.moveTo(0, 0);
      instance.zoomAbs(0, 0, 1);
    }
  };

  const downloadAsSVG = () => {
    const svgBlob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    if (content) {
      try {
        await navigator.clipboard.writeText(content);
        toast.success(t('Copied to clipboard'));
      } catch (err) {
        toast.error(t('Failed to copy'));
      }
    }
  };

  const sanitizeSVG = (svgString: string) => {
    return DOMPurify.sanitize(svgString, {
      USE_PROFILES: { svg: true, svgFilters: true },
      WHOLE_DOCUMENT: false,
      ADD_TAGS: ['style', 'foreignObject'],
      ADD_ATTR: [
        'class',
        'style',
        'id',
        'data-*',
        'viewBox',
        'preserveAspectRatio',
        'markerWidth',
        'markerHeight',
        'markerUnits',
        'refX',
        'refY',
        'orient',
        'href',
        'xlink:href',
        'dominant-baseline',
        'text-anchor',
        'clipPathUnits',
        'filterUnits',
        'patternUnits',
        'patternContentUnits',
        'maskUnits',
        'role',
        'aria-label',
        'aria-labelledby',
        'aria-hidden',
        'tabindex',
      ],
      SANITIZE_DOM: true,
    });
  };

  return (
    <div className={`relative ${className}`}>
      <div
        ref={sceneElementRef}
        className="flex h-full max-h-full justify-center items-center"
        dangerouslySetInnerHTML={{ __html: sanitizeSVG(svg) }}
      />

      {content && (
        <div className="absolute top-2.5 right-2.5">
          <div className="flex gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="p-1.5 rounded-lg border border-gray-100 dark:border-none dark:bg-gray-850 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    onClick={downloadAsSVG}
                  >
                    <Download className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('Download as SVG')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="p-1.5 rounded-lg border border-gray-100 dark:border-none dark:bg-gray-850 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    onClick={resetPanZoomViewport}
                  >
                    <RotateCcw className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('Reset view')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="p-1.5 rounded-lg border border-gray-100 dark:border-none dark:bg-gray-850 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    onClick={copyToClipboard}
                  >
                    <Copy className="size-4" strokeWidth={1.5} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('Copy to clipboard')}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
    </div>
  );
};

export default SVGPanZoom;

