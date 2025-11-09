import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { Input } from '@/components/ui/input';
import { deleteFolderById, updateFolderById, updateFolderIsExpandedById } from '@/lib/apis/folders';
import { getChatListByFolderId } from '@/lib/apis/chats';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import ChatItem from './ChatItem';

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  is_expanded: boolean;
  childrenIds?: string[];
}

interface RecursiveFolderProps {
  folder: Folder;
  folders: Record<string, Folder>;
  className?: string;
  onChange?: () => void;
}

/**
 * RecursiveFolder Component
 * Matches Svelte's src/lib/components/layout/Sidebar/RecursiveFolder.svelte
 * 
 * Displays a folder with nested folders and chats
 */
export default function RecursiveFolder({
  folder,
  folders,
  className = '',
  onChange,
}: RecursiveFolderProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(folder.is_expanded ?? false);
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Load chats when folder is expanded
  useEffect(() => {
    if (open) {
      loadChats();
      // Update expanded state on server
      updateFolderIsExpandedById(localStorage.getItem('token') || '', folder.id, true);
    } else {
      setChats([]);
      updateFolderIsExpandedById(localStorage.getItem('token') || '', folder.id, false);
    }
  }, [open, folder.id]);

  const loadChats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const chatList = await getChatListByFolderId(token || '', folder.id);
      setChats(chatList || []);
    } catch (error) {
      console.error('Error loading folder chats:', error);
      toast.error(t('Failed to load folder chats'));
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async () => {
    if (newName.trim() === '' || newName === folder.name) {
      setIsRenaming(false);
      setNewName(folder.name);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await updateFolderById(token || '', folder.id, { name: newName });
      toast.success(t('Folder renamed successfully'));
      setIsRenaming(false);
      onChange?.();
    } catch (error) {
      console.error('Error renaming folder:', error);
      toast.error(t('Failed to rename folder'));
      setNewName(folder.name);
      setIsRenaming(false);
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await deleteFolderById(token || '', folder.id);
      toast.success(t('Folder deleted'));
      setShowDeleteDialog(false);
      onChange?.();
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error(t('Failed to delete folder'));
      setShowDeleteDialog(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  // Get child folders
  const childFolders = (folder.childrenIds || [])
    .map(id => folders[id])
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  return (
    <>
      <div className={cn('relative', className)}>
        <Collapsible open={open} onOpenChange={handleOpenChange}>
          <div className="w-full group">
            <div className="flex items-center gap-1 px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition">
              <CollapsibleTrigger asChild>
                <button
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-850 rounded-lg transition"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <div className="p-[1px]">
                    {open ? (
                      <ChevronDown className="size-3" strokeWidth={2.5} />
                    ) : (
                      <ChevronRight className="size-3" strokeWidth={2.5} />
                    )}
                  </div>
                </button>
              </CollapsibleTrigger>

              {isRenaming ? (
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRename();
                    } else if (e.key === 'Escape') {
                      setIsRenaming(false);
                      setNewName(folder.name);
                    }
                  }}
                  onBlur={handleRename}
                  autoFocus
                  className="flex-1 h-6 text-sm border-none bg-transparent p-0 focus-visible:ring-0"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div className="flex-1 text-sm truncate">{folder.name}</div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="invisible group-hover:visible p-1 hover:bg-gray-200 dark:hover:bg-gray-850 rounded-lg transition"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <MoreHorizontal className="size-4" strokeWidth={2.5} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setIsRenaming(true);
                    }}
                  >
                    <Pencil className="mr-2 size-4" />
                    {t('Rename')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="mr-2 size-4" />
                    {t('Delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <CollapsibleContent className="w-full">
            {(childFolders.length > 0 || chats.length > 0) && (
              <div className="ml-3 pl-1 mt-[1px] flex flex-col border-l border-gray-100 dark:border-gray-900">
                {/* Child Folders */}
                {childFolders.map((childFolder) => (
                  <RecursiveFolder
                    key={childFolder.id}
                    folder={childFolder}
                    folders={folders}
                    onChange={onChange}
                  />
                ))}

                {/* Chat Items */}
                {chats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    id={chat.id}
                    title={chat.title}
                    onChange={() => {
                      loadChats();
                      onChange?.();
                    }}
                  />
                ))}
              </div>
            )}

            {loading && chats.length === 0 && (
              <div className="flex justify-center items-center p-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete folder?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('This will delete')} "<strong>{folder.name}</strong>" {t('and all its contents')}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

