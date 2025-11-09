import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, X, MoreHorizontal, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CodeExecution {
  id: string;
  uuid?: string;
  name: string;
  code: string;
  language?: string;
  result?: {
    error?: string;
    output?: string;
    files?: { name: string; url: string }[];
  };
}

interface CodeExecutionsProps {
  codeExecutions: CodeExecution[];
}

export default function CodeExecutions({ codeExecutions }: CodeExecutionsProps) {
  const { t } = useTranslation();
  const [showModal, setShowModal] = useState(false);
  const [selectedExecution, setSelectedExecution] = useState<CodeExecution | null>(null);

  if (!codeExecutions || codeExecutions.length === 0) {
    return null;
  }

  const handleExecutionClick = (execution: CodeExecution) => {
    setSelectedExecution(execution);
    setShowModal(true);
  };

  return (
    <>
      <div className="mt-1 mb-2 w-full flex gap-1 items-center flex-wrap">
        {codeExecutions.map((execution) => {
          const hasResult = !!execution.result;
          const hasError = execution.result?.error;
          const hasOutput = execution.result?.output;

          return (
            <button
              key={execution.id || execution.uuid}
              onClick={() => handleExecutionClick(execution)}
              className="flex gap-1 text-xs font-semibold items-center py-1 px-1 bg-gray-50 hover:bg-gray-100 dark:bg-gray-850 dark:hover:bg-gray-800 transition rounded-xl max-w-96"
            >
              <div className="bg-white dark:bg-gray-700 rounded-full size-4 flex items-center justify-center">
                {hasResult ? (
                  hasError ? (
                    <X className="h-3 w-3 text-destructive" />
                  ) : hasOutput ? (
                    <Check className="h-3 w-3 text-green-600" strokeWidth={3} />
                  ) : (
                    <MoreHorizontal className="h-3 w-3" />
                  )
                ) : (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
              </div>
              <div
                className={`flex-1 mx-2 line-clamp-1 ${!hasResult ? 'animate-pulse' : ''}`}
              >
                {execution.name}
              </div>
            </button>
          );
        })}
      </div>

      {/* Code Execution Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedExecution?.result ? (
                selectedExecution.result.error ? (
                  <X className="h-5 w-5 text-destructive" />
                ) : (
                  <Check className="h-5 w-5 text-green-600" />
                )
              ) : (
                <Loader2 className="h-5 w-5 animate-spin" />
              )}
              {selectedExecution?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedExecution && (
            <div className="space-y-4">
              {/* Language badge */}
              {selectedExecution.language && (
                <Badge variant="outline">{selectedExecution.language}</Badge>
              )}

              {/* Code */}
              <div className="space-y-2">
                <div className="text-sm font-semibold">{t('Code')}</div>
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-muted overflow-x-auto text-sm">
                    <code>{selectedExecution.code}</code>
                  </pre>
                </div>
              </div>

              {/* Result */}
              {selectedExecution.result && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold">
                    {selectedExecution.result.error ? t('Error') : t('Output')}
                  </div>
                  <div
                    className={`p-4 rounded-lg overflow-x-auto text-sm ${
                      selectedExecution.result.error
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-muted'
                    }`}
                  >
                    <pre className="whitespace-pre-wrap break-words">
                      {selectedExecution.result.error || selectedExecution.result.output || t('No output')}
                    </pre>
                  </div>
                </div>
              )}

              {/* Files */}
              {selectedExecution.result?.files && selectedExecution.result.files.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-semibold">{t('Generated Files')}</div>
                  <div className="space-y-1">
                    {selectedExecution.result.files.map((file, idx) => (
                      <a
                        key={idx}
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                      >
                        <span className="text-sm">{file.name}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

