import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { getChatById, shareChatById, deleteSharedChatById } from '@/lib/apis/chats';
import { copyToClipboard } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Link as LinkIcon, Trash2 } from 'lucide-react';

interface ShareChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string | null;
}

export default function ShareChatModal({ open, onOpenChange, chatId }: ShareChatModalProps) {
  const { t } = useTranslation();
  const [chat, setChat] = useState<unknown>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open && chatId) {
      loadChat();
    }
  }, [open, chatId]);

  const loadChat = async () => {
    if (!chatId) return;
    const chatData = await getChatById(localStorage.token, chatId);
    setChat(chatData);
    if ((chatData as { share_id?: string })?.share_id) {
      setShareUrl(`${window.location.origin}/s/${(chatData as { share_id: string }).share_id}`);
    } else {
      setShareUrl(null);
    }
  };

  const shareLocalChat = async () => {
    if (!chatId) return;
    const sharedChat = await shareChatById(localStorage.token, chatId);
    const url = `${window.location.origin}/s/${sharedChat.id}`;
    setShareUrl(url);
    await loadChat();
    return url;
  };

  const deleteShareLink = async () => {
    if (!chatId || !(chat as { share_id?: string })?.share_id) return;
    await deleteSharedChatById(localStorage.token, (chat as { share_id: string }).share_id);
    setShareUrl(null);
    await loadChat();
    toast.success(t('Deleted Shared Link'));
  };

  const handleCopy = async () => {
    if (shareUrl) {
      const success = await copyToClipboard(shareUrl);
      if (success) {
        toast.success(t('Copied to clipboard'));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Share Chat')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col space-y-4">
          {shareUrl ? (
            <>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly />
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  <Copy className="size-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={deleteShareLink}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </>
          ) : (
            <div>
              <Button onClick={shareLocalChat} className="w-full">
                <LinkIcon className="size-4 mr-2" />
                {t('Create Share Link')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

