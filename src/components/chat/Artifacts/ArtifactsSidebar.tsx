import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Copy, Download, ExternalLink, Code, FileText } from 'lucide-react';
import { toast } from 'sonner';
import CodeBlock from '@/components/chat/CodeBlock';
import Markdown from '@/components/chat/Markdown';

interface Artifact {
  id: string;
  type: 'code' | 'markdown' | 'html' | 'json';
  title: string;
  content: string;
  language?: string;
  created_at: number;
}

interface ArtifactsSidebarProps {
  artifacts: Artifact[];
  onClose: () => void;
}

export default function ArtifactsSidebar({ artifacts, onClose }: ArtifactsSidebarProps) {
  const { t } = useTranslation();
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(
    artifacts.length > 0 ? artifacts[0] : null
  );
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');

  const handleCopy = () => {
    if (selectedArtifact) {
      navigator.clipboard.writeText(selectedArtifact.content);
      toast.success(t('Copied to clipboard'));
    }
  };

  const handleDownload = () => {
    if (!selectedArtifact) return;

    const extension = selectedArtifact.type === 'code' 
      ? `.${selectedArtifact.language || 'txt'}`
      : `.${selectedArtifact.type}`;
    
    const blob = new Blob([selectedArtifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedArtifact.title}${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(t('Downloaded'));
  };

  const handleOpenInNewTab = () => {
    if (!selectedArtifact) return;

    const newWindow = window.open('', '_blank');
    if (newWindow) {
      if (selectedArtifact.type === 'html') {
        newWindow.document.write(selectedArtifact.content);
      } else {
        newWindow.document.write(`<pre>${selectedArtifact.content}</pre>`);
      }
    }
  };

  if (artifacts.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[500px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold">{t('Artifacts')}</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      {/* Artifact List */}
      <div className="border-b border-gray-200 dark:border-gray-800 p-2">
        <ScrollArea className="max-h-32">
          <div className="space-y-1">
            {artifacts.map((artifact) => (
              <button
                key={artifact.id}
                onClick={() => setSelectedArtifact(artifact)}
                className={`w-full text-left px-3 py-2 rounded-lg transition ${
                  selectedArtifact?.id === artifact.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {artifact.type === 'code' ? (
                    <Code className="size-4 shrink-0" />
                  ) : (
                    <FileText className="size-4 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{artifact.title}</div>
                    <div className="text-xs opacity-70">
                      {artifact.type} {artifact.language && `(${artifact.language})`}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Content */}
      {selectedArtifact && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-1">
              <Button
                variant={viewMode === 'preview' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('preview')}
              >
                {t('Preview')}
              </Button>
              <Button
                variant={viewMode === 'code' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('code')}
              >
                {t('Code')}
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                <Copy className="size-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDownload}>
                <Download className="size-4" />
              </Button>
              {selectedArtifact.type === 'html' && (
                <Button variant="ghost" size="sm" onClick={handleOpenInNewTab}>
                  <ExternalLink className="size-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Content Area */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              {viewMode === 'preview' ? (
                <>
                  {selectedArtifact.type === 'html' && (
                    <iframe
                      srcDoc={selectedArtifact.content}
                      className="w-full h-full min-h-[400px] border border-gray-200 dark:border-gray-800 rounded-lg"
                      title={selectedArtifact.title}
                    />
                  )}
                  {selectedArtifact.type === 'markdown' && (
                    <div className="prose dark:prose-invert max-w-none">
                      <Markdown content={selectedArtifact.content} />
                    </div>
                  )}
                  {selectedArtifact.type === 'code' && (
                    <CodeBlock
                      language={selectedArtifact.language || 'text'}
                    >
                      {selectedArtifact.content}
                    </CodeBlock>
                  )}
                  {selectedArtifact.type === 'json' && (
                    <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
                      <code>{JSON.stringify(JSON.parse(selectedArtifact.content), null, 2)}</code>
                    </pre>
                  )}
                </>
              ) : (
                <CodeBlock
                  language={selectedArtifact.language || selectedArtifact.type}
                >
                  {selectedArtifact.content}
                </CodeBlock>
              )}
            </div>
          </ScrollArea>
        </>
      )}
    </div>
  );
}

