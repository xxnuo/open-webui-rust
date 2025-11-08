import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import { getModels as getWorkspaceModels, deleteModelById } from '@/lib/apis/models';
import { getModels } from '@/lib/apis';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import ConfirmDialog from '@/components/common/ConfirmDialog';

interface Model {
  id: string;
  name: string;
  meta?: {
    tags?: Array<{ name: string }>;
    hidden?: boolean;
  };
  user?: {
    name?: string;
    email?: string;
  };
}

export default function ModelsWorkspacePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setModels: setStoreModels, config, settings } = useAppStore();
  
  const [loaded, setLoaded] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [query, setQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const init = async () => {
    const workspaceModels = await getWorkspaceModels(localStorage.token);
    setModels(workspaceModels || []);
    setLoaded(true);
  };

  useEffect(() => {
    init();
  }, []);

  const filteredModels = models.filter((m) => {
    if (!query) return true;
    const lowerQuery = query.toLowerCase();
    return (
      (m.name || '').toLowerCase().includes(lowerQuery) ||
      (m.user?.name || '').toLowerCase().includes(lowerQuery) ||
      (m.user?.email || '').toLowerCase().includes(lowerQuery)
    );
  });

  const deleteModelHandler = async (model: Model) => {
    const res = await deleteModelById(localStorage.token, model.id).catch((e) => {
      toast.error(`${e}`);
      return null;
    });

    if (res) {
      toast.success(t(`Deleted {{name}}`, { name: model.id }));
    }

    const connections = config?.features?.enable_direct_connections && (settings?.directConnections ?? null);
    await setStoreModels(await getModels(localStorage.token, connections));
    await init();
  };

  if (!loaded) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('Delete model?')}
        onConfirm={() => {
          if (selectedModel) {
            deleteModelHandler(selectedModel);
          }
          setShowDeleteConfirm(false);
        }}
      >
        <div className="text-sm text-gray-500">
          {t('This will delete')} <span className="font-semibold">{selectedModel?.name}</span>.
        </div>
      </ConfirmDialog>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex md:self-center text-xl font-medium px-0.5 items-center">
            {t('Models')}
            <div className="flex self-center w-[1px] h-6 mx-2.5 bg-gray-50 dark:bg-gray-850" />
            <span className="text-lg font-medium text-gray-500 dark:text-gray-300">
              {filteredModels.length}
            </span>
          </div>
        </div>

        <div className="flex w-full space-x-2">
          <div className="flex flex-1">
            <div className="self-center ml-1 mr-3">
              <Search className="size-3.5" />
            </div>
            <Input
              className="w-full text-sm py-1 rounded-r-xl border-0 bg-transparent focus-visible:ring-0"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Search Models')}
            />
          </div>

          <div>
            <Button
              className="px-2 py-2"
              variant="ghost"
              onClick={() => navigate('/workspace/models/create')}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
          {filteredModels.map((model) => (
            <div
              key={model.id}
              className="flex space-x-4 cursor-pointer text-left w-full px-4 py-3 border border-gray-50 dark:border-gray-850 hover:bg-black/5 dark:hover:bg-white/5 transition rounded-2xl"
              onClick={() => navigate(`/workspace/models/edit?id=${model.id}`)}
            >
              <div className="flex-1">
                <div className="font-semibold">{model.name}</div>
                <div className="text-sm text-gray-500">{model.id}</div>
                {model.meta?.hidden && (
                  <div className="text-xs text-yellow-600 mt-1">{t('Hidden')}</div>
                )}
              </div>
              <button
                className="self-start"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedModel(model);
                  setShowDeleteConfirm(true);
                }}
              >
                ⋯
              </button>
            </div>
          ))}
        </div>

        {filteredModels.length === 0 && (
          <div className="text-center py-20">
            <div className="text-xl font-medium text-gray-400 dark:text-gray-600">
              {t('No Models')}
            </div>
            <div className="mt-1 text-sm text-gray-300 dark:text-gray-700">
              {t('Create your first model')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

