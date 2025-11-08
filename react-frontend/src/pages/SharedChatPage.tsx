import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import { getChatByShareId, cloneSharedChatById } from '@/lib/apis/chats';
import { getUserById } from '@/lib/apis/users';
import { Button } from '@/components/ui/button';
import { dayjs } from '@/lib/utils';

interface SharedChat {
  id: string;
  user_id: string;
  chat: {
    title: string;
    timestamp: number;
    messages: unknown[];
    models?: string[];
  };
}

export default function SharedChatPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { WEBUI_NAME } = useAppStore();
  
  const [loaded, setLoaded] = useState(false);
  const [chat, setChat] = useState<SharedChat | null>(null);
  const [user, setUser] = useState<{ name: string } | null>(null);

  useEffect(() => {
    document.title = WEBUI_NAME;
  }, [WEBUI_NAME]);

  const loadSharedChat = async () => {
    if (!id) return;

    const chatData = await getChatByShareId(localStorage.token, id).catch(async (error) => {
      await navigate('/');
      return null;
    });

    if (chatData) {
      setChat(chatData);

      const userData = await getUserById(localStorage.token, chatData.user_id).catch((error) => {
        console.error(error);
        return null;
      });

      setUser(userData);
    }

    setLoaded(true);
  };

  useEffect(() => {
    if (id) {
      loadSharedChat();
    }
  }, [id]);

  const cloneSharedChat = async () => {
    if (!chat) return;

    const res = await cloneSharedChatById(localStorage.token, chat.id).catch((error) => {
      toast.error(`${error}`);
      return null;
    });

    if (res) {
      navigate(`/c/${res.id}`);
    }
  };

  if (!loaded) {
    return (
      <div className="w-full h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!chat) {
    return null;
  }

  return (
    <div className="h-screen max-h-[100dvh] w-full flex flex-col text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-900">
      <div className="flex flex-col flex-auto justify-center relative">
        <div className="flex flex-col w-full flex-auto overflow-auto h-0" id="messages-container">
          <div className="pt-5 px-2 w-full max-w-5xl mx-auto">
            <div className="px-3">
              <div className="text-2xl font-semibold line-clamp-1">
                {chat.chat.title}
              </div>

              <div className="flex text-sm justify-between items-center mt-1">
                <div className="text-gray-400">
                  {dayjs(chat.chat.timestamp).format('LLL')}
                </div>
              </div>
            </div>
          </div>

          <div className="h-full w-full flex flex-col py-2">
            <div className="w-full">
              {/* Messages would be rendered here using the Messages component */}
              <div className="text-center py-20 text-gray-500">
                {t('Chat messages will be displayed here')}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 right-0 left-0 flex justify-center w-full bg-gradient-to-b from-transparent to-white dark:to-gray-900">
          <div className="pb-5">
            <Button
              onClick={cloneSharedChat}
              className="px-3.5 py-1.5 text-sm font-medium"
            >
              {t('Clone Chat')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

