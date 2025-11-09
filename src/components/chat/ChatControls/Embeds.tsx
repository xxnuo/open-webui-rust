import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface EmbedData {
  url: string;
  title?: string;
}

interface EmbedsProps {
  embed: EmbedData | null;
  onClose: () => void;
  overlay?: boolean;
}

export default function Embeds({ embed, onClose, overlay = false }: EmbedsProps) {
  if (!embed) return null;

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center py-3 px-4 border-b bg-background">
        <div className="flex items-center space-x-2 flex-1">
          <span className="font-medium text-sm">
            {embed.title || 'Embedded Content'}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-full"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Iframe Container */}
      <div className="flex-1 relative w-full">
        {overlay && (
          <div className="absolute inset-0 z-10 pointer-events-none" />
        )}
        
        <iframe
          src={embed.url}
          className="w-full h-full border-0"
          title={embed.title || 'Embedded content'}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          allowFullScreen
        />
      </div>
    </div>
  );
}

