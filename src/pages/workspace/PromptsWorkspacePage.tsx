import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import { getPromptList, deletePromptByCommand, getPrompts } from '@/lib/apis/prompts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import ConfirmDialog from '@/components/common/ConfirmDialog';

interface Prompt {
  command: string;
  title: string;
  content: string;
  user?: {
    name?: string;
    email?: string;
  };
}

export default function PromptsWorkspacePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setPrompts: setStorePrompts } = useAppStore();
  
  const [loaded, setLoaded] = useState(false);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [query, setQuery] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const init = async () => {
    const promptsList = await getPromptList(localStorage.token);
    setPrompts(promptsList || []);
    setLoaded(true);
  };

  useEffect(() => {
    init();
  }, []);

  const filteredItems = prompts.filter((p) => {
    if (!query) return true;
    const lowerQuery = query.toLowerCase();
    return (
      (p.title || '').toLowerCase().includes(lowerQuery) ||
      (p.command || '').toLowerCase().includes(lowerQuery) ||
      (p.user?.name || '').toLowerCase().includes(lowerQuery) ||
      (p.user?.email || '').toLowerCase().includes(lowerQuery)
    );
  });

  const deleteHandler = async (prompt: Prompt) => {
    const res = await deletePromptByCommand(localStorage.token, prompt.command).catch((err) => {
      toast.error(`${err}`);
      return null;
    });

    if (res) {
      toast.success(t(`Deleted {{name}}`, { name: prompt.command }));
      await init();
      setStorePrompts(await getPrompts(localStorage.token));
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
        title={t('Delete prompt?')}
        onConfirm={() => {
          if (selectedPrompt) {
            deleteHandler(selectedPrompt);
          }
          setShowDeleteConfirm(false);
        }}
      >
        <div className="text-sm text-gray-500">
          {t('This will delete')} <span className="font-semibold">{selectedPrompt?.title}</span>.
        </div>
      </ConfirmDialog>

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex md:self-center text-xl font-medium px-0.5 items-center">
            {t('Prompts')}
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
              placeholder={t('Search Prompts')}
            />
          </div>

          <div>
            <Button
              className="px-2 py-2"
              variant="ghost"
              onClick={() => navigate('/workspace/prompts/create')}
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
          {filteredItems.map((prompt) => (
            <div
              key={prompt.command}
              className="flex space-x-4 cursor-pointer text-left w-full px-4 py-3 border border-gray-50 dark:border-gray-850 hover:bg-black/5 dark:hover:bg-white/5 transition rounded-2xl"
              onClick={() => navigate(`/workspace/prompts/edit?command=${prompt.command}`)}
            >
              <div className="flex-1">
                <div className="font-semibold">{prompt.title}</div>
                <div className="text-sm text-gray-500 mt-1">{prompt.command}</div>
                <div className="text-xs text-gray-400 mt-2 line-clamp-2">{prompt.content}</div>
              </div>
              <button
                className="self-start"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPrompt(prompt);
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
              {t('No Prompts')}
            </div>
            <div className="mt-1 text-sm text-gray-300 dark:text-gray-700">
              {t('Create your first prompt')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

