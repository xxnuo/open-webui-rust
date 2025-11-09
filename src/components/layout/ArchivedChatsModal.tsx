import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { getArchivedChatList, archiveChatById } from '@/lib/apis/chats';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Unplug } from 'lucide-react';
import { dayjs } from '@/lib/utils';

interface Chat {
  id: string;
  title: string;
  updated_at: number;
}

interface ArchivedChatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export default function ArchivedChatsModal({ open, onOpenChange, onUpdate }: ArchivedChatsModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [chatList, setChatList] = useState<Chat[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) {
      loadChats();
    }
  }, [open]);

  const loadChats = async () => {
    setLoading(true);
    const filter = query ? { query } : {};
    const chats = await getArchivedChatList(localStorage.token, 1, filter);
    setChatList(chats || []);
    setLoading(false);
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (open) {
        loadChats();
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  const unarchiveChat = async (chatId: string) => {
    await archiveChatById(localStorage.token, chatId);
    toast.success(t('Chat unarchived'));
    await loadChats();
    onUpdate?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t('Archived Chats')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Search className="size-4 self-center text-gray-500" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Search archived chats...')}
              className="flex-1"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : chatList.length > 0 ? (
              chatList.map((chat) => (
                <div
                  key={chat.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => {
                      navigate(`/c/${chat.id}`);
                      onOpenChange(false);
                    }}
                  >
                    <div className="font-medium">{chat.title}</div>
                    <div className="text-xs text-gray-500">
                      {dayjs(chat.updated_at / 1000000).fromNow()}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unarchiveChat(chat.id)}
                  >
                    <Unplug className="size-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                {t('No archived chats')}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

