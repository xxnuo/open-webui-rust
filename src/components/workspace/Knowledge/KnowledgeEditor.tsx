import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  createNewKnowledge,
  updateKnowledgeById,
  getKnowledgeById
} from '@/lib/apis/knowledge';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import { uploadFile } from '@/lib/apis/files';

interface KnowledgeData {
  id?: string;
  name: string;
  description?: string;
  data?: {
    file_ids?: string[];
  };
}

interface KnowledgeEditorProps {
  knowledgeId?: string;
}

export default function KnowledgeEditor({ knowledgeId }: KnowledgeEditorProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [knowledgeData, setKnowledgeData] = useState<KnowledgeData>({
    name: '',
    description: '',
    data: {
      file_ids: []
    }
  });

  useEffect(() => {
    const init = async () => {
      if (knowledgeId) {
        setLoading(true);
        try {
          const knowledge = await getKnowledgeById(localStorage.token, knowledgeId);
          setKnowledgeData(knowledge);
        } catch (error) {
          toast.error(t('Failed to load knowledge base'));
          navigate('/workspace/knowledge');
        } finally {
          setLoading(false);
        }
      }
    };

    init();
  }, [knowledgeId, navigate, t]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedFileIds: string[] = [];
      
      for (const file of files) {
        const res = await uploadFile(localStorage.token, file);
        if (res?.id) {
          uploadedFileIds.push(res.id);
        }
      }

      setKnowledgeData({
        ...knowledgeData,
        data: {
          ...knowledgeData.data,
          file_ids: [...(knowledgeData.data?.file_ids || []), ...uploadedFileIds]
        }
      });

      toast.success(t('Files uploaded successfully'));
    } catch (error: any) {
      toast.error(error.message || t('Failed to upload files'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!knowledgeData.name) {
      toast.error(t('Please enter a name'));
      return;
    }

    setSaving(true);
    try {
      if (knowledgeId) {
        await updateKnowledgeById(localStorage.token, knowledgeId, knowledgeData);
        toast.success(t('Knowledge base updated successfully'));
      } else {
        await createNewKnowledge(localStorage.token, knowledgeData);
        toast.success(t('Knowledge base created successfully'));
      }
      navigate('/workspace/knowledge');
    } catch (error: any) {
      toast.error(error.message || t('Failed to save knowledge base'));
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
          onClick={() => navigate('/workspace/knowledge')}
        >
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="text-2xl font-bold">
          {knowledgeId ? t('Edit Knowledge Base') : t('Create Knowledge Base')}
        </h1>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="knowledge-name">{t('Name')} *</Label>
          <Input
            id="knowledge-name"
            value={knowledgeData.name}
            onChange={(e) =>
              setKnowledgeData({ ...knowledgeData, name: e.target.value })
            }
            placeholder={t('My Knowledge Base')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t('Description')}</Label>
          <Textarea
            id="description"
            value={knowledgeData.description || ''}
            onChange={(e) =>
              setKnowledgeData({ ...knowledgeData, description: e.target.value })
            }
            placeholder={t('Describe your knowledge base...')}
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label>{t('Documents')}</Label>
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              multiple
              onChange={handleFileUpload}
              accept=".txt,.pdf,.doc,.docx,.md"
            />
            <Button
              variant="outline"
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={uploading}
            >
              <Upload className="size-4 mr-2" />
              {uploading ? t('Uploading...') : t('Upload Documents')}
            </Button>
            <p className="text-sm text-gray-500 mt-2">
              {t('Supported formats: TXT, PDF, DOC, DOCX, MD')}
            </p>
          </div>

          {knowledgeData.data?.file_ids && knowledgeData.data.file_ids.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">
                {t('Uploaded files')}: {knowledgeData.data.file_ids.length}
              </p>
              <div className="space-y-2">
                {knowledgeData.data.file_ids.map((fileId, index) => (
                  <div
                    key={fileId}
                    className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded"
                  >
                    <span className="text-sm truncate">{fileId}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setKnowledgeData({
                          ...knowledgeData,
                          data: {
                            ...knowledgeData.data,
                            file_ids: knowledgeData.data?.file_ids?.filter(
                              (_, i) => i !== index
                            )
                          }
                        });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button
          variant="outline"
          onClick={() => navigate('/workspace/knowledge')}
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

