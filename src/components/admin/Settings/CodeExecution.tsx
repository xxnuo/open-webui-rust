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
import { getCodeExecutionConfig, setCodeExecutionConfig } from '@/lib/apis/configs';

interface CodeExecutionConfig {
  ENABLE_CODE_EXECUTION: boolean;
  CODE_EXECUTION_ENGINE: string;
  CODE_EXECUTION_JUPYTER_URL: string;
  CODE_EXECUTION_JUPYTER_AUTH: string;
  CODE_EXECUTION_JUPYTER_AUTH_PASSWORD: string;
  CODE_EXECUTION_JUPYTER_AUTH_TOKEN: string;
  CODE_EXECUTION_JUPYTER_TIMEOUT: number;
  CODE_EXECUTION_SANDBOX_URL: string;
  CODE_EXECUTION_SANDBOX_TIMEOUT: number;
  CODE_EXECUTION_SANDBOX_ENABLE_POOL: boolean;
  CODE_EXECUTION_SANDBOX_POOL_SIZE: number;
  CODE_EXECUTION_SANDBOX_POOL_MAX_REUSE: number;
  CODE_EXECUTION_SANDBOX_POOL_MAX_AGE: number;
  ENABLE_CODE_INTERPRETER: boolean;
  CODE_INTERPRETER_ENGINE: string;
  CODE_INTERPRETER_JUPYTER_URL: string;
  CODE_INTERPRETER_JUPYTER_AUTH: string;
  CODE_INTERPRETER_JUPYTER_AUTH_PASSWORD: string;
  CODE_INTERPRETER_JUPYTER_AUTH_TOKEN: string;
  CODE_INTERPRETER_JUPYTER_TIMEOUT: number;
  CODE_INTERPRETER_SANDBOX_URL: string;
  CODE_INTERPRETER_SANDBOX_TIMEOUT: number;
  CODE_INTERPRETER_PROMPT_TEMPLATE: string;
}

