import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Search, 
  X, 
  Settings, 
  Heart, 
  Trash2, 
  MoreHorizontal,
  ChevronRight 
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/store';
import {
  getFunctions,
  deleteFunctionById,
  toggleFunctionById,
  toggleGlobalById,
  exportFunctions,
  createNewFunction,
  getFunctionById,
  loadFunctionByUrl
} from '@/lib/apis/functions';
import { getModels } from '@/lib/apis';

interface FunctionItem {
  id: string;
  name: string;
  type: 'pipe' | 'filter' | 'action';
  is_active: boolean;
  is_global?: boolean;
  meta: {
    description: string;
    manifest?: {
      version?: string;
      funding_url?: string;
    };
  };
}

export default function Functions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { config } = useAppStore();
  
  const [functions, setFunctions] = useState<FunctionItem[]>([]);
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [shiftKey, setShiftKey] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedFunction, setSelectedFunction] = useState<FunctionItem | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const filteredItems = functions
    .filter(
      (f) =>
        (selectedType !== 'all' ? f.type === selectedType : true) &&
        (query === '' ||
          f.name.toLowerCase().includes(query.toLowerCase()) ||
          f.id.toLowerCase().includes(query.toLowerCase()))
    )
    .sort((a, b) => a.type.localeCompare(b.type) || a.name.localeCompare(b.name));

  const loadFunctions = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const res = await getFunctions(token);
    if (res) {
      setFunctions(res);
    }
  };

  useEffect(() => {
    loadFunctions();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setShiftKey(true);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setShiftKey(false);
      }
    };

    const onBlur = () => {
      setShiftKey(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const handleDelete = async (func: FunctionItem) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const res = await deleteFunctionById(token, func.id).catch((error) => {
      toast.error(`${error}`);
      return null;
    });

    if (res) {
      toast.success(t('Function deleted successfully'));
      await loadFunctions();
    }
  };

  const handleToggle = async (func: FunctionItem) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    await toggleFunctionById(token, func.id);
    await loadFunctions();
  };

  const handleToggleGlobal = async (func: FunctionItem) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const res = await toggleGlobalById(token, func.id).catch((error) => {
      toast.error(`${error}`);
    });

    if (res) {
      if (func.is_global) {
        func.type === 'filter'
          ? toast.success(t('Filter is now globally enabled'))
          : toast.success(t('Function is now globally enabled'));
      } else {
        func.type === 'filter'
          ? toast.success(t('Filter is now globally disabled'))
          : toast.success(t('Function is now globally disabled'));
      }
      await loadFunctions();
    }
  };

  const handleClone = async (func: FunctionItem) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const _function = await getFunctionById(token, func.id).catch((error) => {
      toast.error(`${error}`);
      return null;
    });

    if (_function) {
      sessionStorage.setItem(
        'function',
        JSON.stringify({
          ..._function,
          id: `${_function.id}_clone`,
          name: `${_function.name} (${t('Clone')})`
        })
      );
      navigate('/admin/functions/create');
    }
  };

  const handleExport = async (func: FunctionItem) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const _function = await getFunctionById(token, func.id).catch((error) => {
      toast.error(`${error}`);
      return null;
    });

    if (_function) {
      const blob = new Blob([JSON.stringify([_function])], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `function-${_function.id}-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleExportAll = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const _functions = await exportFunctions(token).catch((error) => {
      toast.error(`${error}`);
      return null;
    });

    if (_functions) {
      const blob = new Blob([JSON.stringify(_functions)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `functions-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleImportFromUrl = async () => {
    const token = localStorage.getItem('token');
    if (!token || !importUrl) return;

    setLoading(true);
    const func = await loadFunctionByUrl(token, importUrl).catch((error) => {
      toast.error(`${error}`);
      return null;
    });
    setLoading(false);

    if (func) {
      sessionStorage.setItem('function', JSON.stringify(func));
      navigate('/admin/functions/create');
    }
    setShowImportModal(false);
    setImportUrl('');
  };

  const handleImportFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const _functions = JSON.parse(e.target?.result as string);
        const token = localStorage.getItem('token');
        if (!token) return;

        for (let func of _functions) {
          if ('function' in func) {
            func = func.function;
          }

          await createNewFunction(token, func).catch((error) => {
            toast.error(`${error}`);
            return null;
          });
        }

        toast.success(t('Functions imported successfully'));
        await loadFunctions();
      } catch (error) {
        toast.error(t('Failed to import functions'));
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex flex-col mt-1.5 mb-0.5 px-[16px]">
        <div className="flex justify-between items-center mb-1">
          <div className="flex md:self-center text-xl items-center font-medium px-0.5">
            {t('Functions')}
            <div className="flex self-center w-[1px] h-6 mx-2.5 bg-gray-50 dark:bg-gray-850" />
            <span className="text-base font-lg text-gray-500 dark:text-gray-300">
              {filteredItems.length}
            </span>
          </div>
        </div>

        <div className="flex w-full space-x-2">
          <div className="flex flex-1 relative">
            <div className="self-center ml-1 mr-3">
              <Search className="size-3.5" />
            </div>
            <Input
              className="w-full text-sm pr-4 py-1 border-0 rounded-r-xl outline-hidden bg-transparent"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Search Functions')}
            />

            {query && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-0.5 h-auto rounded-full hover:bg-gray-100 dark:hover:bg-gray-900"
                  onClick={() => setQuery('')}
                >
                  <X className="size-3" strokeWidth={2} />
                </Button>
              </div>
            )}
          </div>

          <div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 py-2 rounded-xl hover:bg-gray-700/10 dark:hover:bg-gray-100/10"
                >
                  <Plus className="size-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/admin/functions/create')}>
                  {t('Create New Function')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowImportModal(true)}>
                  {t('Import from URL')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => document.getElementById('functions-import-input')?.click()}
                >
                  {t('Import from File')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              id="functions-import-input"
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFromFile}
            />
          </div>
        </div>

        <div className="flex w-full">
          <div className="flex gap-1 scrollbar-none overflow-x-auto w-fit text-center text-sm font-medium rounded-full bg-transparent">
            <button
              className={`min-w-fit p-1.5 ${
                selectedType === 'all'
                  ? ''
                  : 'text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-white'
              } transition`}
              onClick={() => setSelectedType('all')}
            >
              {t('All')}
            </button>

            <button
              className={`min-w-fit p-1.5 ${
                selectedType === 'pipe'
                  ? ''
                  : 'text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-white'
              } transition`}
              onClick={() => setSelectedType('pipe')}
            >
              {t('Pipe')}
            </button>

            <button
              className={`min-w-fit p-1.5 ${
                selectedType === 'filter'
                  ? ''
                  : 'text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-white'
              } transition`}
              onClick={() => setSelectedType('filter')}
            >
              {t('Filter')}
            </button>

            <button
              className={`min-w-fit p-1.5 ${
                selectedType === 'action'
                  ? ''
                  : 'text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-white'
              } transition`}
              onClick={() => setSelectedType('action')}
            >
              {t('Action')}
            </button>
          </div>
        </div>
      </div>

      <div className="mb-5 px-[16px]">
        {filteredItems.map((func) => (
          <div
            key={func.id}
            className="flex space-x-4 cursor-pointer w-full px-2 py-2 dark:hover:bg-white/5 hover:bg-black/5 rounded-xl"
          >
            <a
              className="flex flex-1 space-x-3.5 cursor-pointer w-full"
              href={`/admin/functions/edit?id=${encodeURIComponent(func.id)}`}
            >
              <div className="flex items-center text-left">
                <div className="flex-1 self-center pl-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <div className="text-xs font-semibold px-1 rounded-sm uppercase line-clamp-1 bg-gray-500/20 text-gray-700 dark:text-gray-200">
                      {func.type}
                    </div>

                    {func?.meta?.manifest?.version && (
                      <div className="text-xs font-semibold px-1 rounded-sm line-clamp-1 bg-gray-500/20 text-gray-700 dark:text-gray-200">
                        v{func.meta.manifest.version}
                      </div>
                    )}

                    <div className="line-clamp-1">{func.name}</div>
                  </div>

                  <div className="flex gap-1.5 px-1">
                    <div className="text-gray-500 text-xs font-medium shrink-0">{func.id}</div>
                    <div className="text-xs overflow-hidden text-ellipsis line-clamp-1">
                      {func.meta.description}
                    </div>
                  </div>
                </div>
              </div>
            </a>
            <div className="flex flex-row gap-0.5 self-center">
              {shiftKey ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-center w-fit text-sm px-2 py-2"
                  onClick={() => handleDelete(func)}
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : (
                <>
                  {func?.meta?.manifest?.funding_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-center w-fit text-sm px-2 py-2"
                      onClick={() => window.open(func.meta.manifest?.funding_url, '_blank')}
                    >
                      <Heart className="size-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="self-center w-fit text-sm px-2 py-2"
                    onClick={() => navigate(`/admin/functions/edit?id=${encodeURIComponent(func.id)}`)}
                  >
                    <Settings className="size-4" />
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="self-center w-fit text-sm p-1.5"
                      >
                        <MoreHorizontal className="size-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          navigate(`/admin/functions/edit?id=${encodeURIComponent(func.id)}`)
                        }
                      >
                        {t('Edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleClone(func)}>
                        {t('Clone')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport(func)}>
                        {t('Export')}
                      </DropdownMenuItem>
                      {['filter', 'action'].includes(func.type) && (
                        <DropdownMenuItem onClick={() => handleToggleGlobal(func)}>
                          {func.is_global ? t('Disable Global') : t('Enable Global')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          setSelectedFunction(func);
                          setShowDeleteConfirm(true);
                        }}
                      >
                        {t('Delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              <div className="self-center mx-1">
                <Switch
                  checked={func.is_active}
                  onCheckedChange={() => handleToggle(func)}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end w-full mb-2 px-[16px]">
        {functions.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="flex text-xs items-center space-x-1 px-3 py-1.5"
            onClick={handleExportAll}
          >
            <span className="self-center mr-2 font-medium line-clamp-1">
              {t('Export Functions')} ({functions.length})
            </span>
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>

      {config?.features?.enable_community_sharing && (
        <div className="my-16 px-[16px]">
          <div className="text-xl font-medium mb-1 line-clamp-1">
            {t('Made by Open WebUI Community')}
          </div>

          <a
            className="flex cursor-pointer items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-850 w-full mb-2 px-3.5 py-1.5 rounded-xl transition"
            href="https://openwebui.com/functions"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="self-center">
              <div className="font-semibold line-clamp-1">{t('Discover a function')}</div>
              <div className="text-sm line-clamp-1">
                {t('Discover, download, and explore custom functions')}
              </div>
            </div>

            <div>
              <ChevronRight />
            </div>
          </a>
        </div>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete function?')}</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="text-sm text-gray-500 truncate">
                {t('This will delete')} <span className="font-semibold">{selectedFunction?.name}</span>.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedFunction) {
                  handleDelete(selectedFunction);
                }
                setShowDeleteConfirm(false);
              }}
            >
              {t('Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Import from URL')}</DialogTitle>
            <DialogDescription>
              {t('Enter the URL of the function to import')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportModal(false)}>
              {t('Cancel')}
            </Button>
            <Button onClick={handleImportFromUrl} disabled={loading || !importUrl}>
              {loading ? t('Loading...') : t('Import')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
