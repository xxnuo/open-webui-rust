import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MoreHorizontal, Pencil, Trash2, Archive, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { useAppStore } from '@/store';
import { deleteChatById, archiveChatById, updateChatById } from '@/lib/apis/chats';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface ChatItemProps {
  id: string;
  title: string;
  className?: string;
  selected?: boolean;
  onSelect?: () => void;
  onUnselect?: () => void;
  onChange?: () => void;
}

/**
 * ChatItem Component
 * Matches Svelte's src/lib/components/layout/Sidebar/ChatItem.svelte
 * 
 * Displays a single chat item in the sidebar with hover menu
 */
export default function ChatItem({
  id,
  title,
  className = '',
  selected = false,
  onSelect,
  onUnselect,
  onChange,
}: ChatItemProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: currentChatId } = useParams();
  const { mobile, setShowSidebar, selectedFolder, setSelectedFolder } = useAppStore();
  
  const [mouseOver, setMouseOver] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState(title);
  
  const isActive = id === currentChatId;

  const handleClick = () => {
    if (isRenaming) return; // Don't navigate while renaming
    
    onSelect?.();
    
    if (selectedFolder) {
      setSelectedFolder(null);
    }

    if (mobile) {
      setShowSidebar(false);
    }
  };

  const handleRename = async () => {
    if (newTitle.trim() === '' || newTitle === title) {
      setIsRenaming(false);
      setNewTitle(title);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await updateChatById(token || '', id, { title: newTitle });
      toast.success(t('Chat renamed successfully'));
      setIsRenaming(false);
      onChange?.();
    } catch (error) {
      console.error('Error renaming chat:', error);
      toast.error(t('Failed to rename chat'));
      setNewTitle(title);
      setIsRenaming(false);
    }
  };

  const handleArchive = async () => {
    try {
      const token = localStorage.getItem('token');
      await archiveChatById(token || '', id);
      toast.success(t('Chat archived'));
      
      // If we're viewing the archived chat, navigate away
      if (isActive) {
        navigate('/');
      }
      
      onChange?.();
    } catch (error) {
      console.error('Error archiving chat:', error);
      toast.error(t('Failed to archive chat'));
    }
  };

  const handleDelete = async () => {
    try {
      const token = localStorage.getItem('token');
      await deleteChatById(token || '', id);
      toast.success(t('Chat deleted'));
      
      // If we're viewing the deleted chat, navigate away
      if (isActive) {
        navigate('/');
      }
      
      setShowDeleteDialog(false);
      onChange?.();
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error(t('Failed to delete chat'));
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div
        className="group relative"
        onMouseEnter={() => setMouseOver(true)}
        onMouseLeave={() => setMouseOver(false)}
      >
        {isRenaming ? (
          // Rename input
          <div className="w-full flex items-center gap-2 rounded-xl px-[11px] py-[6px] bg-gray-100 dark:bg-gray-900">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename();
                } else if (e.key === 'Escape') {
                  setIsRenaming(false);
                  setNewTitle(title);
                }
              }}
              onBlur={handleRename}
              autoFocus
              className="h-[20px] text-sm border-none bg-transparent p-0 focus-visible:ring-0"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRename();
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
            >
              <Check className="size-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(false);
                setNewTitle(title);
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <Link
            id="sidebar-chat-item"
            to={`/c/${id}`}
            className={cn(
              'w-full flex justify-between rounded-xl px-[11px] py-[6px] whitespace-nowrap text-ellipsis',
              isActive
                ? 'bg-gray-100 dark:bg-gray-900'
                : selected
                  ? 'bg-gray-100 dark:bg-gray-950'
                  : 'group-hover:bg-gray-100 dark:group-hover:bg-gray-950'
            )}
            onClick={handleClick}
          >
            <div className="flex self-center flex-1 w-full">
              <div dir="auto" className="text-left self-center overflow-hidden w-full h-[20px] truncate">
                {title}
              </div>
            </div>
          </Link>
        )}

        {/* Chat Menu */}
        {!isRenaming && (
          <div
            id="sidebar-chat-item-menu"
            className={cn(
              'absolute top-[4px] py-1 pr-0.5 mr-1.5 pl-5 bg-gradient-to-l to-transparent',
              isActive
                ? 'from-gray-100 dark:from-gray-900 from-80%'
                : selected
                  ? 'from-gray-100 dark:from-gray-950 from-80%'
                  : 'invisible group-hover:visible from-gray-100 dark:from-gray-950 from-80%',
              className === 'pr-2' ? 'right-[8px]' : 'right-1'
            )}
            onMouseEnter={() => setMouseOver(true)}
            onMouseLeave={() => setMouseOver(false)}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-850 rounded-lg transition"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <MoreHorizontal className="size-4" />
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleArchive();
                  }}
                >
                  <Archive className="mr-2 size-4" />
                  {t('Archive')}
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
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete Chat?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('This will delete')} "<strong>{title}</strong>".
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