export default function CodeExecution() {
  const { t } = useTranslation();
  const [config, setConfig] = useState<CodeExecutionConfig | null>(null);
  const engines = ['jupyter', 'sandbox'];

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('token') || '';
      try {
        const res = await getCodeExecutionConfig(token);
        if (res) {
          setConfig(res);
        }
      } catch (error) {
        console.error('Failed to load code execution settings:', error);
        toast.error(t('Failed to load settings'));
      }
    };

    init();
  }, [t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token') || '';

    try {
      if (config) {
        await setCodeExecutionConfig(token, config);
        toast.success(t('Settings saved successfully!'));
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error(t('Failed to update settings'));
    }
  };

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">{t('Loading...')}</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full justify-between space-y-3 text-sm">
      <div className="space-y-3 overflow-y-scroll scrollbar-hidden h-full">
        {/* Code Execution Section */}
        <div>
          <div className="mb-3.5">
            <div className="mb-2.5 text-base font-medium">{t('General')}</div>
            <Separator />

            <div className="mb-2.5 mt-2">
              <div className="flex w-full justify-between items-center pr-2">
                <Label className="text-xs font-medium">{t('Enable Code Execution')}</Label>
                <Switch
                  checked={config.ENABLE_CODE_EXECUTION}
                  onCheckedChange={(checked) => setConfig({ ...config, ENABLE_CODE_EXECUTION: checked })}
                />
              </div>
            </div>

            <div className="mb-2.5">
              <div className="flex w-full justify-between items-center">
                <Label className="text-xs font-medium">{t('Code Execution Engine')}</Label>
                <Select
                  value={config.CODE_EXECUTION_ENGINE}
                  onValueChange={(value) => setConfig({ ...config, CODE_EXECUTION_ENGINE: value })}
                >
                  <SelectTrigger className="w-fit px-2 text-xs h-8">
                    <SelectValue placeholder={t('Select a engine')} />
                  </SelectTrigger>
                  <SelectContent>
                    {engines.map((engine) => (
                      <SelectItem key={engine} value={engine}>{engine}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {config.CODE_EXECUTION_ENGINE === 'jupyter' && (
                <div className="text-gray-500 text-xs mt-1">
                  {t('Warning: Jupyter execution enables arbitrary code execution, posing severe security risks—proceed with extreme caution.')}
                </div>
              )}
              {config.CODE_EXECUTION_ENGINE === 'sandbox' && (
                <div className="text-gray-500 text-xs mt-1">
                  {t('Sandbox executor provides isolated code execution with security restrictions.')}
                </div>
              )}
            </div>

            {/* Jupyter Configuration */}
            {config.CODE_EXECUTION_ENGINE === 'jupyter' && (
              <>
                <div className="mb-2.5">
                  <Label className="text-xs font-medium mb-2 block">{t('Jupyter URL')}</Label>
                  <Input
                    type="text"
                    placeholder={t('Enter Jupyter URL')}
                    value={config.CODE_EXECUTION_JUPYTER_URL}
                    onChange={(e) => setConfig({ ...config, CODE_EXECUTION_JUPYTER_URL: e.target.value })}
                    autoComplete="off"
                  />
                </div>

                <div className="mb-2.5">
                  <div className="flex gap-2 w-full items-center justify-between mb-2">
                    <Label className="text-xs font-medium">{t('Jupyter Auth')}</Label>
                    <Select
                      value={config.CODE_EXECUTION_JUPYTER_AUTH}
                      onValueChange={(value) => setConfig({ ...config, CODE_EXECUTION_JUPYTER_AUTH: value })}
                    >
                      <SelectTrigger className="w-fit px-2 text-xs h-8">
                        <SelectValue placeholder={t('None')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{t('None')}</SelectItem>
                        <SelectItem value="token">{t('Token')}</SelectItem>
                        <SelectItem value="password">{t('Password')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {config.CODE_EXECUTION_JUPYTER_AUTH && (
                    <div className="flex w-full gap-2">
                      <div className="flex-1">
                        {config.CODE_EXECUTION_JUPYTER_AUTH === 'password' ? (
                          <SensitiveInput
                            type="text"
                            placeholder={t('Enter Jupyter Password')}
                            value={config.CODE_EXECUTION_JUPYTER_AUTH_PASSWORD}
                            onChange={(value) => setConfig({ ...config, CODE_EXECUTION_JUPYTER_AUTH_PASSWORD: value })}
                          />
                        ) : (
                          <SensitiveInput
                            type="text"
                            placeholder={t('Enter Jupyter Token')}
                            value={config.CODE_EXECUTION_JUPYTER_AUTH_TOKEN}
                            onChange={(value) => setConfig({ ...config, CODE_EXECUTION_JUPYTER_AUTH_TOKEN: value })}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 w-full items-center justify-between">
                  <Label className="text-xs font-medium">{t('Code Execution Timeout')}</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        type="number"
                        className="w-fit px-2 text-xs h-8"
                        placeholder={t('e.g. 60')}
                        value={config.CODE_EXECUTION_JUPYTER_TIMEOUT}
                        onChange={(e) => setConfig({ ...config, CODE_EXECUTION_JUPYTER_TIMEOUT: parseInt(e.target.value) })}
                        autoComplete="off"
                      />
                    </TooltipTrigger>
                    <TooltipContent>{t('Enter timeout in seconds')}</TooltipContent>
                  </Tooltip>
                </div>
              </>
            )}

            {/* Sandbox Configuration */}
            {config.CODE_EXECUTION_ENGINE === 'sandbox' && (
              <>
                <div className="mb-2.5">
                  <Label className="text-xs font-medium mb-2 block">{t('Sandbox Executor URL')}</Label>
                  <Input
                    type="text"
                    placeholder={t('Enter Sandbox Executor URL (e.g. http://localhost:8090)')}
                    value={config.CODE_EXECUTION_SANDBOX_URL}
                    onChange={(e) => setConfig({ ...config, CODE_EXECUTION_SANDBOX_URL: e.target.value })}
                    autoComplete="off"
                  />
                </div>

                <div className="flex gap-2 w-full items-center justify-between mb-2.5">
                  <Label className="text-xs font-medium">{t('Code Execution Timeout')}</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Input
                        type="number"
                        className="w-fit px-2 text-xs h-8"
                        placeholder={t('e.g. 60')}
                        value={config.CODE_EXECUTION_SANDBOX_TIMEOUT}
                        onChange={(e) => setConfig({ ...config, CODE_EXECUTION_SANDBOX_TIMEOUT: parseInt(e.target.value) })}
                        autoComplete="off"
                      />
                    </TooltipTrigger>
                    <TooltipContent>{t('Enter timeout in seconds')}</TooltipContent>
                  </Tooltip>
                </div>

                <Separator className="my-2" />

                <div className="mb-2.5 text-xs font-medium">{t('Container Pool Settings')}</div>

                <div className="mb-2.5">
                  <div className="flex w-full justify-between items-center pr-2">
                    <Label className="text-xs font-medium">{t('Enable Container Pool')}</Label>
                    <Switch
                      checked={config.CODE_EXECUTION_SANDBOX_ENABLE_POOL}
                      onCheckedChange={(checked) => setConfig({ ...config, CODE_EXECUTION_SANDBOX_ENABLE_POOL: checked })}
                    />
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {t('Reuse containers for faster execution (recommended)')}
                  </div>
                </div>

                {config.CODE_EXECUTION_SANDBOX_ENABLE_POOL && (
                  <>
                    <div className="flex gap-2 w-full items-center justify-between mb-2.5">
                      <Label className="text-xs font-medium">{t('Pool Size Per Language')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Input
                            type="number"
                            className="w-fit px-2 text-xs h-8"
                            placeholder={t('e.g. 3')}
                            min={1}
                            max={10}
                            value={config.CODE_EXECUTION_SANDBOX_POOL_SIZE}
                            onChange={(e) => setConfig({ ...config, CODE_EXECUTION_SANDBOX_POOL_SIZE: parseInt(e.target.value) })}
                            autoComplete="off"
                          />
                        </TooltipTrigger>
                        <TooltipContent>{t('Number of warm containers per language')}</TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="flex gap-2 w-full items-center justify-between mb-2.5">
                      <Label className="text-xs font-medium">{t('Max Container Reuse')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Input
                            type="number"
                            className="w-fit px-2 text-xs h-8"
                            placeholder={t('e.g. 50')}
                            min={5}
                            max={200}
                            value={config.CODE_EXECUTION_SANDBOX_POOL_MAX_REUSE}
                            onChange={(e) => setConfig({ ...config, CODE_EXECUTION_SANDBOX_POOL_MAX_REUSE: parseInt(e.target.value) })}
                            autoComplete="off"
                          />
                        </TooltipTrigger>
                        <TooltipContent>{t('Recreate container after N executions')}</TooltipContent>
                      </Tooltip>
                    </div>

                    <div className="flex gap-2 w-full items-center justify-between">
                      <Label className="text-xs font-medium">{t('Max Container Age (seconds)')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Input
                            type="number"
                            className="w-fit px-2 text-xs h-8"
                            placeholder={t('e.g. 600')}
                            min={60}
                            max={3600}
                            value={config.CODE_EXECUTION_SANDBOX_POOL_MAX_AGE}
                            onChange={(e) => setConfig({ ...config, CODE_EXECUTION_SANDBOX_POOL_MAX_AGE: parseInt(e.target.value) })}
                            autoComplete="off"
                          />
                        </TooltipTrigger>
                        <TooltipContent>{t('Recreate container after N seconds')}</TooltipContent>
                      </Tooltip>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Code Interpreter Section */}
          <div className="mb-3.5">
            <div className="mb-2.5 text-base font-medium">{t('Code Interpreter')}</div>
            <Separator />

            <div className="mb-2.5 mt-2">
              <div className="flex w-full justify-between items-center pr-2">
                <Label className="text-xs font-medium">{t('Enable Code Interpreter')}</Label>
                <Switch
                  checked={config.ENABLE_CODE_INTERPRETER}
                  onCheckedChange={(checked) => setConfig({ ...config, ENABLE_CODE_INTERPRETER: checked })}
                />
              </div>
            </div>

            {config.ENABLE_CODE_INTERPRETER && (
              <>
                <div className="mb-2.5">
                  <div className="flex w-full justify-between items-center">
                    <Label className="text-xs font-medium">{t('Code Interpreter Engine')}</Label>
                    <Select
                      value={config.CODE_INTERPRETER_ENGINE}
                      onValueChange={(value) => setConfig({ ...config, CODE_INTERPRETER_ENGINE: value })}
                    >
                      <SelectTrigger className="w-fit px-2 text-xs h-8">
                        <SelectValue placeholder={t('Select a engine')} />
                      </SelectTrigger>
                      <SelectContent>
                        {engines.map((engine) => (
                          <SelectItem key={engine} value={engine}>{engine}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {config.CODE_INTERPRETER_ENGINE === 'jupyter' && (
                    <div className="text-gray-500 text-xs mt-1">
                      {t('Warning: Jupyter execution enables arbitrary code execution, posing severe security risks—proceed with extreme caution.')}
                    </div>
                  )}
                  {config.CODE_INTERPRETER_ENGINE === 'sandbox' && (
                    <div className="text-gray-500 text-xs mt-1">
                      {t('Sandbox executor provides isolated code execution with security restrictions.')}
                    </div>
                  )}
                </div>

                {/* Code Interpreter Jupyter Configuration */}
                {config.CODE_INTERPRETER_ENGINE === 'jupyter' && (
                  <>
                    <div className="mb-2.5">
                      <Label className="text-xs font-medium mb-2 block">{t('Jupyter URL')}</Label>
                      <Input
                        type="text"
                        placeholder={t('Enter Jupyter URL')}
                        value={config.CODE_INTERPRETER_JUPYTER_URL}
                        onChange={(e) => setConfig({ ...config, CODE_INTERPRETER_JUPYTER_URL: e.target.value })}
                        autoComplete="off"
                      />
                    </div>

                    <div className="mb-2.5">
                      <div className="flex gap-2 w-full items-center justify-between mb-2">
                        <Label className="text-xs font-medium">{t('Jupyter Auth')}</Label>
                        <Select
                          value={config.CODE_INTERPRETER_JUPYTER_AUTH}
                          onValueChange={(value) => setConfig({ ...config, CODE_INTERPRETER_JUPYTER_AUTH: value })}
                        >
                          <SelectTrigger className="w-fit px-2 text-xs h-8">
                            <SelectValue placeholder={t('None')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">{t('None')}</SelectItem>
                            <SelectItem value="token">{t('Token')}</SelectItem>
                            <SelectItem value="password">{t('Password')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {config.CODE_INTERPRETER_JUPYTER_AUTH && (
                        <div className="flex w-full gap-2">
                          <div className="flex-1">
                            {config.CODE_INTERPRETER_JUPYTER_AUTH === 'password' ? (
                              <SensitiveInput
                                type="text"
                                placeholder={t('Enter Jupyter Password')}
                                value={config.CODE_INTERPRETER_JUPYTER_AUTH_PASSWORD}
                                onChange={(value) => setConfig({ ...config, CODE_INTERPRETER_JUPYTER_AUTH_PASSWORD: value })}
                              />
                            ) : (
                              <SensitiveInput
                                type="text"
                                placeholder={t('Enter Jupyter Token')}
                                value={config.CODE_INTERPRETER_JUPYTER_AUTH_TOKEN}
                                onChange={(value) => setConfig({ ...config, CODE_INTERPRETER_JUPYTER_AUTH_TOKEN: value })}
                              />
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 w-full items-center justify-between">
                      <Label className="text-xs font-medium">{t('Code Execution Timeout')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Input
                            type="number"
                            className="w-fit px-2 text-xs h-8"
                            placeholder={t('e.g. 60')}
                            value={config.CODE_INTERPRETER_JUPYTER_TIMEOUT}
                            onChange={(e) => setConfig({ ...config, CODE_INTERPRETER_JUPYTER_TIMEOUT: parseInt(e.target.value) })}
                            autoComplete="off"
                          />
                        </TooltipTrigger>
                        <TooltipContent>{t('Enter timeout in seconds')}</TooltipContent>
                      </Tooltip>
                    </div>
                  </>
                )}

                {/* Code Interpreter Sandbox Configuration */}
                {config.CODE_INTERPRETER_ENGINE === 'sandbox' && (
                  <>
                    <div className="mb-2.5">
                      <Label className="text-xs font-medium mb-2 block">{t('Sandbox Executor URL')}</Label>
                      <Input
                        type="text"
                        placeholder={t('Enter Sandbox Executor URL (e.g. http://localhost:8090)')}
                        value={config.CODE_INTERPRETER_SANDBOX_URL}
                        onChange={(e) => setConfig({ ...config, CODE_INTERPRETER_SANDBOX_URL: e.target.value })}
                        autoComplete="off"
                      />
                    </div>

                    <div className="flex gap-2 w-full items-center justify-between">
                      <Label className="text-xs font-medium">{t('Code Execution Timeout')}</Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Input
                            type="number"
                            className="w-fit px-2 text-xs h-8"
                            placeholder={t('e.g. 60')}
                            value={config.CODE_INTERPRETER_SANDBOX_TIMEOUT}
                            onChange={(e) => setConfig({ ...config, CODE_INTERPRETER_SANDBOX_TIMEOUT: parseInt(e.target.value) })}
                            autoComplete="off"
                          />
                        </TooltipTrigger>
                        <TooltipContent>{t('Enter timeout in seconds')}</TooltipContent>
                      </Tooltip>
                    </div>
                  </>
                )}

                <Separator className="my-2" />

                <div>
                  <div className="py-0.5 w-full">
                    <Label className="text-xs font-medium mb-2 block">{t('Code Interpreter Prompt Template')}</Label>
                    <Tooltip>
                      <TooltipTrigger asChild className="w-full">
                        <Textarea
                          value={config.CODE_INTERPRETER_PROMPT_TEMPLATE}
                          onChange={(e) => setConfig({ ...config, CODE_INTERPRETER_PROMPT_TEMPLATE: e.target.value })}
                          placeholder={t('Leave empty to use the default prompt, or enter a custom prompt')}
                          className="min-h-[80px]"
                        />
                      </TooltipTrigger>
                      <TooltipContent>{t('Leave empty to use the default prompt, or enter a custom prompt')}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-3 text-sm font-medium">
        <Button type="submit" className="px-3.5 py-1.5 rounded-full">
          {t('Save')}
        </Button>
      </div>
    </form>
  );
}
