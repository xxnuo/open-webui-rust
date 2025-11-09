import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateCompletion } from '@/lib/apis';

interface CompletionsModeProps {
  modelId: string;
}

export default function CompletionsMode({ modelId }: CompletionsModeProps) {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState('');
  const [completion, setCompletion] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Parameters
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(500);
  const [topP, setTopP] = useState(1);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  const [presencePenalty, setPresencePenalty] = useState(0);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error(t('Please enter a prompt'));
      return;
    }

    setLoading(true);
    setCompletion('');

    try {
      const response = await generateCompletion(localStorage.token, {
        model: modelId,
        prompt: prompt,
        temperature: temperature,
        max_tokens: maxTokens,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty
      });

      setCompletion(response.choices?.[0]?.text || response.text || '');
    } catch (error: any) {
      toast.error(error.message || t('Failed to generate completion'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(completion);
    toast.success(t('Copied to clipboard'));
  };

  const handleClear = () => {
    setPrompt('');
    setCompletion('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Input Section */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('Prompt')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('Enter your prompt here...')}
              className="min-h-[300px] font-mono text-sm"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('Completion')}</CardTitle>
              {completion && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy}>
                    <Copy className="size-4 mr-2" />
                    {t('Copy')}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center min-h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : completion ? (
              <div className="min-h-[300px] font-mono text-sm whitespace-pre-wrap p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                {completion}
              </div>
            ) : (
              <div className="min-h-[300px] flex items-center justify-center text-gray-400">
                {t('Completion will appear here')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Parameters Section */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('Parameters')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('Temperature')}</Label>
                <span className="text-sm text-gray-500">{temperature}</span>
              </div>
              <Slider
                value={[temperature]}
                onValueChange={([value]) => setTemperature(value)}
                min={0}
                max={2}
                step={0.1}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('Max Tokens')}</Label>
              <Input
                type="number"
                value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                min={1}
                max={4096}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('Top P')}</Label>
                <span className="text-sm text-gray-500">{topP}</span>
              </div>
              <Slider
                value={[topP]}
                onValueChange={([value]) => setTopP(value)}
                min={0}
                max={1}
                step={0.1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('Frequency Penalty')}</Label>
                <span className="text-sm text-gray-500">{frequencyPenalty}</span>
              </div>
              <Slider
                value={[frequencyPenalty]}
                onValueChange={([value]) => setFrequencyPenalty(value)}
                min={0}
                max={2}
                step={0.1}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('Presence Penalty')}</Label>
                <span className="text-sm text-gray-500">{presencePenalty}</span>
              </div>
              <Slider
                value={[presencePenalty]}
                onValueChange={([value]) => setPresencePenalty(value)}
                min={0}
                max={2}
                step={0.1}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={loading} className="flex-1">
            <Play className="size-4 mr-2" />
            {loading ? t('Generating...') : t('Generate')}
          </Button>
          <Button variant="outline" onClick={handleClear}>
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

