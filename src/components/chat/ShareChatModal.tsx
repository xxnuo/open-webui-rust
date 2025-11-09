import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { getChatById, shareChatById, deleteSharedChatById } from '@/lib/apis/chats';
import { useAppStore } from '@/store';
import { Copy, Link, Trash2 } from 'lucide-react';

interface ShareChatModalProps {
  show: boolean;
  onClose: () => void;
  chatId: string;
}

export default function ShareChatModal({ show, onClose, chatId }: ShareChatModalProps) {
  const { t } = useTranslation();
  const [chat, setChat] = useState<any>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const config = useAppStore(state => state.config);
  const models = useAppStore(state => state.models);

  useEffect(() => {
    const loadChat = async () => {
      if (show && chatId) {
        try {
          const _chat = await getChatById(localStorage.token, chatId);
          setChat(_chat);
          if (_chat.share_id) {
            setShareUrl(`${window.location.origin}/s/${_chat.share_id}`);
          }
        } catch (error) {
          console.error('Error loading chat:', error);
          toast.error(t('Error loading chat'));
        }
      }
    };
    loadChat();
  }, [show, chatId, t]);

  const handleShareLocal = async () => {
    setLoading(true);
    try {
      const sharedChat = await shareChatById(localStorage.token, chatId);
      const url = `${window.location.origin}/s/${sharedChat.id}`;
      setShareUrl(url);
      
      const updatedChat = await getChatById(localStorage.token, chatId);
      setChat(updatedChat);
      
      toast.success(t('Chat shared successfully'));
    } catch (error) {
      console.error('Error sharing chat:', error);
      toast.error(t('Error sharing chat'));
    } finally {
      setLoading(false);
    }
  };

  const handleShareCommunity = async () => {
    if (!chat?.chat) return;

    toast.success(t('Redirecting you to Open WebUI Community'));
    const url = 'https://openwebui.com';

    const tab = window.open(`${url}/chats/upload`, '_blank');
    
    window.addEventListener('message', (event) => {
      if (event.origin !== url) return;
      if (event.data === 'loaded') {
        tab?.postMessage(
          JSON.stringify({
            chat: chat.chat,
            models: models.filter((m: any) => chat.chat.models.includes(m.id))
          }),
          '*'
        );
      }
    }, false);

    onClose();
  };

  const handleCopyLink = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(t('Link copied to clipboard'));
      } catch (error) {
        toast.error(t('Failed to copy link'));
      }
    } else {
      await handleShareLocal();
      // After sharing, copy the new URL
      if (shareUrl) {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(t('Link copied to clipboard'));
      }
    }
  };

  const handleDeleteLink = async () => {
    if (!chat?.share_id) return;

    try {
      await deleteSharedChatById(localStorage.token, chatId);
      const updatedChat = await getChatById(localStorage.token, chatId);
      setChat(updatedChat);
      setShareUrl(null);
      toast.success(t('Shared link deleted'));
    } catch (error) {
      console.error('Error deleting shared link:', error);
      toast.error(t('Error deleting shared link'));
    }
  };

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            {t('Share Chat')}
          </DialogTitle>
        </DialogHeader>

        {chat && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              {chat.share_id ? (
                <div className="space-y-2">
                  <p>
                    {t('You have shared this chat')}{' '}
                    <a 
                      href={`/s/${chat.share_id}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {t('before')}
                    </a>.
                  </p>
                  <p>
                    {t('Click here to')}{' '}
                    <button 
                      onClick={handleDeleteLink}
                      className="underline hover:text-destructive"
                    >
                      {t('delete this link')}
                    </button>{' '}
                    {t('and create a new shared link.')}
                  </p>
                </div>
              ) : (
                <p>
                  {t("Messages you send after creating your link won't be shared. Users with the URL will be able to view the shared chat.")}
                </p>
              )}
            </div>

            {shareUrl && (
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-2">
              {config?.features?.enable_community_sharing && (
                <Button
                  variant="outline"
                  onClick={handleShareCommunity}
                >
                  {t('Share to Open WebUI Community')}
                </Button>
              )}

              <Button
                onClick={handleCopyLink}
                disabled={loading}
              >
                <Link className="h-4 w-4 mr-2" />
                {chat.share_id ? t('Copy Link') : t('Copy & Share Link')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
