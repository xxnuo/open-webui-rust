import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  createNewModel,
  updateModelById,
  getModelById
} from '@/lib/apis/models';
import { ArrowLeft, Save } from 'lucide-react';

interface ModelData {
  id: string;
  name: string;
  base_model_id?: string;
  meta?: {
    description?: string;
    profile_image_url?: string;
    tags?: Array<{ name: string }>;
    hidden?: boolean;
    capabilities?: {
      vision?: boolean;
      usage?: boolean;
    };
  };
  params?: Record<string, any>;
}

interface ModelEditorProps {
  modelId?: string;
}

export default function ModelEditor({ modelId }: ModelEditorProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modelData, setModelData] = useState<ModelData>({
    id: '',
    name: '',
    base_model_id: '',
    meta: {
      description: '',
      profile_image_url: '',
      tags: [],
      hidden: false,
      capabilities: {
        vision: false,
        usage: false
      }
    },
    params: {}
  });

  useEffect(() => {
    const init = async () => {
      if (modelId) {
        setLoading(true);
        try {
          const model = await getModelById(localStorage.token, modelId);
          setModelData(model);
        } catch (error) {
          toast.error(t('Failed to load model'));
          navigate('/workspace/models');
        } finally {
          setLoading(false);
        }
      } else {
        // Check for cloned model in sessionStorage
        const sessionModel = sessionStorage.getItem('model');
        if (sessionModel) {
          try {
            const parsed = JSON.parse(sessionModel);
            setModelData(parsed);
            sessionStorage.removeItem('model');
          } catch (e) {
            console.error('Failed to parse session model', e);
          }
        }
      }
    };

    init();
  }, [modelId, navigate, t]);

  const handleSave = async () => {
    if (!modelData.id || !modelData.name) {
      toast.error(t('Please fill in required fields'));
      return;
    }

    setSaving(true);
    try {
      if (modelId) {
        await updateModelById(localStorage.token, modelId, modelData);
        toast.success(t('Model updated successfully'));
      } else {
        await createNewModel(localStorage.token, modelData);
        toast.success(t('Model created successfully'));
      }
      navigate('/workspace/models');
    } catch (error: any) {
      toast.error(error.message || t('Failed to save model'));
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
          onClick={() => navigate('/workspace/models')}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {modelId ? t('Edit Model') : t('Create Model')}
        </h1>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">{t('General')}</TabsTrigger>
          <TabsTrigger value="capabilities">{t('Capabilities')}</TabsTrigger>
          <TabsTrigger value="advanced">{t('Advanced')}</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model-id">{t('Model ID')} *</Label>
            <Input
              id="model-id"
              value={modelData.id}
              onChange={(e) =>
                setModelData({ ...modelData, id: e.target.value })
              }
              placeholder="my-custom-model"
              disabled={!!modelId}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model-name">{t('Model Name')} *</Label>
            <Input
              id="model-name"
              value={modelData.name}
              onChange={(e) =>
                setModelData({ ...modelData, name: e.target.value })
              }
              placeholder={t('My Custom Model')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="base-model">{t('Base Model ID')}</Label>
            <Input
              id="base-model"
              value={modelData.base_model_id || ''}
              onChange={(e) =>
                setModelData({ ...modelData, base_model_id: e.target.value })
              }
              placeholder="gpt-4"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('Description')}</Label>
            <Textarea
              id="description"
              value={modelData.meta?.description || ''}
              onChange={(e) =>
                setModelData({
                  ...modelData,
                  meta: { ...modelData.meta, description: e.target.value }
                })
              }
              placeholder={t('Describe your model...')}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-image">{t('Profile Image URL')}</Label>
            <Input
              id="profile-image"
              value={modelData.meta?.profile_image_url || ''}
              onChange={(e) =>
                setModelData({
                  ...modelData,
                  meta: { ...modelData.meta, profile_image_url: e.target.value }
                })
              }
              placeholder="https://example.com/image.png"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="hidden"
              checked={modelData.meta?.hidden || false}
              onCheckedChange={(checked) =>
                setModelData({
                  ...modelData,
                  meta: { ...modelData.meta, hidden: checked }
                })
              }
            />
            <Label htmlFor="hidden">{t('Hidden')}</Label>
          </div>
        </TabsContent>

        <TabsContent value="capabilities" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="vision"
                checked={modelData.meta?.capabilities?.vision || false}
                onCheckedChange={(checked) =>
                  setModelData({
                    ...modelData,
                    meta: {
                      ...modelData.meta,
                      capabilities: {
                        ...modelData.meta?.capabilities,
                        vision: checked
                      }
                    }
                  })
                }
              />
              <Label htmlFor="vision">{t('Vision Support')}</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="usage"
                checked={modelData.meta?.capabilities?.usage || false}
                onCheckedChange={(checked) =>
                  setModelData({
                    ...modelData,
                    meta: {
                      ...modelData.meta,
                      capabilities: {
                        ...modelData.meta?.capabilities,
                        usage: checked
                      }
                    }
                  })
                }
              />
              <Label htmlFor="usage">{t('Usage Tracking')}</Label>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <div className="space-y-2">
            <Label>{t('Model Parameters (JSON)')}</Label>
            <Textarea
              value={JSON.stringify(modelData.params || {}, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setModelData({ ...modelData, params: parsed });
                } catch (error) {
                  // Invalid JSON, don't update
                }
              }}
              rows={10}
              className="font-mono text-sm"
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2 mt-6">
        <Button
          variant="outline"
          onClick={() => navigate('/workspace/models')}
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

