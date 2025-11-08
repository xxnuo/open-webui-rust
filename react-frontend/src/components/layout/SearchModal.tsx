import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getChatListBySearchText } from '@/lib/apis/chats';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { dayjs } from '@/lib/utils';

interface Chat {
  id: string;
  title: string;
  updated_at: number;
}

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [chatList, setChatList] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setChatList([]);
      setSelectedIdx(null);
    }
  }, [open]);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (query.trim() && open) {
        setLoading(true);
        const results = await getChatListBySearchText(localStorage.token, query);
        setChatList(results || []);
        setSelectedIdx(results && results.length > 0 ? 0 : null);
        setLoading(false);
      } else {
        setChatList([]);
        setSelectedIdx(null);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((prev) => {
        if (prev === null) return 0;
        return Math.min(prev + 1, chatList.length - 1);
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((prev) => {
        if (prev === null || prev === 0) return null;
        return prev - 1;
      });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIdx !== null && chatList[selectedIdx]) {
        navigate(`/c/${chatList[selectedIdx].id}`);
        onOpenChange(false);
      } else if (query.trim()) {
        navigate(`/?q=${encodeURIComponent(query)}`);
        onOpenChange(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0">
        <div className="flex items-center border-b px-4 py-3">
          <Search className="size-4 mr-3 text-gray-500" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('Search chats...')}
            className="border-0 focus-visible:ring-0 text-lg"
          />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : chatList.length > 0 ? (
            <div className="py-2">
              {chatList.map((chat, idx) => (
                <button
                  key={chat.id}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition ${
                    selectedIdx === idx ? 'bg-gray-100 dark:bg-gray-800' : ''
                  }`}
                  onClick={() => {
                    navigate(`/c/${chat.id}`);
                    onOpenChange(false);
                  }}
                  onMouseEnter={() => setSelectedIdx(idx)}
                >
                  <div className="font-medium">{chat.title}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {dayjs(chat.updated_at / 1000000).fromNow()}
                  </div>
                </button>
              ))}
            </div>
          ) : query.trim() ? (
            <div className="py-8 text-center text-gray-500">
              <div className="mb-2">{t('No results found')}</div>
              <div className="text-xs">
                {t('Press Enter to start a new chat with this query')}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              {t('Type to search chats...')}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

