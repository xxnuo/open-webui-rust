import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, Search } from 'lucide-react';

interface WebSearchResult {
  url: string;
  title: string;
  snippet?: string;
}

interface WebSearchResultsProps {
  statusHistory?: any[];
}

export default function WebSearchResults({ statusHistory }: WebSearchResultsProps) {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<WebSearchResult | null>(null);

  if (!statusHistory || statusHistory.length === 0) {
    return null;
  }

  // Extract web search results from status history
  const webSearches = statusHistory.filter(
    (status) => status.action === 'web_search' && status.urls && status.urls.length > 0
  );

  if (webSearches.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mt-2 space-y-2">
        {webSearches.map((search, searchIdx) => (
          <div key={searchIdx} className="space-y-1">
            {search.query && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Search className="h-3 w-3" />
                <span>{search.query}</span>
              </div>
            )}
            
            <div className="flex flex-wrap gap-1">
              {search.urls.map((url: string, urlIdx: number) => (
                <a
                  key={urlIdx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-xs"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span className="max-w-[200px] truncate">{url}</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal for detailed view */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              {t('Web Search Results')}
            </DialogTitle>
          </DialogHeader>

          {selectedResult && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">{selectedResult.title}</h3>
                {selectedResult.snippet && (
                  <p className="text-sm text-muted-foreground">{selectedResult.snippet}</p>
                )}
                <a
                  href={selectedResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {selectedResult.url}
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

