import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/store';
import AdvancedParams from './General/AdvancedParams';

interface GeneralProps {
  saveSettings: (settings: Record<string, unknown>) => Promise<void>;
  onSave: () => void;
}

export default function General({ saveSettings, onSave }: GeneralProps) {
  const { t, i18n } = useTranslation();
  const { user, settings, setSettings } = useAppStore();

  // General
  const [selectedTheme, setSelectedTheme] = useState('system');
  const [lang, setLang] = useState(i18n.language);
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [system, setSystem] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced parameters
  const [params, setParams] = useState<any>({
    stream_response: null,
    stream_delta_chunk_size: null,
    function_calling: null,
    seed: null,
    temperature: null,
    reasoning_effort: null,
    logit_bias: null,
    frequency_penalty: null,
    presence_penalty: null,
    repeat_penalty: null,
    repeat_last_n: null,
    mirostat: null,
    mirostat_eta: null,
    mirostat_tau: null,
    top_k: null,
    top_p: null,
    min_p: null,
    stop: null,
    tfs_z: null,
    num_ctx: null,
    num_batch: null,
    num_keep: null,
    max_tokens: null,
    num_gpu: null,
  });

  const themes = ['dark', 'light', 'oled-dark', 'system'];
  
  const languages = [
    { code: 'en', title: 'English' },
    { code: 'zh', title: '中文' },
    // Add more languages as needed
  ];

  useEffect(() => {
    // Load settings on mount
    const loadSettings = async () => {
      setSelectedTheme(localStorage.getItem('theme') || 'system');
      setNotificationEnabled(settings?.notificationEnabled ?? false);
      setSystem(settings?.system ?? '');
      setParams({ ...params, ...settings?.params });
      
      if (settings?.params?.stop) {
        setParams((prev: Record<string, unknown>) => ({
          ...prev,
          stop: settings.params.stop.join(','),
        }));
      }
    };

    loadSettings();
  }, []);

  const toggleNotification = async () => {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      const newValue = !notificationEnabled;
      setNotificationEnabled(newValue);
      await saveSettings({ notificationEnabled: newValue });
    } else {
      toast.error(
        t('Response notifications cannot be activated as the website permissions have been denied. Please visit your browser settings to grant the necessary access.')
      );
    }
  };

  const applyTheme = (_theme: string) => {
    let themeToApply = _theme === 'oled-dark' ? 'dark' : _theme === 'her' ? 'light' : _theme;

    if (_theme === 'system') {
      themeToApply = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    if (themeToApply === 'dark' && !_theme.includes('oled')) {
      document.documentElement.style.setProperty('--color-gray-800', '#333');
      document.documentElement.style.setProperty('--color-gray-850', '#262626');
      document.documentElement.style.setProperty('--color-gray-900', '#171717');
      document.documentElement.style.setProperty('--color-gray-950', '#0d0d0d');
    }

    themes
      .filter((e) => e !== themeToApply)
      .forEach((e) => {
        e.split(' ').forEach((cls) => {
          document.documentElement.classList.remove(cls);
        });
      });

    themeToApply.split(' ').forEach((cls) => {
      document.documentElement.classList.add(cls);
    });

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      if (_theme.includes('system')) {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
        metaThemeColor.setAttribute('content', systemTheme === 'light' ? '#ffffff' : '#171717');
      } else {
        metaThemeColor.setAttribute(
          'content',
          _theme === 'dark'
            ? '#171717'
            : _theme === 'oled-dark'
              ? '#000000'
              : _theme === 'her'
                ? '#983724'
                : '#ffffff'
        );
      }
    }

    if (_theme.includes('oled')) {
      document.documentElement.style.setProperty('--color-gray-800', '#101010');
      document.documentElement.style.setProperty('--color-gray-850', '#050505');
      document.documentElement.style.setProperty('--color-gray-900', '#000000');
      document.documentElement.style.setProperty('--color-gray-950', '#000000');
      document.documentElement.classList.add('dark');
    }
  };

  const themeChangeHandler = (_theme: string) => {
    setSelectedTheme(_theme);
    localStorage.setItem('theme', _theme);
    applyTheme(_theme);
  };

  const handleSave = async () => {
    await saveSettings({
      system: system !== '' ? system : undefined,
      params: {
        stream_response: params.stream_response !== null ? params.stream_response : undefined,
        stream_delta_chunk_size:
          params.stream_delta_chunk_size !== null ? params.stream_delta_chunk_size : undefined,
        function_calling: params.function_calling !== null ? params.function_calling : undefined,
        seed: params.seed !== null ? params.seed : undefined,
        stop: params.stop ? params.stop.split(',').filter((e: string) => e) : undefined,
        temperature: params.temperature !== null ? params.temperature : undefined,
        reasoning_effort: params.reasoning_effort !== null ? params.reasoning_effort : undefined,
        logit_bias: params.logit_bias !== null ? params.logit_bias : undefined,
        frequency_penalty: params.frequency_penalty !== null ? params.frequency_penalty : undefined,
        presence_penalty: params.presence_penalty !== null ? params.presence_penalty : undefined,
        repeat_penalty: params.repeat_penalty !== null ? params.repeat_penalty : undefined,
        repeat_last_n: params.repeat_last_n !== null ? params.repeat_last_n : undefined,
        mirostat: params.mirostat !== null ? params.mirostat : undefined,
        mirostat_eta: params.mirostat_eta !== null ? params.mirostat_eta : undefined,
        mirostat_tau: params.mirostat_tau !== null ? params.mirostat_tau : undefined,
        top_k: params.top_k !== null ? params.top_k : undefined,
        top_p: params.top_p !== null ? params.top_p : undefined,
        min_p: params.min_p !== null ? params.min_p : undefined,
        tfs_z: params.tfs_z !== null ? params.tfs_z : undefined,
        num_ctx: params.num_ctx !== null ? params.num_ctx : undefined,
        num_batch: params.num_batch !== null ? params.num_batch : undefined,
        num_keep: params.num_keep !== null ? params.num_keep : undefined,
        max_tokens: params.max_tokens !== null ? params.max_tokens : undefined,
        num_gpu: params.num_gpu !== null ? params.num_gpu : undefined,
      },
    });
    onSave();
  };

  return (
    <div className="flex flex-col h-full justify-between text-sm">
      <div className="overflow-y-auto max-h-[28rem] md:max-h-full space-y-4">
        <div>
          <h2 className="mb-3 text-sm font-medium">{t('WebUI Settings')}</h2>

          <div className="flex w-full justify-between items-center mb-3">
            <Label className="text-xs font-medium">{t('Theme')}</Label>
            <Select value={selectedTheme} onValueChange={themeChangeHandler}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('Select a theme')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">⚙️ {t('System')}</SelectItem>
                <SelectItem value="dark">🌑 {t('Dark')}</SelectItem>
                <SelectItem value="oled-dark">🌃 {t('OLED Dark')}</SelectItem>
                <SelectItem value="light">☀️ {t('Light')}</SelectItem>
                <SelectItem value="her">🌷 Her</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex w-full justify-between items-center mb-3">
            <Label className="text-xs font-medium">{t('Language')}</Label>
            <Select
              value={lang}
              onValueChange={(value) => {
                setLang(value);
                i18n.changeLanguage(value);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('Select a language')} />
              </SelectTrigger>
              <SelectContent>
                {languages.map((language) => (
                  <SelectItem key={language.code} value={language.code}>
                    {language.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex w-full justify-between items-center">
            <Label className="text-xs font-medium">{t('Notifications')}</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleNotification}
              className="text-xs"
            >
              {notificationEnabled ? t('On') : t('Off')}
            </Button>
          </div>
        </div>

        {(user?.role === 'admin' || user?.permissions?.chat?.system_prompt) && (
          <>
            <hr className="border-gray-200 dark:border-gray-800 my-3" />
            <div>
              <h2 className="mb-2.5 text-sm font-medium">{t('System Prompt')}</h2>
              <Textarea
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                rows={4}
                placeholder={t('Enter system prompt here')}
                className="w-full text-sm resize-y"
              />
            </div>
          </>
        )}

        {(user?.role === 'admin' || user?.permissions?.chat?.controls) && (
          <div className="mt-2 space-y-3">
            <div className="flex justify-between items-center text-sm">
              <div className="font-medium">{t('Advanced Parameters')}</div>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-gray-400 dark:text-gray-500"
              >
                {showAdvanced ? t('Hide') : t('Show')}
              </Button>
            </div>

            {showAdvanced && (
              <AdvancedParams
                admin={user?.role === 'admin'}
                params={params}
                setParams={setParams}
              />
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-3">
        <Button
          onClick={handleSave}
          className="px-3.5 py-1.5 text-sm font-medium rounded-full"
        >
          {t('Save')}
        </Button>
      </div>
    </div>
  );
}

