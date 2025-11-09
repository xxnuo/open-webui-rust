import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SensitiveInput from '@/components/common/SensitiveInput';
import {
  getAdminConfig,
  updateAdminConfig,
  getLdapConfig,
  updateLdapConfig,
  getLdapServer,
  updateLdapServer
} from '@/lib/apis/auths';
import { getWebhookUrl, updateWebhookUrl, getVersionUpdates, getBackendConfig } from '@/lib/apis';
import { WEBUI_VERSION } from '@/lib/constants';

interface AdminConfig {
  DEFAULT_USER_ROLE: string;
  ENABLE_SIGNUP: boolean;
  SHOW_ADMIN_DETAILS: boolean;
  PENDING_USER_OVERLAY_TITLE: string;
  PENDING_USER_OVERLAY_CONTENT: string;
  ENABLE_API_KEY: boolean;
  ENABLE_API_KEY_ENDPOINT_RESTRICTIONS: boolean;
  API_KEY_ALLOWED_ENDPOINTS: string;
  JWT_EXPIRES_IN: string;
  ENABLE_COMMUNITY_SHARING: boolean;
  ENABLE_MESSAGE_RATING: boolean;
  ENABLE_NOTES: boolean;
  ENABLE_CHANNELS: boolean;
  ENABLE_USER_WEBHOOKS: boolean;
  RESPONSE_WATERMARK: string;
  WEBUI_URL: string;
}

interface LdapServer {
  label: string;
  host: string;
  port: string;
  attribute_for_mail: string;
  attribute_for_username: string;
  app_dn: string;
  app_dn_password: string;
  search_base: string;
  search_filters: string;
  use_tls: boolean;
  certificate_path: string;
  ciphers: string;
  validate_cert?: boolean;
}

