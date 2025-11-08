import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { getChatById, updateChatById } from '@/lib/apis/chats';
import { getAllTags } from '@/lib/apis/chats';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface TagChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string | null;
  onUpdate?: () => void;
}

export default function TagChatModal({ open, onOpenChange, chatId, onUpdate }: TagChatModalProps) {
  const { t } = useTranslation();
  const [tags, setTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    if (open && chatId) {
      loadChatTags();
      loadAllTags();
    }
  }, [open, chatId]);

  const loadChatTags = async () => {
    if (!chatId) return;
    const chat = await getChatById(localStorage.token, chatId);
    setTags((chat as { tags?: string[] })?.tags || []);
  };

  const loadAllTags = async () => {
    const tagsData = await getAllTags(localStorage.token);
    setAllTags(tagsData.map((t: { name: string }) => t.name));
  };

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setInputValue('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const saveTags = async () => {
    if (!chatId) return;
    await updateChatById(localStorage.token, chatId, { tags });
    toast.success(t('Tags updated'));
    onUpdate?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Add Tags')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder={t('Add a tag...')}
            />
            <Button onClick={addTag}>{t('Add')}</Button>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {allTags.length > 0 && (
            <div>
              <div className="text-sm text-gray-500 mb-2">{t('Existing tags:')}</div>
              <div className="flex flex-wrap gap-2">
                {allTags.filter(t => !tags.includes(t)).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => {
                      if (!tags.includes(tag)) {
                        setTags([...tags, tag]);
                      }
                    }}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('Cancel')}
            </Button>
            <Button onClick={saveTags}>{t('Save')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

