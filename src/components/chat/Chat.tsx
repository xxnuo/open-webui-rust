import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { generateOpenAIChatCompletion } from '@/lib/apis/openai';
import { createNewChat, getChatById, updateChatById, getChatList } from '@/lib/apis/chats';
import { uploadFile } from '@/lib/apis/files';
import { stopTask } from '@/lib/apis';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import Message from './Message';
import MessageInput from './MessageInput';
import Placeholder from './Placeholder';
import { ScrollArea } from '@/components/ui/scroll-area';
import { processDetails } from '@/lib/utils';
import { WEBUI_BASE_URL } from '@/lib/constants';

interface FileAttachment {
  id: string;
  name: string;
  type: string;
  url?: string;
  file?: File;
  status?: string;
  collection_name?: string;
}

interface ChatMessage {
  id: string;
  parentId: string | null;
  childrenIds: string[];
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  files?: FileAttachment[];
  models?: string[];
  model?: string;
  modelName?: string;
  modelIdx?: number;
  done?: boolean;
  error?: any;
  statusHistory?: any[];
  sources?: any[];
  code_executions?: any[];
  followUps?: any[];
  embeds?: any[];
}

interface ChatHistory {
  messages: Record<string, ChatMessage>;
  currentId: string | null;
}

interface ChatProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export default function Chat({ selectedModel, onModelChange }: ChatProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, socket, config, settings, models } = useAppStore();
  
  const [history, setHistory] = useState<ChatHistory>({
    messages: {},
    currentId: null
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatFiles, setChatFiles] = useState<FileAttachment[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [taskIds, setTaskIds] = useState<string[] | null>(null);
  
  // Features state
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [imageGenerationEnabled, setImageGenerationEnabled] = useState(false);
  const [codeInterpreterEnabled, setCodeInterpreterEnabled] = useState(false);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Scroll to bottom function
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (messagesEndRef.current && autoScroll) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, [autoScroll]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [history, scrollToBottom]);

  // Handle scroll events to update autoScroll
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      setAutoScroll(scrollHeight - scrollTop <= clientHeight + 50);
    }
  }, []);

  // Convert history messages to array for display
  const getMessages = useCallback(() => {
    if (!history.currentId) return [];
    
    const messages: ChatMessage[] = [];
    let currentId: string | null = history.currentId;
    
    // Traverse back to root
    while (currentId) {
      const message = history.messages[currentId];
      if (message) {
        messages.unshift(message);
        currentId = message.parentId;
      } else {
        break;
      }
    }
    
    return messages;
  }, [history]);

  const messages = getMessages();

  // Socket.IO event handler
  useEffect(() => {
    if (!socket || !id) return;

    const handleChatEvent = (event: any) => {
      console.log('Chat event:', event);

      if (event.chat_id !== id) return;

      setHistory(prevHistory => {
        const message = prevHistory.messages[event.message_id];
        if (!message) return prevHistory;

        const newHistory = { ...prevHistory };
        const newMessage = { ...message };
        
        const type = event?.data?.type ?? null;
        const data = event?.data?.data ?? null;

        if (type === 'status') {
          if (newMessage.statusHistory) {
            newMessage.statusHistory.push(data);
          } else {
            newMessage.statusHistory = [data];
          }
        } else if (type === 'chat:completion') {
          handleChatCompletion(data, newMessage);
        } else if (type === 'chat:tasks:cancel') {
          setTaskIds(null);
          const responseMessage = newHistory.messages[newHistory.currentId!];
          if (responseMessage && responseMessage.parentId) {
            for (const msgId of newHistory.messages[responseMessage.parentId].childrenIds) {
              newHistory.messages[msgId].done = true;
            }
          }
        } else if (type === 'chat:message:delta' || type === 'message') {
          newMessage.content += data.content;
        } else if (type === 'chat:message' || type === 'replace') {
          newMessage.content = data.content;
        } else if (type === 'chat:message:files' || type === 'files') {
          newMessage.files = data.files;
        } else if (type === 'chat:message:embeds' || type === 'embeds') {
          newMessage.embeds = data.embeds;
        } else if (type === 'chat:message:error') {
          newMessage.error = data.error;
        } else if (type === 'chat:message:follow_ups') {
          newMessage.followUps = data.follow_ups;
        } else if (type === 'source' || type === 'citation') {
          if (data?.type === 'code_execution') {
            if (!newMessage.code_executions) {
              newMessage.code_executions = [];
            }
            const existingIndex = newMessage.code_executions.findIndex(
              (exec: any) => exec.id === data.id
            );
            if (existingIndex !== -1) {
              newMessage.code_executions[existingIndex] = data;
            } else {
              newMessage.code_executions.push(data);
            }
          } else {
            if (newMessage.sources) {
              newMessage.sources.push(data);
            } else {
              newMessage.sources = [data];
            }
          }
        } else if (type === 'notification') {
          const toastType = data?.type ?? 'info';
          const toastContent = data?.content ?? '';
          
          if (toastType === 'success') {
            toast.success(toastContent);
          } else if (toastType === 'error') {
            toast.error(toastContent);
          } else if (toastType === 'warning') {
            toast.warning(toastContent);
          } else {
            toast.info(toastContent);
          }
        }

        newHistory.messages[event.message_id] = newMessage;
        return newHistory;
      });
    };

    socket.on('chat-events', handleChatEvent);

    return () => {
      socket.off('chat-events', handleChatEvent);
    };
  }, [socket, id]);

  // Handle chat completion data
  const handleChatCompletion = (data: any, message: ChatMessage) => {
    const { id, done, choices, content, sources, error, usage } = data;

    if (error) {
      handleError(error, message);
      return;
    }

    if (sources && !message.sources) {
      message.sources = sources;
    }

    if (choices) {
      if (choices[0]?.message?.content) {
        message.content += choices[0].message.content;
      } else {
        let value = choices[0]?.delta?.content ?? '';
        if (message.content === '' && value === '\n') {
          console.log('Empty response');
        } else {
          message.content += value;
        }
      }
    }

    if (content) {
      message.content = content;
    }

    if (done) {
      message.done = true;
      setIsGenerating(false);
    }

    if (usage) {
      message.info = { ...message.info, usage };
    }
  };

  // Handle errors
  const handleError = (error: any, message: ChatMessage) => {
    let errorMessage = '';
    
    if (error.detail) {
      toast.error(error.detail);
      errorMessage = error.detail;
    } else if (error.error?.message) {
      toast.error(error.error.message);
      errorMessage = error.error.message;
    } else if (error.message) {
      toast.error(error.message);
      errorMessage = error.message;
    }

    message.error = {
      content: 'Uh-oh! There was an issue with the response.\n' + errorMessage
    };
    message.done = true;

    setHistory(prevHistory => ({
      ...prevHistory,
      messages: {
        ...prevHistory.messages,
        [message.id]: message
      }
    }));
  };

  // Load chat if ID is provided
  useEffect(() => {
    const loadChat = async () => {
      if (!id || !user) return;

      try {
        const token = localStorage.getItem('token');
        const chat = await getChatById(token || '', id);
        
        if (chat?.chat) {
          if (chat.chat.messages) {
            const convertedHistory = convertMessagesToHistory(chat.chat.messages);
            setHistory(convertedHistory);
          }
          
          if (chat.chat.models?.[0]) {
            onModelChange(chat.chat.models[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load chat:', error);
        toast.error('Failed to load chat');
      }
    };

    loadChat();
  }, [id, user, onModelChange]);

  // Convert simple messages array to history structure
  const convertMessagesToHistory = (messages: any[]): ChatHistory => {
    const history: ChatHistory = {
      messages: {},
      currentId: null
    };

    if (!messages || messages.length === 0) return history;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const messageId = msg.id || uuidv4();
      const parentId = i > 0 ? messages[i - 1].id : null;
      
      history.messages[messageId] = {
        id: messageId,
        parentId,
        childrenIds: i < messages.length - 1 ? [messages[i + 1].id] : [],
        role: msg.role,
        content: msg.content || '',
        timestamp: msg.timestamp || Date.now(),
        files: msg.files,
        model: msg.model,
        modelName: msg.modelName,
        done: msg.done !== false
      };
    }

    if (messages.length > 0) {
      history.currentId = messages[messages.length - 1].id;
    }

    return history;
  };

  // Create new chat
  const initChatHandler = async (newHistory: ChatHistory) => {
    try {
      const token = localStorage.getItem('token');
      const chat = await createNewChat(token || '', {
        chat: {
          title: 'New Chat',
          models: [selectedModel],
          messages: newHistory.messages,
          history: newHistory,
          timestamp: Date.now()
        }
      });

      if (chat?.id) {
        navigate(`/c/${chat.id}`, { replace: true });
        return chat.id;
      }
    } catch (error) {
      console.error('Failed to create chat:', error);
      toast.error('Failed to create chat');
    }
    return null;
  };

  // Save chat
  const saveChatHandler = async (chatId: string, newHistory: ChatHistory) => {
    try {
      const token = localStorage.getItem('token');
      await updateChatById(token || '', chatId, {
        chat: {
          messages: newHistory.messages,
          history: newHistory,
          timestamp: Date.now()
        }
      });
    } catch (error) {
      console.error('Failed to save chat:', error);
    }
  };

  // Send message
  const handleSendMessage = async (content: string, files?: FileAttachment[]) => {
    if (!user || !selectedModel) {
      toast.error('Please select a model');
      return;
    }

    // Upload files if any
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
              url: `${WEBUI_BASE_URL}/api/v1/files/${result.id}`,
              status: 'uploaded',
              collection_name: result?.meta?.collection_name
            };
          }
          return fileAttachment;
        });
        uploadedFiles = await Promise.all(uploadPromises);
        toast.success('Files uploaded successfully');
      } catch (error) {
        console.error('File upload failed:', error);
        toast.error('File upload failed');
        return;
      }
    }

    setChatFiles(prev => [...prev, ...uploadedFiles]);

    const userMessageId = uuidv4();
    const parentMessage = history.currentId ? history.messages[history.currentId] : null;

    const userMessage: ChatMessage = {
      id: userMessageId,
      parentId: parentMessage ? parentMessage.id : null,
      childrenIds: [],
      role: 'user',
      content,
      files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      timestamp: Math.floor(Date.now() / 1000),
      models: [selectedModel]
    };

    const responseMessageId = uuidv4();
    const model = models.find(m => m.id === selectedModel);
    
    const responseMessage: ChatMessage = {
      id: responseMessageId,
      parentId: userMessageId,
      childrenIds: [],
      role: 'assistant',
      content: '',
      model: selectedModel,
      modelName: model?.name ?? selectedModel,
      modelIdx: 0,
      timestamp: Math.floor(Date.now() / 1000),
      done: false
    };

    userMessage.childrenIds.push(responseMessageId);

    const newHistory: ChatHistory = { ...history };
    
    if (parentMessage) {
      parentMessage.childrenIds.push(userMessageId);
      newHistory.messages[parentMessage.id] = parentMessage;
    }
    
    newHistory.messages[userMessageId] = userMessage;
    newHistory.messages[responseMessageId] = responseMessage;
    newHistory.currentId = responseMessageId;

    setHistory(newHistory);
    setIsGenerating(true);

    let chatId = id;
    if (!chatId) {
      chatId = await initChatHandler(newHistory);
      if (!chatId) {
        setIsGenerating(false);
        return;
      }
    } else {
      await saveChatHandler(chatId, newHistory);
    }

    const apiMessages = getMessagesForAPI(newHistory, responseMessageId);

    const features: any = {};
    
    if (config?.features) {
      if (config.features.enable_image_generation && 
          (user?.role === 'admin' || user?.permissions?.features?.image_generation)) {
        features.image_generation = imageGenerationEnabled;
      }
      
      if (config.features.enable_code_interpreter && 
          (user?.role === 'admin' || user?.permissions?.features?.code_interpreter)) {
        features.code_interpreter = codeInterpreterEnabled;
      }
      
      if (config.features.enable_web_search && 
          (user?.role === 'admin' || user?.permissions?.features?.web_search)) {
        features.web_search = webSearchEnabled;
      }
    }

    try {
      const token = localStorage.getItem('token');
      
      await generateOpenAIChatCompletion(
        token || '',
        {
          stream: true,
          model: selectedModel,
          messages: apiMessages,
          params: settings?.params || {},
          files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
          tool_ids: selectedToolIds.length > 0 ? selectedToolIds : undefined,
          features,
          session_id: socket?.id,
          chat_id: chatId,
          id: responseMessageId,
          model_item: model,
          background_tasks: {
            title_generation: settings?.title?.auto ?? true,
            tags_generation: settings?.autoTags ?? true,
            follow_up_generation: settings?.autoFollowUps ?? true
          }
        },
        `${WEBUI_BASE_URL}/api`
      ).catch((error) => {
        console.error('Chat completion error:', error);
        handleError(error, responseMessage);
      });

      const updatedChats = await getChatList(token || '', 1);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      setIsGenerating(false);
    }
  };

  // Get messages for API call
  const getMessagesForAPI = (history: ChatHistory, messageId: string) => {
    const messages: any[] = [];
    let currentId: string | null = messageId;
    
    const responseMsg = history.messages[messageId];
    if (responseMsg && responseMsg.parentId) {
      currentId = responseMsg.parentId;
      
      while (currentId) {
        const message = history.messages[currentId];
        if (message && message.role !== 'assistant') {
          messages.unshift({
            role: message.role,
            content: processDetails(message.content),
            ...(message.files && message.files.length > 0 && {
              files: message.files
            })
          });
          currentId = message.parentId;
        } else {
          break;
        }
      }
    }
    
    return messages;
  };

  const handleStopGeneration = async () => {
    if (taskIds && taskIds.length > 0) {
      const token = localStorage.getItem('token');
      for (const taskId of taskIds) {
        try {
          await stopTask(token || '', taskId);
        } catch (error) {
          console.error('Failed to stop task:', error);
        }
      }
      setTaskIds(null);
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setIsGenerating(false);
    
    if (history.currentId) {
      const currentMessage = history.messages[history.currentId];
      if (currentMessage) {
        currentMessage.done = true;
        setHistory(prevHistory => ({
          ...prevHistory,
          messages: {
            ...prevHistory.messages,
            [history.currentId!]: currentMessage
          }
        }));
      }
    }
  };

  const handleRegenerate = async () => {
    if (!history.currentId) return;
    
    const currentMessage = history.messages[history.currentId];
    if (!currentMessage || !currentMessage.parentId) return;
    
    const parentMessage = history.messages[currentMessage.parentId];
    if (!parentMessage || parentMessage.role !== 'user') return;
    
    await handleSendMessage(parentMessage.content, parentMessage.files);
  };

  const handleContinue = async () => {
    if (!history.currentId) return;
    
    const currentMessage = history.messages[history.currentId];
    if (!currentMessage) return;
    
    const continueContent = 'Continue your response from where you left off.';
    await handleSendMessage(continueContent);
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    const message = history.messages[messageId];
    if (!message) return;
    
    const updatedMessage = { ...message, content: newContent };
    
    setHistory(prevHistory => ({
      ...prevHistory,
      messages: {
        ...prevHistory.messages,
        [messageId]: updatedMessage
      }
    }));
    
    if (message.role === 'user' && message.childrenIds.length > 0) {
      const newMessages = { ...history.messages };
      const removeChildren = (msgId: string) => {
        const msg = newMessages[msgId];
        if (msg) {
          msg.childrenIds.forEach(childId => removeChildren(childId));
          delete newMessages[msgId];
        }
      };
      
      message.childrenIds.forEach(childId => removeChildren(childId));
      message.childrenIds = [];
      
      setHistory(prevHistory => ({
        ...prevHistory,
        messages: newMessages,
        currentId: messageId
      }));
      
      await handleSendMessage(newContent, message.files);
    } else if (id) {
      await saveChatHandler(id, history);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const message = history.messages[messageId];
    if (!message) return;
    
    const newMessages = { ...history.messages };
    
    const removeMessage = (msgId: string) => {
      const msg = newMessages[msgId];
      if (msg) {
        msg.childrenIds.forEach(childId => removeMessage(childId));
        delete newMessages[msgId];
      }
    };
    
    if (message.parentId) {
      const parent = newMessages[message.parentId];
      if (parent) {
        parent.childrenIds = parent.childrenIds.filter(id => id !== messageId);
      }
    }
    
    removeMessage(messageId);
    
    let newCurrentId = history.currentId;
    if (messageId === newCurrentId || !newMessages[newCurrentId || '']) {
      newCurrentId = message.parentId;
    }
    
    setHistory({
      messages: newMessages,
      currentId: newCurrentId
    });
    
    if (id) {
      await saveChatHandler(id, { messages: newMessages, currentId: newCurrentId });
    }
    
    toast.success('Message deleted');
  };

  const handleRateMessage = async (messageId: string, rating: number) => {
    toast.info(`Message rated: ${rating > 0 ? 'Good' : 'Bad'}`);
  };

  const handlePromptSelect = async (prompt: string) => {
    await handleSendMessage(prompt);
  };

  const widescreenMode = settings?.widescreenMode ?? null;

  return (
    <div className="flex h-full w-full flex-col">
      {/* Messages area or Placeholder */}
      <div className="flex-1 relative overflow-hidden">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full overflow-auto">
            <Placeholder 
              selectedModel={selectedModel}
              onSelectPrompt={handlePromptSelect}
            />
          </div>
        ) : (
          <ScrollArea 
            ref={messagesContainerRef}
            className="h-full"
            onScrollCapture={handleScroll}
          >
            <div className={`mx-auto py-8 w-full ${widescreenMode ? 'max-w-full' : 'max-w-5xl'}`}>
              {messages.map((message, index) => (
                <Message
                  key={message.id}
                  message={message}
                  isLast={index === messages.length - 1}
                  onRegenerate={message.role === 'assistant' && index === messages.length - 1 ? handleRegenerate : undefined}
                  onContinue={message.role === 'assistant' && index === messages.length - 1 ? handleContinue : undefined}
                  onEdit={(content) => handleEditMessage(message.id, content)}
                  onDelete={() => handleDeleteMessage(message.id)}
                  onRate={(rating) => handleRateMessage(message.id, rating)}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Input area */}
      <MessageInput
        onSend={handleSendMessage}
        onStop={handleStopGeneration}
        isGenerating={isGenerating}
        disabled={false}
        webSearchEnabled={webSearchEnabled}
        onWebSearchToggle={() => setWebSearchEnabled(!webSearchEnabled)}
        imageGenerationEnabled={imageGenerationEnabled}
        onImageGenerationToggle={() => setImageGenerationEnabled(!imageGenerationEnabled)}
        codeInterpreterEnabled={codeInterpreterEnabled}
        onCodeInterpreterToggle={() => setCodeInterpreterEnabled(!codeInterpreterEnabled)}
        selectedToolIds={selectedToolIds}
        onToolsSelect={setSelectedToolIds}
      />
    </div>
  );
}
