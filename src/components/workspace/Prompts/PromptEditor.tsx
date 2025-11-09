import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  createNewPrompt,
  updatePromptByCommand,
  getPrompts
} from '@/lib/apis/prompts';
import { ArrowLeft, Save } from 'lucide-react';

interface PromptData {
  command: string;
  title: string;
  content: string;
}

interface PromptEditorProps {
  promptCommand?: string;
}

export default function PromptEditor({ promptCommand }: PromptEditorProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [promptData, setPromptData] = useState<PromptData>({
    command: '',
    title: '',
    content: ''
  });

  useEffect(() => {
    const init = async () => {
      if (promptCommand) {
        setLoading(true);
        try {
          const prompts = await getPrompts(localStorage.token);
          const prompt = prompts.find((p: any) => p.command === promptCommand);
          if (prompt) {
            setPromptData(prompt);
          } else {
            throw new Error('Prompt not found');
          }
        } catch (error) {
          toast.error(t('Failed to load prompt'));
          navigate('/workspace/prompts');
        } finally {
          setLoading(false);
        }
      }
    };

    init();
  }, [promptCommand, navigate, t]);

  const handleSave = async () => {
    if (!promptData.command || !promptData.title || !promptData.content) {
      toast.error(t('Please fill in all fields'));
      return;
    }

    // Validate command format
    if (!promptData.command.startsWith('/')) {
      toast.error(t('Command must start with /'));
      return;
    }

    setSaving(true);
    try {
      if (promptCommand) {
        await updatePromptByCommand(localStorage.token, promptCommand, promptData);
        toast.success(t('Prompt updated successfully'));
      } else {
        await createNewPrompt(localStorage.token, promptData);
        toast.success(t('Prompt created successfully'));
      }
      navigate('/workspace/prompts');
    } catch (error: any) {
      toast.error(error.message || t('Failed to save prompt'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/workspace/prompts')}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {promptCommand ? t('Edit Prompt') : t('Create Prompt')}
        </h1>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="command">{t('Command')} *</Label>
          <Input
            id="command"
            value={promptData.command}
            onChange={(e) =>
              setPromptData({ ...promptData, command: e.target.value })
            }
            placeholder="/my-prompt"
            disabled={!!promptCommand}
          />
          <p className="text-xs text-gray-500">
            {t('Command must start with / and contain no spaces')}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">{t('Title')} *</Label>
          <Input
            id="title"
            value={promptData.title}
            onChange={(e) =>
              setPromptData({ ...promptData, title: e.target.value })
            }
            placeholder={t('My Custom Prompt')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">{t('Prompt Content')} *</Label>
          <Textarea
            id="content"
            value={promptData.content}
            onChange={(e) =>
              setPromptData({ ...promptData, content: e.target.value })
            }
            placeholder={t('Enter your prompt here...')}
            rows={15}
            className="font-mono text-sm"
          />
          <p className="text-xs text-gray-500">
            {t('You can use variables like {{variable_name}} in your prompt')}
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button
          variant="outline"
          onClick={() => navigate('/workspace/prompts')}
        >
          {t('Cancel')}
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="size-4 mr-2" />
          {saving ? t('Saving...') : t('Save')}
        </Button>
      </div>
    </div>
  );
}

