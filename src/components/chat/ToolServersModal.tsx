import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppStore } from '@/store';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

interface ToolServersModalProps {
  show: boolean;
  onClose: () => void;
  selectedToolIds: string[];
}

export default function ToolServersModal({
  show,
  onClose,
  selectedToolIds
}: ToolServersModalProps) {
  const { t } = useTranslation();
  const { tools, toolServers } = useAppStore();

  const selectedTools = (tools || []).filter((tool: any) => 
    selectedToolIds.includes(tool.id)
  );

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('Available Tools')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Selected Tools Section */}
          {selectedTools.length > 0 && (
            <div className="space-y-2">
              {toolServers && toolServers.length > 0 && (
                <h3 className="text-base font-medium">{t('Tools')}</h3>
              )}
              
              <div className="space-y-1">
                {selectedTools.map((tool: any) => (
                  <Collapsible key={tool.id}>
                    <CollapsibleTrigger className="w-full p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left">
                      <div className="truncate">
                        <div className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                          {tool?.name}
                        </div>
                        {tool?.meta?.description && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {tool.meta.description}
                          </div>
                        )}
                      </div>
                    </CollapsibleTrigger>
                  </Collapsible>
                ))}
              </div>
            </div>
          )}

          {/* Tool Servers Section */}
          {toolServers && toolServers.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-base font-medium">{t('Tool Servers')}</h3>
              
              <div className="space-y-2">
                {toolServers.map((toolServer: any, idx: number) => (
                  <Collapsible key={idx}>
                    <CollapsibleTrigger className="w-full p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
                            {toolServer?.openapi?.info?.title} - v{toolServer?.openapi?.info?.version}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {toolServer?.openapi?.info?.description}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {toolServer?.url}
                          </div>
                        </div>
                        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent className="px-3 py-2 space-y-2">
                      {(toolServer?.specs ?? []).map((tool_spec: any, specIdx: number) => (
                        <div key={specIdx} className="py-2 border-t border-border">
                          <div className="font-medium text-sm text-gray-800 dark:text-gray-100">
                            {tool_spec?.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {tool_spec?.description}
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>
          )}

          {selectedTools.length === 0 && (!toolServers || toolServers.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              {t('No tools or tool servers available')}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

