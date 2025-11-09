import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore } from '@/store';
import AddConnectionModal from '@/components/admin/AddConnectionModal';

interface Connection {
  url: string;
  key: string;
  config?: Record<string, unknown>;
}

interface ConnectionsProps {
  saveSettings: (settings: Record<string, unknown>) => Promise<void>;
}

export default function Connections({ saveSettings }: ConnectionsProps) {
  const { t } = useTranslation();
  const { settings } = useAppStore();

  const [config, setConfig] = useState<any>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    setConfig(
      settings?.directConnections ?? {
        OPENAI_API_BASE_URLS: [],
        OPENAI_API_KEYS: [],
        OPENAI_API_CONFIGS: {},
      }
    );
  }, [settings]);

  const addConnectionHandler = async (connection: Connection) => {
    const newConfig = { ...config };
    newConfig.OPENAI_API_BASE_URLS.push(connection.url);
    newConfig.OPENAI_API_KEYS.push(connection.key);
    newConfig.OPENAI_API_CONFIGS[newConfig.OPENAI_API_BASE_URLS.length - 1] = connection.config;

    setConfig(newConfig);
    await updateHandler(newConfig);
    setShowConnectionModal(false);
  };

  const updateConnectionHandler = async (connection: Connection) => {
    if (editingIndex === null) return;

    const newConfig = { ...config };
    newConfig.OPENAI_API_BASE_URLS[editingIndex] = connection.url;
    newConfig.OPENAI_API_KEYS[editingIndex] = connection.key;
    newConfig.OPENAI_API_CONFIGS[editingIndex] = connection.config;

    setConfig(newConfig);
    await updateHandler(newConfig);
    setShowConnectionModal(false);
    setEditingConnection(null);
    setEditingIndex(null);
  };

  const deleteConnectionHandler = async (index: number) => {
    const newConfig = { ...config };
    newConfig.OPENAI_API_BASE_URLS = newConfig.OPENAI_API_BASE_URLS.filter(
      (_: string, idx: number) => idx !== index
    );
    newConfig.OPENAI_API_KEYS = newConfig.OPENAI_API_KEYS.filter(
      (_: string, idx: number) => idx !== index
    );

    const newConfigs: Record<string, any> = {};
    newConfig.OPENAI_API_BASE_URLS.forEach((url: string, newIdx: number) => {
      newConfigs[newIdx] = newConfig.OPENAI_API_CONFIGS[newIdx < index ? newIdx : newIdx + 1];
    });
    newConfig.OPENAI_API_CONFIGS = newConfigs;

    setConfig(newConfig);
    await updateHandler(newConfig);
  };

  const updateHandler = async (updatedConfig: Record<string, unknown>) => {
    // Remove trailing slashes
    updatedConfig.OPENAI_API_BASE_URLS = updatedConfig.OPENAI_API_BASE_URLS.map((url: string) =>
      url.replace(/\/$/, '')
    );

    // Check if API KEYS length is same as API URLS length
    if (updatedConfig.OPENAI_API_KEYS.length !== updatedConfig.OPENAI_API_BASE_URLS.length) {
      // if there are more keys than urls, remove the extra keys
      if (updatedConfig.OPENAI_API_KEYS.length > updatedConfig.OPENAI_API_BASE_URLS.length) {
        updatedConfig.OPENAI_API_KEYS = updatedConfig.OPENAI_API_KEYS.slice(
          0,
          updatedConfig.OPENAI_API_BASE_URLS.length
        );
      }

      // if there are more urls than keys, add empty keys
      if (updatedConfig.OPENAI_API_KEYS.length < updatedConfig.OPENAI_API_BASE_URLS.length) {
        const diff = updatedConfig.OPENAI_API_BASE_URLS.length - updatedConfig.OPENAI_API_KEYS.length;
        for (let i = 0; i < diff; i++) {
          updatedConfig.OPENAI_API_KEYS.push('');
        }
      }
    }

    await saveSettings({
      directConnections: updatedConfig,
    });
  };

  const openEditModal = (index: number) => {
    const connection: Connection = {
      url: config.OPENAI_API_BASE_URLS[index],
      key: config.OPENAI_API_KEYS[index],
      config: config.OPENAI_API_CONFIGS[index] || {},
    };
    setEditingIndex(index);
    setEditingConnection(connection);
    setShowConnectionModal(true);
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t('Loading...')}</div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <>
        <AddConnectionModal
          open={showConnectionModal}
          onOpenChange={(open) => {
            if (!open) {
              setShowConnectionModal(false);
              setEditingConnection(null);
              setEditingIndex(null);
            }
          }}
          onSubmit={editingIndex !== null ? updateConnectionHandler : addConnectionHandler}
          onDelete={
            editingIndex !== null
              ? () => {
                  deleteConnectionHandler(editingIndex);
                  setShowConnectionModal(false);
                  setEditingConnection(null);
                  setEditingIndex(null);
                }
              : undefined
          }
          connection={editingConnection}
          edit={editingIndex !== null}
          direct={true}
        />

        <div className="flex flex-col h-full text-sm">
          <div className="overflow-y-auto h-full">
            <div className="pr-1.5">
              <div className="flex justify-between items-center mb-2">
                <div className="font-medium">{t('Manage Direct Connections')}</div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingConnection(null);
                        setEditingIndex(null);
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
                {config?.OPENAI_API_BASE_URLS?.length > 0 ? (
                  config.OPENAI_API_BASE_URLS.map((url: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{url}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {config.OPENAI_API_CONFIGS[idx]?.prefix_id || t('No prefix')}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditModal(idx)}
                        >
                          {t('Edit')}
                        </Button>
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
                    {t('No connections configured')}
                  </div>
                )}
              </div>

              <div className="mt-4 text-xs text-gray-500">
                {t('Connect to your own OpenAI compatible API endpoints.')}
                <br />
                {t(
                  'CORS must be properly configured by the provider to allow requests from Open WebUI.'
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    </TooltipProvider>
  );
}

