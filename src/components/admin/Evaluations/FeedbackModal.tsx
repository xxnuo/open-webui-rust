import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ThumbsUp, ThumbsDown, MessageSquare, User, Calendar } from 'lucide-react';
import Markdown from '@/components/chat/Markdown';

interface Feedback {
  id: string;
  type: 'rating' | 'comment';
  rating?: number;
  comment?: string;
  user?: {
    name?: string;
    email?: string;
  };
  chat?: {
    id: string;
    title?: string;
  };
  message?: {
    content: string;
    role: string;
  };
  response?: {
    content: string;
  };
  created_at: number;
}

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedback: Feedback | null;
}

export default function FeedbackModal({
  open,
  onOpenChange,
  feedback
}: FeedbackModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('details');

  if (!feedback) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t('Feedback Details')}
            {feedback.rating !== undefined && (
              <Badge variant={feedback.rating > 0 ? 'default' : 'destructive'}>
                {feedback.rating > 0 ? (
                  <>
                    <ThumbsUp className="size-3 mr-1" />
                    {t('Positive')}
                  </>
                ) : (
                  <>
                    <ThumbsDown className="size-3 mr-1" />
                    {t('Negative')}
                  </>
                )}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">{t('Details')}</TabsTrigger>
            <TabsTrigger value="message">{t('Message')}</TabsTrigger>
            <TabsTrigger value="response">{t('Response')}</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            <TabsContent value="details" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <User className="size-4" />
                    <span>{t('User')}</span>
                  </div>
                  <div className="text-sm font-medium">
                    {feedback.user?.name || feedback.user?.email || t('Anonymous')}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="size-4" />
                    <span>{t('Date')}</span>
                  </div>
                  <div className="text-sm font-medium">
                    {formatDate(feedback.created_at)}
                  </div>
                </div>
              </div>

              {feedback.chat && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MessageSquare className="size-4" />
                    <span>{t('Chat')}</span>
                  </div>
                  <div className="text-sm font-medium">
                    {feedback.chat.title || feedback.chat.id}
                  </div>
                </div>
              )}

              {feedback.comment && (
                <div className="space-y-1">
                  <div className="text-sm font-medium text-gray-500">
                    {t('Comment')}
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                    {feedback.comment}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-500">
                  {t('Feedback Type')}
                </div>
                <Badge variant="outline">{feedback.type}</Badge>
              </div>
            </TabsContent>

            <TabsContent value="message" className="space-y-4">
              {feedback.message ? (
                <div className="space-y-2">
                  <Badge variant="secondary">{feedback.message.role}</Badge>
                  <div className="prose dark:prose-invert max-w-none">
                    <Markdown content={feedback.message.content} />
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {t('No message available')}
                </div>
              )}
            </TabsContent>

            <TabsContent value="response" className="space-y-4">
              {feedback.response ? (
                <div className="prose dark:prose-invert max-w-none">
                  <Markdown content={feedback.response.content} />
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {t('No response available')}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

