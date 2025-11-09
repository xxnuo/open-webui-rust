import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Loader } from '../common/Loader';
import ChannelMessage from './ChannelMessage';
import ChannelMessageInput from './ChannelMessageInput';

interface Message {
  id: string;
  content: string;
  user_id: string;
  parent_id?: string | null;
  created_at: number;
  [key: string]: any;
}

interface ThreadProps {
  threadId: string | null;
  channel: any;
  onClose: () => void;
}

export const Thread: React.FC<ThreadProps> = ({ threadId, channel, onClose }) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [loading, setLoading] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    const initHandler = async () => {
      if (!threadId || !channel) {
        setMessages([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // TODO: Implement getChannelThreadMessages API call
        // const data = await getChannelThreadMessages(token, channel.id, threadId);
        // setMessages(data);
        setMessages([]);
        
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        toast.error(t('Failed to load thread messages'));
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    initHandler();
  }, [threadId, channel, t]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !channel || !threadId) return;

    try {
      // TODO: Implement sendMessage API call with parent_id = threadId
      toast.success(t('Message sent'));
    } catch (error) {
      toast.error(t('Failed to send message'));
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
        <h2 className="text-lg font-medium">{t('Thread')}</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          aria-label={t('Close thread')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2"
      >
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader />
          </div>
        ) : messages && messages.length > 0 ? (
          messages.map((message) => (
            <ChannelMessage key={message.id} message={message} />
          ))
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            {t('No messages in this thread')}
          </div>
        )}
      </div>

      <div className="border-t dark:border-gray-700">
        <ChannelMessageInput
          onSend={handleSendMessage}
          placeholder={t('Reply to thread...')}
        />
      </div>
    </div>
  );
};

export default Thread;

