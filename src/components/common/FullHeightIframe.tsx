import React, { useRef, useEffect, useState } from 'react';

interface FullHeightIframeProps {
  src?: string | null;
  title?: string;
  initialHeight?: number | null;
  iframeClassName?: string;
  args?: any;
  allowScripts?: boolean;
  allowForms?: boolean;
  allowSameOrigin?: boolean;
  allowPopups?: boolean;
  allowDownloads?: boolean;
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
  allowFullscreen?: boolean;
}

export const FullHeightIframe: React.FC<FullHeightIframeProps> = ({
  src = null,
  title = 'Embedded Content',
  initialHeight = null,
  iframeClassName = 'w-full rounded-2xl',
  args = null,
  allowScripts = true,
  allowForms = false,
  allowSameOrigin = false,
  allowPopups = false,
  allowDownloads = true,
  referrerPolicy = 'strict-origin-when-cross-origin',
  allowFullscreen = true,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [iframeDoc, setIframeDoc] = useState<string | null>(null);

  const isUrl = typeof src === 'string' && /^(https?:)?\/\//i.test(src);

  const sandbox = [
    allowScripts && 'allow-scripts',
    allowForms && 'allow-forms',
    allowSameOrigin && 'allow-same-origin',
    allowPopups && 'allow-popups',
    allowDownloads && 'allow-downloads',
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  useEffect(() => {
    if (src) {
      if (isUrl) {
        setIframeSrc(src);
        setIframeDoc(null);
      } else {
        setIframeDoc(src);
        setIframeSrc(null);
      }
    }
  }, [src, isUrl]);

  const resizeSameOrigin = () => {
    if (!iframeRef.current) return;
    try {
      const doc =
        iframeRef.current.contentDocument ||
        iframeRef.current.contentWindow?.document;
      if (!doc) return;
      const h = Math.max(
        doc.documentElement?.scrollHeight ?? 0,
        doc.body?.scrollHeight ?? 0
      );
      if (h > 0) iframeRef.current.style.height = h + 20 + 'px';
    } catch {
      // Cross-origin → rely on postMessage from inside the iframe
    }
  };

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!iframeRef.current || e.source !== iframeRef.current.contentWindow) return;
      const data = e.data as { type?: string; height?: number };
      if (data?.type === 'iframe:height' && typeof data.height === 'number') {
        iframeRef.current.style.height = Math.max(0, data.height) + 'px';
      }
    };

    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
    };
  }, []);

  const onLoad = () => {
    requestAnimationFrame(resizeSameOrigin);

    if (args && iframeRef.current?.contentWindow) {
      (iframeRef.current.contentWindow as any).args = args;
    }
  };

  return (
    <>
      {iframeDoc ? (
        <iframe
          ref={iframeRef}
          srcDoc={iframeDoc}
          title={title}
          className={iframeClassName}
          style={initialHeight ? { height: `${initialHeight}px` } : undefined}
          width="100%"
          frameBorder="0"
          sandbox={sandbox}
          allowFullScreen={allowFullscreen}
          onLoad={onLoad}
        />
      ) : iframeSrc ? (
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          title={title}
          className={iframeClassName}
          style={initialHeight ? { height: `${initialHeight}px` } : undefined}
          width="100%"
          frameBorder="0"
          sandbox={sandbox}
          referrerPolicy={referrerPolicy}
          allowFullScreen={allowFullscreen}
          onLoad={onLoad}
        />
      ) : null}
    </>
  );
};

export default FullHeightIframe;

