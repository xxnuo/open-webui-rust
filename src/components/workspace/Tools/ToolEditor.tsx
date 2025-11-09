import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  createNewTool,
  updateToolById,
  getToolById
} from '@/lib/apis/tools';
import { ArrowLeft, Save } from 'lucide-react';

interface ToolData {
  id: string;
  name: string;
  meta?: {
    description?: string;
  };
  content: string;
  specs?: Array<{
    id: string;
    name: string;
    description?: string;
    parameters?: Record<string, any>;
  }>;
}

interface ToolEditorProps {
  toolId?: string;
}

export default function ToolEditor({ toolId }: ToolEditorProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [toolData, setToolData] = useState<ToolData>({
    id: '',
    name: '',
    meta: {
      description: ''
    },
    content: '',
    specs: []
  });

  useEffect(() => {
    const init = async () => {
      if (toolId) {
        setLoading(true);
        try {
          const tool = await getToolById(localStorage.token, toolId);
          setToolData(tool);
        } catch (error) {
          toast.error(t('Failed to load tool'));
          navigate('/workspace/tools');
        } finally {
          setLoading(false);
        }
      }
    };

    init();
  }, [toolId, navigate, t]);

  const handleSave = async () => {
    if (!toolData.id || !toolData.name || !toolData.content) {
      toast.error(t('Please fill in required fields'));
      return;
    }

    // Validate content is valid Python code
    try {
      // Basic validation - check for function definition
      if (!toolData.content.includes('def ')) {
        toast.error(t('Tool content must contain at least one function definition'));
        return;
      }
    } catch (error) {
      toast.error(t('Invalid tool content'));
      return;
    }

    setSaving(true);
    try {
      if (toolId) {
        await updateToolById(localStorage.token, toolId, toolData);
        toast.success(t('Tool updated successfully'));
      } else {
        await createNewTool(localStorage.token, toolData);
        toast.success(t('Tool created successfully'));
      }
      navigate('/workspace/tools');
    } catch (error: any) {
      toast.error(error.message || t('Failed to save tool'));
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
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/workspace/tools')}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {toolId ? t('Edit Tool') : t('Create Tool')}
        </h1>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="general">{t('General')}</TabsTrigger>
          <TabsTrigger value="code">{t('Code')}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tool-id">{t('Tool ID')} *</Label>
            <Input
              id="tool-id"
              value={toolData.id}
              onChange={(e) =>
                setToolData({ ...toolData, id: e.target.value })
              }
              placeholder="my_custom_tool"
              disabled={!!toolId}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tool-name">{t('Tool Name')} *</Label>
            <Input
              id="tool-name"
              value={toolData.name}
              onChange={(e) =>
                setToolData({ ...toolData, name: e.target.value })
              }
              placeholder={t('My Custom Tool')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('Description')}</Label>
            <Textarea
              id="description"
              value={toolData.meta?.description || ''}
              onChange={(e) =>
                setToolData({
                  ...toolData,
                  meta: { ...toolData.meta, description: e.target.value }
                })
              }
              placeholder={t('Describe what your tool does...')}
              rows={4}
            />
          </div>
        </TabsContent>

        <TabsContent value="code" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">{t('Tool Code')} *</Label>
            <Textarea
              id="content"
              value={toolData.content}
              onChange={(e) =>
                setToolData({ ...toolData, content: e.target.value })
              }
              placeholder={`def my_function(param1: str) -> str:
    """
    Description of what this function does.
    
    :param param1: Description of parameter
    :return: Description of return value
    """
    return f"Result: {param1}"`}
              rows={20}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              {t('Write Python code with function definitions. Each function will be available as a tool.')}
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 mt-6">
        <Button
          variant="outline"
          onClick={() => navigate('/workspace/tools')}
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