export default function General() {
  const { t } = useTranslation();
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [enableLdap, setEnableLdap] = useState(false);
  const [ldapServer, setLdapServer] = useState<LdapServer>({
    label: '',
    host: '',
    port: '',
    attribute_for_mail: 'mail',
    attribute_for_username: 'uid',
    app_dn: '',
    app_dn_password: '',
    search_base: '',
    search_filters: '',
    use_tls: false,
    certificate_path: '',
    ciphers: '',
    validate_cert: false
  });

  const [updateAvailable, setUpdateAvailable] = useState<boolean | null>(null);
  const [version, setVersion] = useState({ current: '', latest: '' });

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token') || '';
      
      try {
        const [config, webhook, ldapCfg, ldapSrv, backendConfig] = await Promise.all([
          getAdminConfig(token),
          getWebhookUrl(token),
          getLdapConfig(token),
          getLdapServer(token),
          getBackendConfig()
        ]);

        if (config) setAdminConfig(config);
        if (webhook) setWebhookUrl(webhook);
        if (ldapCfg) setEnableLdap(ldapCfg.ENABLE_LDAP);
        if (ldapSrv) setLdapServer(ldapSrv);

        // Check for version updates if enabled
        if (backendConfig?.features?.enable_version_update_check) {
          try {
            const versionData = await getVersionUpdates(token);
            if (versionData) {
              setVersion(versionData);
              const current = versionData.current || WEBUI_VERSION;
              const latest = versionData.latest || WEBUI_VERSION;
              setUpdateAvailable(compareVersion(latest, current));
            }
          } catch (error) {
            console.error('Failed to check for updates:', error);
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
        toast.error(t('Failed to load settings'));
      }
    };

    init();
  }, [t]);

  const compareVersion = (latest: string, current: string): boolean => {
    const latestParts = latest.split('.').map(Number);
    const currentParts = current.split('.').map(Number);
    
    for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
      const l = latestParts[i] || 0;
      const c = currentParts[i] || 0;
      if (l > c) return true;
      if (l < c) return false;
    }
    return false;
  };

  const updateLdapServerHandler = async () => {
    if (!enableLdap) return;
    const token = localStorage.getItem('token') || '';
    try {
      await updateLdapServer(token, ldapServer);
      toast.success(t('LDAP server updated'));
    } catch (error) {
      toast.error(String(error));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token') || '';

    try {
      await updateWebhookUrl(token, webhookUrl);
      if (adminConfig) {
        await updateAdminConfig(token, adminConfig);
      }
      await updateLdapConfig(token, enableLdap);
      await updateLdapServerHandler();
      
      // Reload backend config
      await getBackendConfig();
      
      toast.success(t('Settings saved successfully!'));
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error(t('Failed to update settings'));
    }
  };

  if (!adminConfig) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t('Loading...')}</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between space-y-3 text-sm">
      <div className="mt-0.5 space-y-3 overflow-y-scroll scrollbar-hidden h-full">
        <div>
          <div className="mb-3.5">
            <div className="mb-2.5 text-base font-medium">{t('General')}</div>
            <Separator />
          </div>

          {/* Authentication Section */}
          <div className="mb-3">
            <div className="mb-2.5 text-base font-medium">{t('Authentication')}</div>
            <Separator className="my-2" />

            {/* Default User Role */}
            <div className="mb-2.5 flex w-full justify-between items-center">
              <Label className="text-xs font-medium">{t('Default User Role')}</Label>
              <Select
                value={adminConfig.DEFAULT_USER_ROLE}
                onValueChange={(value) => setAdminConfig({ ...adminConfig, DEFAULT_USER_ROLE: value })}
              >
                <SelectTrigger className="w-fit px-2 text-xs h-8">
                  <SelectValue placeholder={t('Select a role')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('pending')}</SelectItem>
                  <SelectItem value="user">{t('user')}</SelectItem>
                  <SelectItem value="admin">{t('admin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Enable New Sign Ups */}
            <div className="mb-2.5 flex w-full justify-between items-center pr-2">
              <Label className="text-xs font-medium">{t('Enable New Sign Ups')}</Label>
              <Switch
                checked={adminConfig.ENABLE_SIGNUP}
                onCheckedChange={(checked) => setAdminConfig({ ...adminConfig, ENABLE_SIGNUP: checked })}
              />
            </div>

            {/* Show Admin Details */}
            <div className="mb-2.5 flex w-full justify-between items-center pr-2">
              <Label className="text-xs font-medium">{t('Show Admin Details in Account Pending Overlay')}</Label>
              <Switch
                checked={adminConfig.SHOW_ADMIN_DETAILS}
                onCheckedChange={(checked) => setAdminConfig({ ...adminConfig, SHOW_ADMIN_DETAILS: checked })}
              />
            </div>

            {/* Pending User Overlay Title */}
            <div className="mb-2.5">
              <Label className="text-xs font-medium mb-2 block">{t('Pending User Overlay Title')}</Label>
              <Textarea
                placeholder={t('Enter a title for the pending user info overlay. Leave empty for default.')}
                value={adminConfig.PENDING_USER_OVERLAY_TITLE}
                onChange={(e) => setAdminConfig({ ...adminConfig, PENDING_USER_OVERLAY_TITLE: e.target.value })}
                className="min-h-[60px]"
              />
            </div>

            {/* Pending User Overlay Content */}
            <div className="mb-2.5">
              <Label className="text-xs font-medium mb-2 block">{t('Pending User Overlay Content')}</Label>
              <Textarea
                placeholder={t('Enter content for the pending user info overlay. Leave empty for default.')}
                value={adminConfig.PENDING_USER_OVERLAY_CONTENT}
                onChange={(e) => setAdminConfig({ ...adminConfig, PENDING_USER_OVERLAY_CONTENT: e.target.value })}
                className="min-h-[60px]"
              />
            </div>

            {/* Enable API Key */}
            <div className="mb-2.5 flex w-full justify-between items-center pr-2">
              <Label className="text-xs font-medium">{t('Enable API Key')}</Label>
              <Switch
                checked={adminConfig.ENABLE_API_KEY}
                onCheckedChange={(checked) => setAdminConfig({ ...adminConfig, ENABLE_API_KEY: checked })}
              />
            </div>

            {adminConfig.ENABLE_API_KEY && (
              <>
                <div className="mb-2.5 flex w-full justify-between items-center pr-2">
                  <Label className="text-xs font-medium">{t('API Key Endpoint Restrictions')}</Label>
                  <Switch
                    checked={adminConfig.ENABLE_API_KEY_ENDPOINT_RESTRICTIONS}
                    onCheckedChange={(checked) => setAdminConfig({ ...adminConfig, ENABLE_API_KEY_ENDPOINT_RESTRICTIONS: checked })}
                  />
                </div>

                {adminConfig.ENABLE_API_KEY_ENDPOINT_RESTRICTIONS && (
                  <div className="flex w-full flex-col pr-2">
                    <Label className="text-xs font-medium">{t('Allowed Endpoints')}</Label>
                    <Input
                      className="w-full mt-1 text-sm"
                      type="text"
                      placeholder="e.g.) /api/v1/messages, /api/v1/channels"
                      value={adminConfig.API_KEY_ALLOWED_ENDPOINTS}
                      onChange={(e) => setAdminConfig({ ...adminConfig, API_KEY_ALLOWED_ENDPOINTS: e.target.value })}
                    />
                    <div className="mt-2 text-xs text-muted-foreground">
                      <a
                        href="https://docs.openwebui.com/getting-started/api-endpoints"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        {t('To learn more about available endpoints, visit our documentation.')}
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* JWT Expiration */}
            <div className="mb-2.5 w-full">
              <div className="flex w-full justify-between">
                <Label className="text-xs font-medium">{t('JWT Expiration')}</Label>
              </div>
              <div className="flex mt-2 space-x-2">
                <Input
                  className="w-full text-sm"
                  type="text"
                  placeholder='e.g.) "30m","1h", "10d".'
                  value={adminConfig.JWT_EXPIRES_IN}
                  onChange={(e) => setAdminConfig({ ...adminConfig, JWT_EXPIRES_IN: e.target.value })}
                />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {t('Valid time units:')} <span className="font-medium">{t("'s', 'm', 'h', 'd', 'w' or '-1' for no expiration.")}</span>
              </div>
            </div>

            {/* LDAP Section */}
            <div className="space-y-3">
              <div className="mt-2 space-y-2 pr-1.5">
                <div className="flex justify-between items-center text-sm">
                  <Label className="font-medium">{t('LDAP')}</Label>
                  <Switch
                    checked={enableLdap}
                    onCheckedChange={setEnableLdap}
                  />
                </div>

                {enableLdap && (
                  <div className="flex flex-col gap-1 space-y-2">
                    <div className="flex w-full gap-2">
                      <div className="w-full">
                        <Label className="text-xs font-medium mb-1 block">{t('Label')}</Label>
                        <Input
                          className="w-full"
                          required
                          placeholder={t('Enter server label')}
                          value={ldapServer.label}
                          onChange={(e) => setLdapServer({ ...ldapServer, label: e.target.value })}
                        />
                      </div>
                      <div className="w-full"></div>
                    </div>

                    <div className="flex w-full gap-2">
                      <div className="w-full">
                        <Label className="text-xs font-medium mb-1 block">{t('Host')}</Label>
                        <Input
                          className="w-full"
                          required
                          placeholder={t('Enter server host')}
                          value={ldapServer.host}
                          onChange={(e) => setLdapServer({ ...ldapServer, host: e.target.value })}
                        />
                      </div>
                      <div className="w-full">
                        <Label className="text-xs font-medium mb-1 block">{t('Port')}</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Input
                              className="w-full"
                              type="number"
                              placeholder={t('Enter server port')}
                              value={ldapServer.port}
                              onChange={(e) => setLdapServer({ ...ldapServer, port: e.target.value })}
                            />
                          </TooltipTrigger>
                          <TooltipContent>{t('Default to 389 or 636 if TLS is enabled')}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="flex w-full gap-2">
                      <div className="w-full">
                        <Label className="text-xs font-medium mb-1 block">{t('Application DN')}</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Input
                              className="w-full"
                              required
                              placeholder={t('Enter Application DN')}
                              value={ldapServer.app_dn}
                              onChange={(e) => setLdapServer({ ...ldapServer, app_dn: e.target.value })}
                            />
                          </TooltipTrigger>
                          <TooltipContent>{t('The Application Account DN you bind with for search')}</TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="w-full">
                        <Label className="text-xs font-medium mb-1 block">{t('Application DN Password')}</Label>
                        <SensitiveInput
                          placeholder={t('Enter Application DN Password')}
                          value={ldapServer.app_dn_password}
                          onChange={(value) => setLdapServer({ ...ldapServer, app_dn_password: value })}
                          type="password"
                        />
                      </div>
                    </div>

                    <div className="flex w-full gap-2">
                      <div className="w-full">
                        <Label className="text-xs font-medium mb-1 block">{t('Attribute for Mail')}</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Input
                              className="w-full"
                              required
                              placeholder={t('Example: mail')}
                              value={ldapServer.attribute_for_mail}
                              onChange={(e) => setLdapServer({ ...ldapServer, attribute_for_mail: e.target.value })}
                            />
                          </TooltipTrigger>
                          <TooltipContent>{t('The LDAP attribute that maps to the mail that users use to sign in.')}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="flex w-full gap-2">
                      <div className="w-full">
                        <Label className="text-xs font-medium mb-1 block">{t('Attribute for Username')}</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Input
                              className="w-full"
                              required
                              placeholder={t('Example: sAMAccountName or uid or userPrincipalName')}
                              value={ldapServer.attribute_for_username}
                              onChange={(e) => setLdapServer({ ...ldapServer, attribute_for_username: e.target.value })}
                            />
                          </TooltipTrigger>
                          <TooltipContent>{t('The LDAP attribute that maps to the username that users use to sign in.')}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="flex w-full gap-2">
                      <div className="w-full">
                        <Label className="text-xs font-medium mb-1 block">{t('Search Base')}</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Input
                              className="w-full"
                              required
                              placeholder={t('Example: ou=users,dc=foo,dc=example')}
                              value={ldapServer.search_base}
                              onChange={(e) => setLdapServer({ ...ldapServer, search_base: e.target.value })}
                            />
                          </TooltipTrigger>
                          <TooltipContent>{t('The base to search for users')}</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="flex w-full gap-2">
                      <div className="w-full">
                        <Label className="text-xs font-medium mb-1 block">{t('Search Filters')}</Label>
                        <Input
                          className="w-full"
                          placeholder={t('Example: (&(objectClass=inetOrgPerson)(uid=%s))')}
                          value={ldapServer.search_filters}
                          onChange={(e) => setLdapServer({ ...ldapServer, search_filters: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      <a
                        className="underline hover:text-foreground"
                        href="https://ldap.com/ldap-filters/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {t('Click here for filter guides.')}
                      </a>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-sm">
                        <Label className="font-medium">{t('TLS')}</Label>
                        <Switch
                          checked={ldapServer.use_tls}
                          onCheckedChange={(checked) => setLdapServer({ ...ldapServer, use_tls: checked })}
                        />
                      </div>

                      {ldapServer.use_tls && (
                        <div className="space-y-2 mt-2">
                          <div className="flex w-full gap-2">
                            <div className="w-full">
                              <Label className="text-xs font-medium mb-1 block">{t('Certificate Path')}</Label>
                              <Input
                                className="w-full"
                                placeholder={t('Enter certificate path')}
                                value={ldapServer.certificate_path}
                                onChange={(e) => setLdapServer({ ...ldapServer, certificate_path: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-xs">
                            <Label className="font-medium">{t('Validate certificate')}</Label>
                            <Switch
                              checked={ldapServer.validate_cert || false}
                              onCheckedChange={(checked) => setLdapServer({ ...ldapServer, validate_cert: checked })}
                            />
                          </div>

                          <div className="flex w-full gap-2">
                            <div className="w-full">
                              <Label className="text-xs font-medium mb-1 block">{t('Ciphers')}</Label>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Input
                                    className="w-full"
                                    placeholder={t('Example: ALL')}
                                    value={ldapServer.ciphers}
                                    onChange={(e) => setLdapServer({ ...ldapServer, ciphers: e.target.value })}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>{t('Default to ALL')}</TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="w-full"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="mb-3">
            <div className="mb-2.5 text-base font-medium">{t('Features')}</div>
            <Separator className="my-2" />

            <div className="mb-2.5 flex w-full justify-between items-center pr-2">
              <Label className="text-xs font-medium">{t('Enable Community Sharing')}</Label>
              <Switch
                checked={adminConfig.ENABLE_COMMUNITY_SHARING}
                onCheckedChange={(checked) => setAdminConfig({ ...adminConfig, ENABLE_COMMUNITY_SHARING: checked })}
              />
            </div>

            <div className="mb-2.5 flex w-full justify-between items-center pr-2">
              <Label className="text-xs font-medium">{t('Enable Message Rating')}</Label>
              <Switch
                checked={adminConfig.ENABLE_MESSAGE_RATING}
                onCheckedChange={(checked) => setAdminConfig({ ...adminConfig, ENABLE_MESSAGE_RATING: checked })}
              />
            </div>

            <div className="mb-2.5 flex w-full justify-between items-center pr-2">
              <Label className="text-xs font-medium">{t('Notes')} ({t('Beta')})</Label>
              <Switch
                checked={adminConfig.ENABLE_NOTES}
                onCheckedChange={(checked) => setAdminConfig({ ...adminConfig, ENABLE_NOTES: checked })}
              />
            </div>

            <div className="mb-2.5 flex w-full justify-between items-center pr-2">
              <Label className="text-xs font-medium">{t('Channels')} ({t('Beta')})</Label>
              <Switch
                checked={adminConfig.ENABLE_CHANNELS}
                onCheckedChange={(checked) => setAdminConfig({ ...adminConfig, ENABLE_CHANNELS: checked })}
              />
            </div>

            <div className="mb-2.5 flex w-full justify-between items-center pr-2">
              <Label className="text-xs font-medium">{t('User Webhooks')}</Label>
              <Switch
                checked={adminConfig.ENABLE_USER_WEBHOOKS}
                onCheckedChange={(checked) => setAdminConfig({ ...adminConfig, ENABLE_USER_WEBHOOKS: checked })}
              />
            </div>

            <div className="mb-2.5">
              <Label className="text-xs font-medium mb-2 block">{t('Response Watermark')}</Label>
              <Textarea
                placeholder={t('Enter a watermark for the response. Leave empty for none.')}
                value={adminConfig.RESPONSE_WATERMARK}
                onChange={(e) => setAdminConfig({ ...adminConfig, RESPONSE_WATERMARK: e.target.value })}
                className="min-h-[60px]"
              />
            </div>

            <div className="mb-2.5 w-full">
              <div className="flex w-full justify-between">
                <Label className="text-xs font-medium">{t('WebUI URL')}</Label>
              </div>
              <div className="flex mt-2 space-x-2">
                <Input
                  className="w-full text-sm"
                  type="text"
                  placeholder='e.g.) "http://localhost:3000"'
                  value={adminConfig.WEBUI_URL}
                  onChange={(e) => setAdminConfig({ ...adminConfig, WEBUI_URL: e.target.value })}
                />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {t('Enter the public URL of your WebUI. This URL will be used to generate links in the notifications.')}
              </div>
            </div>

            <div className="w-full">
              <div className="flex w-full justify-between">
                <Label className="text-xs font-medium">{t('Webhook URL')}</Label>
              </div>
              <div className="flex mt-2 space-x-2">
                <Input
                  className="w-full text-sm"
                  type="text"
                  placeholder="https://example.com/webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-3 text-sm font-medium">
        <Button 
          type="submit"
          className="px-3.5 py-1.5 rounded-full"
        >
          {t('Save')}
        </Button>
      </div>
    </form>
  );
}
