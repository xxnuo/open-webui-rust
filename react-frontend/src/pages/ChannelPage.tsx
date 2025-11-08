import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAppStore } from '@/store';
import { getChannelById, getChannelMessages, sendMessage } from '@/lib/apis/channels';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  description?: string;
}

interface Message {
  id: string;
  content: string;
  user: {
    id: string;
    name: string;
    profile_image_url?: string;
  };
  created_at: number;
  data?: unknown;
}

export default function ChannelPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, socket } = useAppStore();
  
  const [channel, setChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState('');
  const [scrollEnd, setScrollEnd] = useState(true);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  const init = async () => {
    if (!id) return;

    const channelData = await getChannelById(localStorage.token, id).catch(() => null);

    if (channelData) {
      setChannel(channelData);
      const messagesData = await getChannelMessages(localStorage.token, id, 0);
      if (messagesData) {
        setMessages(messagesData);
        scrollToBottom();
      }
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    if (id) {
      init();
    }
  }, [id]);

  useEffect(() => {
    if (!socket || !id) return;

    const handleChannelEvent = (event: unknown) => {
      const evt = event as { channel_id: string; data?: { type?: string; data?: Message } };
      if (evt.channel_id === id && evt.data?.type === 'message' && evt.data?.data) {
        setMessages(prev => [evt.data.data, ...prev]);
        if (scrollEnd) {
          setTimeout(scrollToBottom, 100);
        }
      }
    };

    socket.on('channel-events', handleChannelEvent);

    return () => {
      socket.off('channel-events', handleChannelEvent);
    };
  }, [socket, id, scrollEnd]);

  const submitHandler = async () => {
    if (!content.trim() || !id) return;

    const res = await sendMessage(localStorage.token, id, {
      content,
      data: {},
      reply_to_id: null
    }).catch((error) => {
      toast.error(`${error}`);
      return null;
    });

    if (res) {
      setContent('');
    }
  };

  if (!channel) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      <div className="px-4 py-3 border-b">
        <h1 className="text-xl font-semibold">#{channel.name}</h1>
        {channel.description && (
          <p className="text-sm text-gray-500">{channel.description}</p>
        )}
      </div>

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {messages.slice().reverse().map((message) => (
          <div key={message.id} className="flex gap-3">
            <img
              src={message.user.profile_image_url || '/user.png'}
              alt={message.user.name}
              className="w-8 h-8 rounded-full"
            />
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold">{message.user.name}</span>
                <span className="text-xs text-gray-500">
                  {new Date(message.created_at / 1000000).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm mt-1">{message.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitHandler();
          }}
          className="flex gap-2"
        >
          <Input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('Message #{{name}}', { name: channel.name })}
            className="flex-1"
          />
          <Button type="submit" disabled={!content.trim()}>
            <Send className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

