import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import { chatCompletion } from '@/lib/apis/openai';
import { WEBUI_BASE_URL } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export default function PlaygroundPage() {
  const { t } = useTranslation();
  const { models, WEBUI_NAME } = useAppStore();
  
  const [selectedModelId, setSelectedModelId] = useState('');
  const [system, setSystem] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSystem, setShowSystem] = useState(false);

  useEffect(() => {
    document.title = `${t('Playground')} • ${WEBUI_NAME}`;
  }, [t, WEBUI_NAME]);

  useEffect(() => {
    if (models.length > 0 && !selectedModelId) {
      setSelectedModelId(models[0].id);
    }
  }, [models]);

  const chatCompletionHandler = async () => {
    if (!selectedModelId) {
      toast.error(t('Please select a model.'));
      return;
    }

    const model = models.find((m) => m.id === selectedModelId);
    if (!model) {
      setSelectedModelId('');
      return;
    }

    setLoading(true);

    const [res, controller] = await chatCompletion(
      localStorage.token,
      {
        model: model.id,
        stream: true,
        messages: [
          system ? { role: 'system', content: system } : undefined,
          ...messages
        ].filter(Boolean) as Message[]
      },
      `${WEBUI_BASE_URL}/api`
    );

    let responseMessage: Message;
    if (messages.at(-1)?.role === 'assistant') {
      responseMessage = messages.at(-1)!;
    } else {
      responseMessage = { role: 'assistant', content: '' };
      setMessages(prev => [...prev, responseMessage]);
    }

    if (res && res.ok) {
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line === 'data: [DONE]') continue;
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.replace(/^data: /, ''));
                const delta = data.choices?.[0]?.delta?.content;
                if (delta) {
                  responseMessage.content += delta;
                  setMessages(prev => [...prev.slice(0, -1), responseMessage]);
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
          }
        }
      }
    }

    setLoading(false);
  };

  const addMessage = () => {
    if (!message.trim()) return;
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setMessage('');
  };

  return (
    <div className="flex flex-col h-full p-4 max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-4">{t('Playground')}</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('Model')}</label>
            <Select value={selectedModelId} onValueChange={setSelectedModelId}>
              <SelectTrigger>
                <SelectValue placeholder={t('Select a model')} />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSystem(!showSystem)}
            >
              {showSystem ? t('Hide') : t('Show')} {t('System Prompt')}
            </Button>
            {showSystem && (
              <Textarea
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                placeholder={t('System prompt...')}
                className="mt-2"
                rows={3}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto border rounded-lg p-4 mb-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-800'
              }`}
            >
              <div className="text-xs opacity-70 mb-1">{msg.role}</div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t('Type a message...')}
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              addMessage();
            }
          }}
        />
        <div className="flex gap-2">
          <Button onClick={addMessage} disabled={!message.trim()}>
            {t('Add Message')}
          </Button>
          <Button onClick={chatCompletionHandler} disabled={loading || messages.length === 0}>
            {loading ? t('Processing...') : t('Run')}
          </Button>
          <Button variant="outline" onClick={() => setMessages([])}>
            {t('Clear')}
          </Button>
        </div>
      </div>
    </div>
  );
}

