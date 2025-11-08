import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { chatCompletion } from '@/lib/apis/openai';
import { createNewChat, getChatById, updateChatById } from '@/lib/apis/chats';
import { uploadFile } from '@/lib/apis/files';
import { toast } from 'sonner';
import Message from './Message';
import MessageInput from './MessageInputNew';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  url?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id?: string;
  timestamp?: number;
  files?: FileAttachment[];
}

interface ChatProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export default function Chat({ selectedModel, onModelChange }: ChatProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  // Load chat if ID is provided
  useEffect(() => {
    const loadChat = async () => {
      if (!id || !user) return;

      try {
        const token = localStorage.getItem('token');
        const chat = await getChatById(token || '', id);
        
        if (chat?.chat?.messages) {
          setMessages(chat.chat.messages);
        }
        if (chat?.chat?.models?.[0]) {
          onModelChange(chat.chat.models[0]);
        }
      } catch (error) {
        console.error('Failed to load chat:', error);
        toast.error('Failed to load chat');
      }
    };

    loadChat();
  }, [id, user]);

  const handleSendMessage = async (content: string, files?: Array<{ id: string; name: string; type: string; file?: File; url?: string }>) => {
    if (!user || !selectedModel) {
      toast.error('Please select a model');
      return;
    }

    // Upload files first if any
    let uploadedFiles: FileAttachment[] = [];
    if (files && files.length > 0) {
      const token = localStorage.getItem('token');
      try {
        const uploadPromises = files.map(async (fileAttachment) => {
          if (fileAttachment.file) {
            const result = await uploadFile(token || '', fileAttachment.file);
            return {
              id: result.id,
              name: result.filename,
              type: fileAttachment.type,
              url: fileAttachment.url
            };
          }
          return fileAttachment;
        });
        uploadedFiles = await Promise.all(uploadPromises);
        toast.success('Files uploaded successfully');
      } catch (error) {
        console.error('File upload error:', error);
        toast.error('Failed to upload files');
        return;
      }
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: Date.now(),
      files: uploadedFiles
    };

    // Add user message
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsGenerating(true);
    setStreamingContent('');

    try {
      const token = localStorage.getItem('token');

      // Prepare the request body
      const requestBody = {
        model: selectedModel,
        messages: updatedMessages.map(m => ({
          role: m.role,
          content: m.content
        })),
        stream: true
      };

      // Make the streaming request
      const [response, controller] = await chatCompletion(
        token || '',
        requestBody
      );

      abortControllerRef.current = controller;

      if (!response || !response.ok) {
        throw new Error('Failed to get response');
      }

      // Process the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                
                if (content) {
                  accumulatedContent += content;
                  setStreamingContent(accumulatedContent);
                }
              } catch {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: accumulatedContent,
        timestamp: Date.now(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      setStreamingContent('');

      // Save or update chat
      if (id) {
        await updateChatById(token || '', id, {
          chat: {
            messages: finalMessages
          }
        });
      } else {
        // Create new chat
        const newChat = await createNewChat(token || '', {
          chat: {
            title: content.slice(0, 50),
            messages: finalMessages,
            models: [selectedModel]
          }
        });

        if (newChat?.id) {
          navigate(`/c/${newChat.id}`, { replace: true });
        }
      }

      } catch (error: unknown) {
      console.error('Chat error:', error);
      if (error instanceof Error && error.name !== 'AbortError') {
        toast.error(error.message || 'Failed to send message');
      }
    } finally {
      setIsGenerating(false);
      setStreamingContent('');
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      setStreamingContent('');
      toast.info('Generation stopped');
    }
  };

  const handleRegenerate = () => {
    if (messages.length === 0) return;

    // Remove last assistant message and regenerate
    const lastUserMessageIndex = messages.slice().reverse().findIndex(m => m.role === 'user');
    const actualIndex = lastUserMessageIndex >= 0 ? messages.length - 1 - lastUserMessageIndex : -1;
    if (actualIndex !== -1) {
      const lastUserMessage = messages[actualIndex];
      const messagesUpToLastUser = messages.slice(0, actualIndex);
      setMessages(messagesUpToLastUser);
      handleSendMessage(lastUserMessage.content, lastUserMessage.files);
    }
  };

  // Combine regular messages with streaming content
  const displayMessages = [...messages];
  if (streamingContent) {
    displayMessages.push({
      role: 'assistant',
      content: streamingContent,
      timestamp: Date.now(),
    });
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl">
          {displayMessages.length === 0 ? (
            <div className="flex h-full items-center justify-center p-8">
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-bold">Start a conversation</h2>
                <p className="text-muted-foreground">
                  Select a model and send a message to begin
                </p>
              </div>
            </div>
          ) : (
            displayMessages.map((message, index) => (
              <Message
                key={`${message.timestamp}-${index}`}
                message={message}
                isLast={index === displayMessages.length - 1}
                onRegenerate={handleRegenerate}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <MessageInput
        onSend={handleSendMessage}
        onStop={handleStopGeneration}
        isGenerating={isGenerating}
        disabled={!selectedModel}
        placeholder={selectedModel ? 'Send a message... (Press Enter to send, Shift + Enter for new line)' : 'Select a model first...'}
        richText={true}
      />
    </div>
  );
}

