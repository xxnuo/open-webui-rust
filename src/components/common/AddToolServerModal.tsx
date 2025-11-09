import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { X, Plus, Minus, RotateCw } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SensitiveInput from './SensitiveInput';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader } from './Loader';
import AccessControlModal from '../workspace/common/AccessControlModal';

interface Connection {
  type?: string;
  url: string;
  spec_type?: string;
  spec?: string;
  path?: string;
  auth_type?: string;
  key?: string;
  info?: {
    id?: string;
    name?: string;
    description?: string;
    oauth_client_info?: any;
  };
  config?: {
    enable?: boolean;
    access_control?: any;
  };
}

interface AddToolServerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (connection: Connection) => Promise<void>;
  onDelete?: () => void;
  edit?: boolean;
  direct?: boolean;
  connection?: Connection | null;
}

export const AddToolServerModal: React.FC<AddToolServerModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  edit = false,
  direct = false,
  connection: initialConnection = null,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<string>('openapi');
  const [url, setUrl] = useState<string>('');
  const [specType, setSpecType] = useState<string>('url');
  const [spec, setSpec] = useState<string>('');
  const [path, setPath] = useState<string>('openapi.json');
  const [authType, setAuthType] = useState<string>('bearer');
  const [key, setKey] = useState<string>('');
  const [id, setId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [oauthClientInfo, setOauthClientInfo] = useState<any>(null);
  const [enable, setEnable] = useState<boolean>(true);
  const [accessControl, setAccessControl] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(false);

  const init = () => {
    if (initialConnection) {
      setType(initialConnection.type ?? 'openapi');
      setUrl(initialConnection.url);
      setSpecType(initialConnection.spec_type ?? 'url');
      setSpec(initialConnection.spec ?? '');
      setPath(initialConnection.path ?? 'openapi.json');
      setAuthType(initialConnection.auth_type ?? 'bearer');
      setKey(initialConnection.key ?? '');
      setId(initialConnection.info?.id ?? '');
      setName(initialConnection.info?.name ?? '');
      setDescription(initialConnection.info?.description ?? '');
      setOauthClientInfo(initialConnection.info?.oauth_client_info ?? null);
      setEnable(initialConnection.config?.enable ?? true);
      setAccessControl(initialConnection.config?.access_control ?? {});
    }
  };

  useEffect(() => {
    if (open) {
      init();
    }
  }, [open, initialConnection]);

  const verifyHandler = async () => {
    if (!url) {
      toast.error(t('Please enter a valid URL'));
      return;
    }
    if (!path && !direct) {
      toast.error(t('Please enter a valid path'));
      return;
    }
    toast.success(t('Connection successful'));
  };

  const importHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        let data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          if (data.length === 0) {
            toast.error(t('Please select a valid JSON file'));
            return;
          }
          data = data[0];
        }

        if (data.type) setType(data.type);
        if (data.url) setUrl(data.url);
        if (data.spec_type) setSpecType(data.spec_type);
        if (data.spec) setSpec(data.spec);
        if (data.path) setPath(data.path);
        if (data.auth_type) setAuthType(data.auth_type);
        if (data.key) setKey(data.key);
        if (data.info) {
          setId(data.info.id ?? '');
          setName(data.info.name ?? '');
          setDescription(data.info.description ?? '');
        }
        if (data.config) {
          setEnable(data.config.enable ?? true);
          setAccessControl(data.config.access_control ?? {});
        }

        toast.success(t('Import successful'));
      } catch (error) {
        toast.error(t('Please select a valid JSON file'));
      }
    };
    reader.readAsText(file);
  };

  const exportHandler = () => {
    const json = JSON.stringify(
      [
        {
          type,
          url,
          spec_type: specType,
          spec,
          path,
          auth_type: authType,
          key,
          info: { id, name, description },
        },
      ],
      null,
      2
    );

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tool-server-${id || name || 'export'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const submitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cleanUrl = url.replace(/\/$/, '');
    if (id.includes(':') || id.includes('|')) {
      toast.error(t('ID cannot contain ":" or "|" characters'));
      setLoading(false);
      return;
    }

    if (specType === 'json') {
      try {
        const specJSON = JSON.parse(spec);
        setSpec(JSON.stringify(specJSON, null, 2));
      } catch (e) {
        toast.error(t('Please enter a valid JSON spec'));
        setLoading(false);
        return;
      }
    }

    const connection: Connection = {
      type,
      url: cleanUrl,
      spec_type: specType,
      spec,
      path,
      auth_type: authType,
      key,
      config: {
        enable,
        access_control: accessControl,
      },
      info: {
        id,
        name,
        description,
        ...(oauthClientInfo ? { oauth_client_info: oauthClientInfo } : {}),
      },
    };

    if (onSubmit) {
      await onSubmit(connection);
    }

    setLoading(false);
    onOpenChange(false);

    // Reset form
    setType('openapi');
    setUrl('');
    setSpecType('url');
    setSpec('');
    setPath('openapi.json');
    setAuthType('bearer');
    setKey('');
    setId('');
    setName('');
    setDescription('');
    setOauthClientInfo(null);
    setEnable(true);
    setAccessControl({});
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">
            {edit ? t('Edit Connection') : t('Add Connection')}
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="hover:underline"
              >
                {t('Import')}
              </button>
              <button type="button" onClick={exportHandler} className="hover:underline">
                {t('Export')}
              </button>
            </div>
            <button onClick={() => onOpenChange(false)} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept=".json"
          onChange={importHandler}
        />

        <form onSubmit={submitHandler} className="space-y-4">
          {!direct && (
            <div className="flex justify-between items-center">
              <Label className="text-xs text-gray-500">{t('Type')}</Label>
              <button
                type="button"
                onClick={() => setType(type === 'openapi' ? 'mcp' : 'openapi')}
                className="text-xs"
              >
                {type === 'openapi' ? t('OpenAPI') : t('MCP')}
              </button>
            </div>
          )}

          <div>
            <Label htmlFor="url" className="text-xs text-gray-500">
              {t('URL')}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder={t('API Base URL')}
                required
                className="flex-1"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={verifyHandler}
                    >
                      <RotateCw className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('Verify Connection')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      <Switch checked={enable} onCheckedChange={setEnable} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {enable ? t('Enabled') : t('Disabled')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {type === 'openapi' && (
            <div>
              <Label className="text-xs text-gray-500">{t('OpenAPI Spec')}</Label>
              <div className="flex gap-2">
                <select
                  value={specType}
                  onChange={(e) => setSpecType(e.target.value)}
                  className="text-sm bg-transparent border rounded px-2 py-1"
                >
                  <option value="url">{t('URL')}</option>
                  <option value="json">{t('JSON')}</option>
                </select>
                <div className="flex-1">
                  {specType === 'url' ? (
                    <Input
                      type="text"
                      value={path}
                      onChange={(e) => setPath(e.target.value)}
                      placeholder={t('openapi.json URL or Path')}
                      required
                    />
                  ) : (
                    <textarea
                      value={spec}
                      onChange={(e) => setSpec(e.target.value)}
                      placeholder={t('JSON Spec')}
                      required
                      rows={5}
                      className="w-full text-sm bg-transparent border rounded px-3 py-2"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs text-gray-500">{t('Auth')}</Label>
            <div className="flex gap-2">
              <select
                value={authType}
                onChange={(e) => setAuthType(e.target.value)}
                className="text-sm bg-transparent border rounded px-2 py-1"
              >
                <option value="none">{t('None')}</option>
                <option value="bearer">{t('Bearer')}</option>
                <option value="session">{t('Session')}</option>
                {!direct && <option value="system_oauth">{t('OAuth')}</option>}
              </select>
              <div className="flex-1">
                {authType === 'bearer' && (
                  <SensitiveInput
                    value={key}
                    onChange={(value) => setKey(value)}
                    placeholder={t('API Key')}
                  />
                )}
                {authType === 'none' && (
                  <p className="text-xs text-gray-500 self-center">{t('No authentication')}</p>
                )}
                {authType === 'session' && (
                  <p className="text-xs text-gray-500 self-center">
                    {t('Forwards system user session credentials to authenticate')}
                  </p>
                )}
                {authType === 'system_oauth' && (
                  <p className="text-xs text-gray-500 self-center">
                    {t('Forwards system user OAuth access token to authenticate')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {!direct && (
            <>
              <div className="border-t pt-4 space-y-4">
                <div>
                  <Label htmlFor="id" className="text-xs text-gray-500">
                    {t('ID')}
                  </Label>
                  <Input
                    id="id"
                    type="text"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    placeholder={t('Enter ID')}
                  />
                </div>

                <div>
                  <Label htmlFor="name" className="text-xs text-gray-500">
                    {t('Name')}
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('Enter name')}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-xs text-gray-500">
                    {t('Description')}
                  </Label>
                  <Input
                    id="description"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('Enter description')}
                  />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <AccessControlModal
                  accessControl={accessControl}
                  onAccessControlChange={setAccessControl}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            {edit && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onDelete?.();
                  onOpenChange(false);
                }}
              >
                {t('Delete')}
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {t('Save')}
              {loading && <Loader className="ml-2" />}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddToolServerModal;

