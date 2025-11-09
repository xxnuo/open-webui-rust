import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ExternalLink, FileText } from 'lucide-react';

interface CitationSource {
  id: string;
  name?: string;
  url?: string;
  embed_url?: string;
  document: string[];
  metadata: any[];
  distances?: number[];
}

interface CitationsProps {
  id: string;
  sources: any[];
  onEmbedClick?: (url: string, title: string) => void;
}

export default function Citations({ id, sources, onEmbedClick }: CitationsProps) {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<CitationSource | null>(null);
  const [showCitations, setShowCitations] = useState(false);

  // Process sources into citations
  const citations: CitationSource[] = sources.reduce((acc: CitationSource[], source: any) => {
    if (Object.keys(source).length === 0) {
      return acc;
    }

    source?.document?.forEach((document: string, index: number) => {
      const metadata = source?.metadata?.[index];
      const distance = source?.distances?.[index];

      const id = metadata?.source ?? source?.source?.id ?? 'N/A';
      let _source = source?.source;

      if (metadata?.name) {
        _source = { ..._source, name: metadata.name };
      }

      if (id.startsWith('http://') || id.startsWith('https://')) {
        _source = { ..._source, name: id, url: id };
      }

      const existingSource = acc.find((item) => item.id === id);

      if (existingSource) {
        existingSource.document.push(document);
        existingSource.metadata.push(metadata);
        if (distance !== undefined) existingSource.distances.push(distance);
      } else {
        acc.push({
          id: id,
          name: _source?.name ?? id,
          url: _source?.url,
          embed_url: _source?.embed_url,
          document: [document],
          metadata: [metadata],
          distances: distance !== undefined ? [distance] : []
        });
      }
    });

    return acc;
  }, []);

  // Calculate relevance display settings
  const distances = citations.flatMap((citation) => citation.distances ?? []);
  const showRelevance = (() => {
    if (distances.length === 0) return false;
    const inRange = distances.filter((d) => d !== undefined && d >= -1 && d <= 1).length;
    const outOfRange = distances.filter((d) => d !== undefined && (d < -1 || d > 1)).length;
    if (
      (inRange === distances.length - 1 && outOfRange === 1) ||
      (outOfRange === distances.length - 1 && inRange === 1)
    ) {
      return false;
    }
    return true;
  })();

  const showPercentage = distances.every((d) => d !== undefined && d >= -1 && d <= 1);

  const handleCitationClick = (citation: CitationSource, index: number) => {
    if (citation.embed_url && onEmbedClick) {
      onEmbedClick(citation.embed_url, citation.name || 'Embedded Content');
    } else {
      setSelectedCitation(citation);
      setShowModal(true);
    }
  };

  if (citations.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mt-2">
        <button
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowCitations(!showCitations)}
        >
          <FileText className="h-3 w-3" />
          <span>{citations.length} {t('source', { count: citations.length })}</span>
        </button>

        {showCitations && (
          <div className="mt-2 space-y-1">
            {citations.map((citation, index) => {
              const avgDistance = citation.distances.length > 0
                ? citation.distances.reduce((a, b) => a + b, 0) / citation.distances.length
                : null;
              
              const relevanceScore = avgDistance !== null ? ((1 - avgDistance) * 100) : null;

              return (
                <div
                  key={`${citation.id}-${index}`}
                  className="flex items-center gap-2 text-xs"
                >
                  <button
                    onClick={() => handleCitationClick(citation, index)}
                    className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left"
                  >
                    <Badge variant="outline" className="shrink-0">
                      {index + 1}
                    </Badge>
                    <span className="flex-1 truncate">{citation.name}</span>
                    {citation.url && (
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                  </button>

                  {showRelevance && relevanceScore !== null && (
                    <div className="shrink-0 text-xs text-muted-foreground">
                      {showPercentage
                        ? `${relevanceScore.toFixed(0)}%`
                        : relevanceScore.toFixed(2)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Citation Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedCitation?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedCitation && (
            <div className="space-y-4">
              {selectedCitation.url && (
                <div className="flex items-center gap-2">
                  <a
                    href={selectedCitation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {selectedCitation.url}
                  </a>
                </div>
              )}

              <div className="space-y-3">
                {selectedCitation.document.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-muted text-sm"
                  >
                    <div className="prose dark:prose-invert max-w-none">
                      <p className="text-sm whitespace-pre-wrap">{doc}</p>
                    </div>
                    
                    {selectedCitation.metadata[idx] && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <div className="text-xs text-muted-foreground">
                          {selectedCitation.metadata[idx].page && (
                            <span>Page {selectedCitation.metadata[idx].page}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

