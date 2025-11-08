import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Trash2, Archive, Copy, Edit2 } from 'lucide-react';
import { deleteChatById, updateChatById, archiveChatById } from '@/lib/apis/chats';
import { toast } from 'sonner';
import { useAppStore } from '@/store';

interface ChatItemProps {
  id: string;
  title: string;
  active?: boolean;
  onDelete?: () => void;
  onChange?: () => void;
}

export default function ChatItem({ 
  id, 
  title, 
  active = false,
  onDelete,
  onChange 
}: ChatItemProps) {
  const navigate = useNavigate();
  const { mobile, setShowSidebar, chatId, setChatTitle } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleClick = () => {
    navigate(`/c/${id}`);
    if (mobile) {
      setShowSidebar(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this chat?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token') || '';
      await deleteChatById(token, id);
      
      if (chatId === id) {
        navigate('/');
      }
      
      onDelete?.();
      toast.success('Chat deleted');
    } catch (error) {
      console.error('Failed to delete chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const token = localStorage.getItem('token') || '';
      await archiveChatById(token, id);
      
      onChange?.();
      toast.success('Chat archived');
    } catch (error) {
      console.error('Failed to archive chat:', error);
      toast.error('Failed to archive chat');
    }
  };

  const handleEditSave = async () => {
    if (editedTitle.trim() === '') {
      toast.error('Title cannot be empty');
      return;
    }

    try {
      const token = localStorage.getItem('token') || '';
      await updateChatById(token, id, { title: editedTitle });
      
      if (chatId === id) {
        setChatTitle(editedTitle);
      }
      
      setIsEditing(false);
      onChange?.();
      toast.success('Chat renamed');
    } catch (error) {
      console.error('Failed to rename chat:', error);
      toast.error('Failed to rename chat');
    }
  };

  const handleEditCancel = () => {
    setEditedTitle(title);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div
        className={`group flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm ${
          active ? 'bg-gray-100 dark:bg-gray-900' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="text"
          value={editedTitle}
          onChange={(e) => setEditedTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleEditSave();
            } else if (e.key === 'Escape') {
              handleEditCancel();
            }
          }}
          onBlur={handleEditSave}
          className="flex-1 bg-transparent border-b border-gray-300 dark:border-gray-700 outline-none"
          autoFocus
        />
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer transition ${
        active ? 'bg-gray-100 dark:bg-gray-900' : ''
      }`}
      onClick={handleClick}
    >
      <span className="flex-1 truncate text-gray-900 dark:text-gray-200">
        {title || 'Untitled Chat'}
      </span>
      
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(false);
              setIsEditing(true);
            }}
          >
            <Edit2 className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={handleArchive}
          >
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

