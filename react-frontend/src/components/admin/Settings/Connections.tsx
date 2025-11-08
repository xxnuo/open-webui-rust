import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Settings as SettingsIcon, Trash2, Layers } from 'lucide-react';
import { getOpenAIConfig, updateOpenAIConfig, getOpenAIModels } from '@/lib/apis/openai';
import { getConnectionsConfig, setConnectionsConfig } from '@/lib/apis/configs';
import { getBackendConfig, getModels as getModelsAPI } from '@/lib/apis';
import AddConnectionModal from '@/components/admin/AddConnectionModal';
import { useAppStore } from '@/store';

interface OpenAIConfig {
  ENABLE_OPENAI_API: boolean;
  OPENAI_API_BASE_URLS: string[];
  OPENAI_API_KEYS: string[];
  OPENAI_API_CONFIGS: Record<string, any>;
}

interface ConnectionsConfigType {
  ENABLE_DIRECT_CONNECTIONS: boolean;
  ENABLE_BASE_MODELS_CACHE: boolean;
}

interface Connection {
  url: string;
  key: string;
  config: Record<string, unknown>;
  pipeline?: boolean;
}

export default function Connections() {
  const { t } = useTranslation();
  const { settings, setConfig, setModels } = useAppStore();
  const [enableOpenAIAPI, setEnableOpenAIAPI] = useState<boolean | null>(null);
  const [openaiApiBaseUrls, setOpenaiApiBaseUrls] = useState<string[]>(['']);
  const [openaiApiKeys, setOpenaiApiKeys] = useState<string[]>(['']);
  const [openaiApiConfigs, setOpenaiApiConfigs] = useState<Record<string, any>>({});
  const [connectionsConfig, setConnectionsConfigState] = useState<ConnectionsConfigType | null>(null);
  const [pipelineUrls, setPipelineUrls] = useState<Record<string, boolean>>({});
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token') || '';

      try {
        const [openaiConfig, connConfig] = await Promise.all([
          getOpenAIConfig(token),
          getConnectionsConfig(token)
        ]);

        if (openaiConfig) {
          setEnableOpenAIAPI(openaiConfig.ENABLE_OPENAI_API);
          setOpenaiApiBaseUrls(openaiConfig.OPENAI_API_BASE_URLS);
          setOpenaiApiKeys(openaiConfig.OPENAI_API_KEYS);
          setOpenaiApiConfigs(openaiConfig.OPENAI_API_CONFIGS);

          if (openaiConfig.ENABLE_OPENAI_API) {
            // Check for pipelines
            const pipelines: Record<string, boolean> = {};
            for (const [idx, url] of openaiConfig.OPENAI_API_BASE_URLS.entries()) {
              if (!openaiConfig.OPENAI_API_CONFIGS[idx]) {
                openaiConfig.OPENAI_API_CONFIGS[idx] = openaiConfig.OPENAI_API_CONFIGS[url] || {};
              }

              const config = openaiConfig.OPENAI_API_CONFIGS[idx] || {};
              if (config?.enable ?? true) {
                try {
                  const res = await getOpenAIModels(token, idx);
                  if (res.pipelines) {
                    pipelines[url] = true;
                  }
                } catch (error) {
                  console.error(`Failed to check pipeline for ${url}:`, error);
                }
              }
            }
            setPipelineUrls(pipelines);
          }
        }

        if (connConfig) {
          setConnectionsConfigState(connConfig);
        }
      } catch (error) {
        console.error('Failed to load connections settings:', error);
        toast.error(t('Failed to load settings'));
      }
    };

    init();
  }, [t]);

  const updateOpenAIHandler = async () => {
    if (enableOpenAIAPI === null) return;

    const token = localStorage.getItem('token') || '';

    try {
      // Remove trailing slashes
      const cleanedUrls = openaiApiBaseUrls.map(url => url.replace(/\/$/, ''));

      // Sync keys with URLs
      let syncedKeys = [...openaiApiKeys];
      if (syncedKeys.length < cleanedUrls.length) {
        const diff = cleanedUrls.length - syncedKeys.length;
        syncedKeys = [...syncedKeys, ...Array(diff).fill('')];
      } else if (syncedKeys.length > cleanedUrls.length) {
        syncedKeys = syncedKeys.slice(0, cleanedUrls.length);
      }

      await updateOpenAIConfig(token, {
        ENABLE_OPENAI_API: enableOpenAIAPI,
        OPENAI_API_BASE_URLS: cleanedUrls,
        OPENAI_API_KEYS: syncedKeys,
        OPENAI_API_CONFIGS: openaiApiConfigs
      });

      toast.success(t('OpenAI API settings updated'));
      
      // Reload models and config
      const [newModels, newConfig] = await Promise.all([
        getModelsAPI(token, settings?.directConnections ?? null, false, true),
        getBackendConfig()
      ]);
      
      if (newModels) {
        setModels(newModels);
      }
      if (newConfig) {
        setConfig(newConfig);
      }
    } catch (error) {
      console.error('Failed to update OpenAI settings:', error);
      toast.error(String(error));
    }
  };

  const updateConnectionsHandler = async () => {
    if (!connectionsConfig) return;

    const token = localStorage.getItem('token') || '';

    try {
      await setConnectionsConfig(token, connectionsConfig);
      toast.success(t('Connections settings updated'));
      
      // Reload models and config
      const [newModels, newConfig] = await Promise.all([
        getModelsAPI(token, settings?.directConnections ?? null, false, true),
        getBackendConfig()
      ]);
      
      if (newModels) {
        setModels(newModels);
      }
      if (newConfig) {
        setConfig(newConfig);
      }
    } catch (error) {
      console.error('Failed to update connections settings:', error);
      toast.error(String(error));
    }
  };

  const addConnection = async (connection: Connection) => {
    const newUrls = [...openaiApiBaseUrls, connection.url];
    const newKeys = [...openaiApiKeys, connection.key];
    const newConfigs = { ...openaiApiConfigs };
    newConfigs[openaiApiBaseUrls.length] = connection.config;

    setOpenaiApiBaseUrls(newUrls);
    setOpenaiApiKeys(newKeys);
    setOpenaiApiConfigs(newConfigs);

    // Update backend
    const token = localStorage.getItem('token') || '';
    try {
      await updateOpenAIConfig(token, {
        ENABLE_OPENAI_API: enableOpenAIAPI!,
        OPENAI_API_BASE_URLS: newUrls,
        OPENAI_API_KEYS: newKeys,
        OPENAI_API_CONFIGS: newConfigs
      });
      toast.success(t('Connection added successfully'));
      
      // Reload models
      const newModels = await getModelsAPI(token, settings?.directConnections ?? null, false, true);
      if (newModels) {
        setModels(newModels);
      }
    } catch (error) {
      toast.error(String(error));
    }
  };

  const updateConnection = async (connection: Connection) => {
    if (editingIndex === null) return;

    const newUrls = [...openaiApiBaseUrls];
    const newKeys = [...openaiApiKeys];
    const newConfigs = { ...openaiApiConfigs };

    newUrls[editingIndex] = connection.url;
    newKeys[editingIndex] = connection.key;
    newConfigs[editingIndex] = connection.config;

    setOpenaiApiBaseUrls(newUrls);
    setOpenaiApiKeys(newKeys);
    setOpenaiApiConfigs(newConfigs);

    // Update backend
    const token = localStorage.getItem('token') || '';
    try {
      await updateOpenAIConfig(token, {
        ENABLE_OPENAI_API: enableOpenAIAPI!,
        OPENAI_API_BASE_URLS: newUrls,
        OPENAI_API_KEYS: newKeys,
        OPENAI_API_CONFIGS: newConfigs
      });
      toast.success(t('Connection updated successfully'));
      
      // Reload models
      const newModels = await getModelsAPI(token, settings?.directConnections ?? null, false, true);
      if (newModels) {
        setModels(newModels);
      }
    } catch (error) {
      toast.error(String(error));
    }
  };

  const deleteConnection = async (index: number) => {
    const newUrls = openaiApiBaseUrls.filter((_, idx) => idx !== index);
    const newKeys = openaiApiKeys.filter((_, idx) => idx !== index);
    
    const newConfigs: Record<string, any> = {};
    newUrls.forEach((url, newIdx) => {
      newConfigs[newIdx] = openaiApiConfigs[newIdx < index ? newIdx : newIdx + 1];
    });

    setOpenaiApiBaseUrls(newUrls);
    setOpenaiApiKeys(newKeys);
    setOpenaiApiConfigs(newConfigs);

    // Update backend
    const token = localStorage.getItem('token') || '';
    try {
      await updateOpenAIConfig(token, {
        ENABLE_OPENAI_API: enableOpenAIAPI!,
        OPENAI_API_BASE_URLS: newUrls,
        OPENAI_API_KEYS: newKeys,
        OPENAI_API_CONFIGS: newConfigs
      });
      toast.success(t('Connection deleted successfully'));
      
      // Reload models
      const newModels = await getModelsAPI(token, settings?.directConnections ?? null, false, true);
      if (newModels) {
        setModels(newModels);
      }
    } catch (error) {
      toast.error(String(error));
    }
  };

  const openEditModal = (index: number) => {
    const connection: Connection = {
      url: openaiApiBaseUrls[index],
      key: openaiApiKeys[index],
      config: openaiApiConfigs[index] || {}
    };
    setEditingIndex(index);
    setEditingConnection(connection);
    setShowEditModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateOpenAIHandler();
  };

  if (enableOpenAIAPI === null || !connectionsConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t('Loading...')}</div>
      </div>
    );
  }

  return (
    <>
      <AddConnectionModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSubmit={addConnection}
        edit={false}
      />

      <AddConnectionModal
        open={showEditModal}
        onOpenChange={(open) => {
          setShowEditModal(open);
          if (!open) {
            setEditingIndex(null);
            setEditingConnection(null);
          }
        }}
        onSubmit={updateConnection}
        onDelete={() => {
          if (editingIndex !== null) {
            deleteConnection(editingIndex);
          }
        }}
        connection={editingConnection}
        edit={true}
      />

      <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between text-sm">
        <div className="overflow-y-scroll scrollbar-hidden h-full">
          <div className="mb-3.5">
            <div className="mb-2.5 text-base font-medium">{t('General')}</div>
            <Separator />

            <div className="my-2">
              <div className="mt-2 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <Label className="font-medium">{t('OpenAI API')}</Label>
                  <Switch
                    checked={enableOpenAIAPI}
                    onCheckedChange={async (checked) => {
                      setEnableOpenAIAPI(checked);
                      const token = localStorage.getItem('token') || '';
                      try {
                        await updateOpenAIConfig(token, {
                          ENABLE_OPENAI_API: checked,
                          OPENAI_API_BASE_URLS: openaiApiBaseUrls,
                          OPENAI_API_KEYS: openaiApiKeys,
                          OPENAI_API_CONFIGS: openaiApiConfigs
                        });
                        toast.success(t('OpenAI API settings updated'));
                        
                        // Reload models
                        const newModels = await getModelsAPI(token, settings?.directConnections ?? null, false, true);
                        if (newModels) {
                          setModels(newModels);
                        }
                      } catch (error) {
                        toast.error(String(error));
                      }
                    }}
                  />
                </div>

                {enableOpenAIAPI && (
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <Label className="font-medium text-xs">{t('Manage OpenAI API Connections')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setShowAddModal(true)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('Add Connection')}</TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-1.5">
                      {openaiApiBaseUrls.map((url, idx) => {
                        const config = openaiApiConfigs[idx] || {};
                        const isEnabled = config?.enable ?? true;
                        const isPipeline = pipelineUrls[url];

                        return (
                          <div key={idx} className="flex w-full gap-2 items-center">
                            <Tooltip>
                              <TooltipTrigger asChild className="w-full">
                                <div className={`flex w-full gap-2 relative ${!isEnabled ? 'opacity-50' : ''}`}>
                                  <div className="flex-1 relative">
                                    <Input
                                      className="w-full pr-8"
                                      placeholder={t('API Base URL')}
                                      value={url}
                                      readOnly
                                    />
                                    {isPipeline && (
                                      <div className="absolute top-2.5 right-2">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div className="h-5 w-5 flex items-center justify-center">
                                              <Layers className="h-4 w-4" />
                                            </div>
                                          </TooltipTrigger>
                                          <TooltipContent>Pipelines</TooltipContent>
                                        </Tooltip>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                {t('WebUI will make requests to "{{url}}/chat/completions"', { url })}
                              </TooltipContent>
                            </Tooltip>

                            <div className="flex gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openEditModal(idx)}
                                  >
                                    <SettingsIcon className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('Configure')}</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:text-destructive"
                                    onClick={() => deleteConnection(idx)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('Delete')}</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="my-2">
              <div className="flex justify-between items-center text-sm">
                <Label className="font-medium">{t('Direct Connections')}</Label>
                <Switch
                  checked={connectionsConfig.ENABLE_DIRECT_CONNECTIONS}
                  onCheckedChange={async (checked) => {
                    setConnectionsConfigState({
                      ...connectionsConfig,
                      ENABLE_DIRECT_CONNECTIONS: checked
                    });
                    try {
                      const token = localStorage.getItem('token') || '';
                      await setConnectionsConfig(token, {
                        ...connectionsConfig,
                        ENABLE_DIRECT_CONNECTIONS: checked
                      });
                      toast.success(t('Connections settings updated'));
                    } catch (error) {
                      toast.error(String(error));
                    }
                  }}
                />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {t('Direct Connections allow users to connect to their own OpenAI compatible API endpoints.')}
              </div>
            </div>

            <Separator className="my-2" />

            <div className="my-2">
              <div className="flex justify-between items-center text-sm">
                <Label className="text-xs font-medium">{t('Cache Base Model List')}</Label>
                <Switch
                  checked={connectionsConfig.ENABLE_BASE_MODELS_CACHE}
                  onCheckedChange={async (checked) => {
                    setConnectionsConfigState({
                      ...connectionsConfig,
                      ENABLE_BASE_MODELS_CACHE: checked
                    });
                    try {
                      const token = localStorage.getItem('token') || '';
                      await setConnectionsConfig(token, {
                        ...connectionsConfig,
                        ENABLE_BASE_MODELS_CACHE: checked
                      });
                      toast.success(t('Connections settings updated'));
                    } catch (error) {
                      toast.error(String(error));
                    }
                  }}
                />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {t('Base Model List Cache speeds up access by fetching base models only at startup or on settings save—faster, but may not show recent base model changes.')}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3 text-sm font-medium">
          <Button type="submit" className="px-3.5 py-1.5 rounded-full">
            {t('Save')}
          </Button>
        </div>
      </form>
    </>
  );
}
