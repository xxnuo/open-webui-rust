import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { X, Plus, Trash2, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import SensitiveInput from '@/components/common/SensitiveInput';

interface ConnectionConfig {
  enable?: boolean;
  tags?: string[];
  prefix_id?: string;
  model_ids?: string[];
  connection_type?: string;
  auth_type?: string;
  azure?: boolean;
  api_version?: string;
}

interface Connection {
  url: string;
  key: string;
  config: ConnectionConfig;
}

interface AddConnectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (connection: Connection) => void;
  onDelete?: () => void;
  connection?: Connection | null;
  edit?: boolean;
  direct?: boolean;
}

export default function AddConnectionModal({
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  connection = null,
  edit = false,
  direct = false,
}: AddConnectionModalProps) {
  const { t } = useTranslation();
  
  const [url, setUrl] = useState('');
  const [key, setKey] = useState('');
  const [authType, setAuthType] = useState('bearer');
  const [connectionType, setConnectionType] = useState('external');
  const [prefixId, setPrefixId] = useState('');
  const [enable, setEnable] = useState(true);
  const [apiVersion, setApiVersion] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [modelId, setModelId] = useState('');
  const [modelIds, setModelIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const isAzure = (url.includes('azure.') || url.includes('cognitive.microsoft.com')) && !direct;

  useEffect(() => {
    if (open && connection) {
      setUrl(connection.url || '');
      setKey(connection.key || '');
      setAuthType(connection.config?.auth_type || 'bearer');
      setEnable(connection.config?.enable ?? true);
      setTags(connection.config?.tags || []);
      setPrefixId(connection.config?.prefix_id || '');
      setModelIds(connection.config?.model_ids || []);
      setConnectionType(connection.config?.connection_type || 'external');
      setApiVersion(connection.config?.api_version || '');
    } else if (!open) {
      // Reset form when modal closes
      resetForm();
    }
  }, [open, connection]);

  const resetForm = () => {
    setUrl('');
    setKey('');
    setAuthType('bearer');
    setConnectionType('external');
    setPrefixId('');
    setEnable(true);
    setApiVersion('');
    setTags([]);
    setTagInput('');
    setModelId('');
    setModelIds([]);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!url) {
      setLoading(false);
      toast.error(t('URL is required'));
      return;
    }

    if (isAzure) {
      if (!apiVersion) {
        setLoading(false);
        toast.error(t('API Version is required'));
        return;
      }

      if (!key && !['azure_ad', 'microsoft_entra_id'].includes(authType)) {
        setLoading(false);
        toast.error(t('Key is required'));
        return;
      }

      if (modelIds.length === 0) {
        setLoading(false);
        toast.error(t('Deployment names are required for Azure OpenAI'));
        return;
      }
    }

    const cleanUrl = url.replace(/\/$/, '');

    const connectionData: Connection = {
      url: cleanUrl,
      key,
      config: {
        enable,
        tags,
        prefix_id: prefixId,
        model_ids: modelIds,
        connection_type: connectionType,
        auth_type: authType,
        ...(isAzure ? { azure: true, api_version: apiVersion } : {})
      }
    };

    await onSubmit(connectionData);
    setLoading(false);
    onOpenChange(false);
  };

  const addTag = () => {
    if (tagInput && !tags.includes(tagInput)) {
      setTags([...tags, tagInput]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addModelId = () => {
    if (modelId && !modelIds.includes(modelId)) {
      setModelIds([...modelIds, modelId]);
      setModelId('');
    }
  };

  const removeModelId = (idToRemove: string) => {
    setModelIds(modelIds.filter(id => id !== idToRemove));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{edit ? t('Edit Connection') : t('Add Connection')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            {/* Connection Type */}
            {!direct && (
              <div className="flex justify-between items-center">
                <Label className="text-xs text-muted-foreground">{t('Connection Type')}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConnectionType(connectionType === 'local' ? 'external' : 'local')}
                  className="text-xs"
                >
                  {connectionType === 'local' ? t('Local') : t('External')}
                </Button>
              </div>
            )}

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="url">{t('URL')}</Label>
              <Input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t('API Base URL')}
                required
                autoComplete="off"
              />
            </div>

            {/* Azure API Version */}
            {isAzure && (
              <div className="space-y-2">
                <Label htmlFor="apiVersion">{t('API Version')}</Label>
                <Input
                  id="apiVersion"
                  type="text"
                  value={apiVersion}
                  onChange={(e) => setApiVersion(e.target.value)}
                  placeholder="2024-02-01"
                  required
                  autoComplete="off"
                />
              </div>
            )}

            {/* Auth Type */}
            <div className="space-y-2">
              <Label htmlFor="authType">{t('Auth')}</Label>
              <Select value={authType} onValueChange={setAuthType}>
                <SelectTrigger id="authType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bearer">Bearer</SelectItem>
                  {isAzure && (
                    <>
                      <SelectItem value="azure_ad">Azure AD</SelectItem>
                      <SelectItem value="microsoft_entra_id">Microsoft Entra ID</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* API Key */}
            {!['azure_ad', 'microsoft_entra_id'].includes(authType) && (
              <div className="space-y-2">
                <Label htmlFor="apiKey">{t('API Key')}</Label>
                <SensitiveInput
                  id="apiKey"
                  value={key}
                  onChange={setKey}
                  placeholder={t('Enter API Key')}
                  type="password"
                />
              </div>
            )}

            {/* Enable Connection */}
            <div className="flex items-center justify-between">
              <Label>{t('Enable Connection')}</Label>
              <Switch checked={enable} onCheckedChange={setEnable} />
            </div>

            {/* Prefix ID */}
            <div className="space-y-2">
              <Label htmlFor="prefixId">{t('Prefix ID')}</Label>
              <Input
                id="prefixId"
                type="text"
                value={prefixId}
                onChange={(e) => setPrefixId(e.target.value)}
                placeholder={t('Prefix ID')}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                {t('Add a prefix to the model IDs from this connection')}
              </p>
            </div>

            {/* Provider Type */}
            {!isAzure && (
              <div className="space-y-2">
                <Label>{t('Provider Type')}</Label>
                <div className="text-sm text-muted-foreground">OpenAI</div>
              </div>
            )}

            {/* Model IDs */}
            <div className="space-y-2">
              <Label>{t('Model IDs')}</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  placeholder={isAzure ? t('Add a deployment name') : t('Add a model ID')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addModelId();
                    }
                  }}
                  autoComplete="off"
                />
                <Button type="button" size="icon" onClick={addModelId}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {modelIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {modelIds.map((id) => (
                    <Badge key={id} variant="secondary" className="gap-1">
                      {id}
                      <button
                        type="button"
                        onClick={() => removeModelId(id)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              
              <p className="text-xs text-muted-foreground">
                {isAzure 
                  ? t('Leave empty to include all deployments from "{{url}}/models" endpoint', { url: url || 'URL' })
                  : t('Leave empty to include all models from "{{url}}/models" endpoint', { url: url || 'URL' })}
              </p>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>{t('Tags')}</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder={t('Add a tag')}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  autoComplete="off"
                />
                <Button type="button" size="icon" onClick={addTag}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            {edit && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onDelete();
                  onOpenChange(false);
                }}
              >
                {t('Delete')}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('Saving...') : t('Save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

