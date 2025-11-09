import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/store';

interface AudioProps {
  saveSettings: (settings: Record<string, unknown>) => Promise<void>;
  onSave: () => void;
}

export default function Audio({ saveSettings, onSave }: AudioProps) {
  const { t } = useTranslation();
  const { user, settings, config } = useAppStore();

  // STT Settings
  const [STTEngine, setSTTEngine] = useState('');
  const [STTLanguage, setSTTLanguage] = useState('');
  const [speechAutoSend, setSpeechAutoSend] = useState(false);

  // TTS Settings
  const [TTSEngine, setTTSEngine] = useState('');
  const [responseAutoPlayback, setResponseAutoPlayback] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [voice, setVoice] = useState('');
  const [nonLocalVoices, setNonLocalVoices] = useState(false);

  // Voice list
  const [voices, setVoices] = useState<any[]>([]);

  useEffect(() => {
    // Load settings
    setSpeechAutoSend(settings?.speechAutoSend ?? false);
    setResponseAutoPlayback(settings?.responseAutoPlayback ?? false);
    setPlaybackRate(settings?.audio?.tts?.playbackRate ?? 1);

    setSTTEngine(settings?.audio?.stt?.engine ?? '');
    setSTTLanguage(settings?.audio?.stt?.language ?? '');

    setTTSEngine(settings?.audio?.tts?.engine ?? '');
    setVoice(settings?.audio?.tts?.voice ?? config?.audio?.tts?.voice ?? '');
    setNonLocalVoices(settings?.audio?.tts?.nonLocalVoices ?? false);

    // Load voices
    loadVoices();
  }, []);

  const loadVoices = () => {
    if (config?.audio?.tts?.engine === '') {
      const interval = setInterval(() => {
        const availableVoices = window.speechSynthesis.getVoices();
        if (availableVoices.length > 0) {
          setVoices(availableVoices.map(v => ({
            id: v.name,
            name: v.name,
            localService: v.localService
          })));
          clearInterval(interval);
        }
      }, 100);
    }
  };

  const toggleSpeechAutoSend = () => {
    const newValue = !speechAutoSend;
    setSpeechAutoSend(newValue);
    saveSettings({ speechAutoSend: newValue });
  };

  const toggleResponseAutoPlayback = () => {
    const newValue = !responseAutoPlayback;
    setResponseAutoPlayback(newValue);
    saveSettings({ responseAutoPlayback: newValue });
  };

  const handleSave = async () => {
    await saveSettings({
      audio: {
        stt: {
          engine: STTEngine !== '' ? STTEngine : undefined,
          language: STTLanguage !== '' ? STTLanguage : undefined,
        },
        tts: {
          engine: TTSEngine !== '' ? TTSEngine : undefined,
          playbackRate: playbackRate,
          voice: voice !== '' ? voice : undefined,
          defaultVoice: config?.audio?.tts?.voice ?? '',
          nonLocalVoices: config?.audio?.tts?.engine === '' ? nonLocalVoices : undefined,
        },
      },
    });
    onSave();
  };

  return (
    <div className="flex flex-col h-full justify-between text-sm">
      <div className="space-y-4 overflow-y-auto max-h-[28rem] md:max-h-full">
        {/* STT Settings */}
        <div>
          <h2 className="mb-3 text-sm font-medium">{t('STT Settings')}</h2>

          <div className="space-y-3">
            {config?.audio?.stt?.engine !== 'web' && (
              <>
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-medium">{t('Speech-to-Text Engine')}</Label>
                  <Select value={STTEngine} onValueChange={setSTTEngine}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('Select an engine')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{t('Default')}</SelectItem>
                      <SelectItem value="web">{t('Web API')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between items-center">
                  <Label className="text-xs font-medium">{t('Language')}</Label>
                  <Input
                    type="text"
                    value={STTLanguage}
                    onChange={(e) => setSTTLanguage(e.target.value)}
                    placeholder={t('e.g. en')}
                    className="w-[180px] text-sm"
                  />
                </div>
              </>
            )}

            <div className="flex justify-between items-center">
              <Label className="text-xs font-medium">
                {t('Instant Auto-Send After Voice Transcription')}
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSpeechAutoSend}
                className="text-xs"
              >
                {speechAutoSend ? t('On') : t('Off')}
              </Button>
            </div>
          </div>
        </div>

        {/* TTS Settings */}
        <div>
          <h2 className="mb-3 text-sm font-medium">{t('TTS Settings')}</h2>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-medium">{t('Text-to-Speech Engine')}</Label>
              <Select value={TTSEngine} onValueChange={setTTSEngine}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('Select an engine')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('Default')}</SelectItem>
                  <SelectItem value="browser-kokoro">{t('Kokoro.js (Browser)')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-xs font-medium">{t('Auto-playback response')}</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleResponseAutoPlayback}
                className="text-xs"
              >
                {responseAutoPlayback ? t('On') : t('Off')}
              </Button>
            </div>

            <div className="flex justify-between items-center">
              <Label className="text-xs font-medium">{t('Speech Playback Speed')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={playbackRate}
                  onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                  className="w-20 text-sm"
                />
                <span className="text-xs">x</span>
              </div>
            </div>
          </div>
        </div>

        {/* Voice Selection */}
        {config?.audio?.tts?.engine === '' && (
          <div>
            <h2 className="mb-3 text-sm font-medium">{t('Set Voice')}</h2>

            <div className="space-y-3">
              <Select value={voice} onValueChange={setVoice}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('Select a voice')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('Default')}</SelectItem>
                  {voices
                    .filter(v => nonLocalVoices || v.localService)
                    .map((v) => (
                      <SelectItem key={v.id} value={v.name}>
                        {v.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <div className="flex justify-between items-center">
                <Label className="text-xs">{t('Allow non-local voices')}</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newValue = !nonLocalVoices;
                    setNonLocalVoices(newValue);
                    loadVoices();
                  }}
                  className="text-xs"
                >
                  {nonLocalVoices ? t('On') : t('Off')}
                </Button>
              </div>
            </div>
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

