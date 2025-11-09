import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import { getKnowledgeBaseList, deleteKnowledgeById, getKnowledgeBases } from '@/lib/apis/knowledge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { capitalizeFirstLetter, dayjs } from '@/lib/utils';

interface Knowledge {
  id: string;
  name: string;
  description?: string;
  user?: {
    name?: string;
    email?: string;
  };
  created_at?: number;
  updated_at?: number;
}

export default function KnowledgeWorkspacePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setKnowledge: setStoreKnowledge } = useAppStore();
  
  const [loaded, setLoaded] = useState(false);
  const [knowledgeBases, setKnowledgeBases] = useState<Knowledge[]>([]);
  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<Knowledge | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const init = async () => {
    const kb = await getKnowledgeBaseList(localStorage.token);
    setKnowledgeBases(kb || []);
    setLoaded(true);
  };

  useEffect(() => {
    init();
  }, []);

  const filteredItems = knowledgeBases.filter((kb) => {
    if (!query) return true;
    const lowerQuery = query.toLowerCase();
    return (
      (kb.name || '').toLowerCase().includes(lowerQuery) ||
      (kb.description || '').toLowerCase().includes(lowerQuery) ||
      (kb.user?.name || '').toLowerCase().includes(lowerQuery) ||
      (kb.user?.email || '').toLowerCase().includes(lowerQuery)
    );
  });

  const deleteHandler = async (item: Knowledge) => {
    const res = await deleteKnowledgeById(localStorage.token, item.id).catch((e) => {
      toast.error(`${e}`);
      return null;
    });

    if (res) {
      await init();
      setStoreKnowledge(await getKnowledgeBases(localStorage.token));
      toast.success(t('Knowledge deleted successfully.'));
    }
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
        title={t('Delete knowledge?')}
        onConfirm={() => {
          if (selectedItem) {
            deleteHandler(selectedItem);
          }
          setShowDeleteConfirm(false);
        }}
      >
        <div className="text-sm text-gray-500">
          {t('This will delete')} <span className="font-semibold">{selectedItem?.name}</span>.
        </div>
      </ConfirmDialog>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex md:self-center text-xl font-medium px-0.5 items-center">
            {t('Knowledge')}
            <div className="flex self-center w-[1px] h-6 mx-2.5 bg-gray-50 dark:bg-gray-850" />
            <span className="text-lg font-medium text-gray-500 dark:text-gray-300">
              {filteredItems.length}
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
              placeholder={t('Search Knowledge')}
            />
          </div>

          <div>
            <Button
              className="px-2 py-2"
              variant="ghost"
              onClick={() => navigate('/workspace/knowledge/create')}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="flex space-x-4 cursor-pointer text-left w-full px-4 py-3 border border-gray-50 dark:border-gray-850 hover:bg-black/5 dark:hover:bg-white/5 transition rounded-2xl"
              onClick={() => navigate(`/workspace/knowledge/${item.id}`)}
            >
              <div className="flex-1">
                <div className="font-semibold">{item.name}</div>
                {item.description && (
                  <div className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</div>
                )}
                <div className="text-xs text-gray-400 mt-2">
                  {item.updated_at ? dayjs(item.updated_at / 1000000).fromNow() : ''}
                </div>
              </div>
              <button
                className="self-start"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedItem(item);
                  setShowDeleteConfirm(true);
                }}
              >
                ⋯
              </button>
            </div>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-20">
            <div className="text-xl font-medium text-gray-400 dark:text-gray-600">
              {t('No Knowledge')}
            </div>
            <div className="mt-1 text-sm text-gray-300 dark:text-gray-700">
              {t('Create your first knowledge base')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

