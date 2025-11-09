import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore } from '@/store';

interface ToolServer {
  url: string;
  key?: string;
}

interface ToolsProps {
  saveSettings: (settings: Record<string, unknown>) => Promise<void>;
}

export default function Tools({ saveSettings }: ToolsProps) {
  const { t } = useTranslation();
  const { settings } = useAppStore();

  const [servers, setServers] = useState<ToolServer[] | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  useEffect(() => {
    setServers(settings?.toolServers ?? []);
  }, []);

  const addConnectionHandler = async (server: ToolServer) => {
    const newServers = [...(servers || []), server];
    setServers(newServers);
    await updateHandler(newServers);
    setShowConnectionModal(false);
  };

  const deleteConnectionHandler = async (index: number) => {
    const newServers = servers?.filter((_, i) => i !== index) || [];
    setServers(newServers);
    await updateHandler(newServers);
  };

  const updateHandler = async (updatedServers: ToolServer[]) => {
    await saveSettings({
      toolServers: updatedServers,
    });

    toast.success(t('Settings saved successfully!'));
  };

  if (servers === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t('Loading...')}</div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full text-sm">
        <div className="overflow-y-auto h-full">
          <div className="pr-1.5">
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">{t('Manage Tool Servers')}</div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setShowConnectionModal(true);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('Add Connection')}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="space-y-2">
              {servers.length > 0 ? (
                servers.map((server, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{server.url}</div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteConnectionHandler(idx)}
                      >
                        {t('Delete')}
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t('No tool servers configured')}
                </div>
              )}
            </div>

            <div className="mt-4 text-xs text-gray-500">
              {t('Connect to your own OpenAPI compatible external tool servers.')}
              <br />
              {t(
                'CORS must be properly configured by the provider to allow requests from Open WebUI.'
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

