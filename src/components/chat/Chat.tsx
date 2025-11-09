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
// Removed ScrollArea - using native scroll like Svelte for better performance
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

interface StatusHistoryItem {
  type?: string;
  description?: string;
  done?: boolean;
  [key: string]: unknown;
}

interface Source {
  type?: string;
  id?: string;
  url?: string;
  title?: string;
  content?: string;
  [key: string]: unknown;
}

interface CodeExecution {
  id: string;
  type?: string;
  code?: string;
  result?: string;
  language?: string;
  [key: string]: unknown;
}

// Keep followUps as string[] to match Message component expectations

interface Embed {
  url?: string;
  type?: string;
  [key: string]: unknown;
}

interface MessageError {
  content: string;
  type?: string;
  [key: string]: unknown;
}

interface MessageInfo {
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  [key: string]: unknown;
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
  error?: MessageError;
  statusHistory?: StatusHistoryItem[];
  sources?: Source[];
  code_executions?: CodeExecution[];
  followUps?: string[];
  embeds?: Embed[];
  info?: MessageInfo;
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
  const [autoScroll, setAutoScroll] = useState(true);
  const [taskIds, setTaskIds] = useState<string[] | null>(null);
  
  // Features state
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [imageGenerationEnabled, setImageGenerationEnabled] = useState(false);
  const [codeInterpreterEnabled, setCodeInterpreterEnabled] = useState(false);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesContentRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Scroll to bottom function - direct DOM manipulation like Svelte
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current && autoScroll) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [autoScroll]);

  // Auto-scroll when messages change - like Svelte with tick
  useEffect(() => {
    if (autoScroll) {
      // Use setTimeout(0) to defer scroll until after DOM updates (like Svelte's tick)
      setTimeout(() => {
        scrollToBottom();
      }, 0);
    }
  }, [history, autoScroll, scrollToBottom]);

  // Handle scroll events to update autoScroll state - like Svelte
  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      // Use 5px threshold like Svelte implementation for more accurate detection
      const isAtBottom = scrollHeight - scrollTop <= clientHeight + 5;
      setAutoScroll(isAtBottom);
    }
  }, []);

  // Convert history messages to array for display
  const getMessages = useCallback(() => {
    if (!history.currentId) return [];
    
    const messages: ChatMessage[] = [];
    let currentId: string | null = history.currentId;
    
    // Traverse back to root
    while (currentId) {
      const message: ChatMessage = history.messages[currentId];
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

  // Handle chat completion data - needs to be defined before use in handleChatEvent
  const handleChatCompletion = useCallback((data: {
    done?: boolean;
    choices?: Array<{
      message?: { content?: string };
      delta?: { content?: string };
    }>;
    content?: string;
    sources?: Source[];
    error?: MessageError;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  }, message: ChatMessage) => {
    const { done, choices, content, sources, error, usage } = data;

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
        const value = choices[0]?.delta?.content ?? '';
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

    if (usage && message) {
      message.info = { ...message.info, usage };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Socket.IO event handler with ref to avoid stale closures and batching for smooth streaming
  const historyRef = useRef(history);
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  interface PendingUpdate {
    type: string;
    data: Record<string, unknown>;
  }
  const pendingUpdatesRef = useRef<Map<string, PendingUpdate[]>>(new Map());
  
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  // Watch for content height changes (code blocks, images, etc.) and auto-scroll
  // This is crucial for smooth scrolling during incremental rendering
  useEffect(() => {
    const contentElement = messagesContentRef.current;
    if (!contentElement) return;

    // Use ResizeObserver to watch for height changes in the content
    resizeObserverRef.current = new ResizeObserver(() => {
      if (autoScroll && isGenerating) {
        // Scroll immediately when content height changes during generation
        scrollToBottom();
      }
    });

    resizeObserverRef.current.observe(contentElement);

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [autoScroll, isGenerating, scrollToBottom]);

  // Batch updates for smooth streaming (similar to Svelte's approach)
  const flushPendingUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.size === 0) return;

    setHistory(prevHistory => {
      const newHistory = { ...prevHistory };
      const newMessages = { ...newHistory.messages };
      let hasChanges = false;

      pendingUpdatesRef.current.forEach((updates, messageId) => {
        const message = newMessages[messageId];
        if (!message) return;

        // Apply all pending updates to this message
        const updatedMessage = { ...message };
        
        updates.forEach((update) => {
          const { type, data } = update;

          if (type === 'status') {
            if (!updatedMessage.statusHistory) {
              updatedMessage.statusHistory = [];
            }
            updatedMessage.statusHistory.push(data as StatusHistoryItem);
          } else if (type === 'chat:completion') {
            handleChatCompletion(data as Parameters<typeof handleChatCompletion>[0], updatedMessage);
          } else if (type === 'chat:message:delta' || type === 'message') {
            updatedMessage.content = (updatedMessage.content || '') + ((data?.content as string) || '');
          } else if (type === 'chat:message' || type === 'replace') {
            updatedMessage.content = (data?.content as string) || '';
          } else if (type === 'chat:message:files' || type === 'files') {
            updatedMessage.files = data?.files as FileAttachment[] | undefined;
          } else if (type === 'chat:message:embeds' || type === 'embeds') {
            updatedMessage.embeds = data?.embeds as Embed[] | undefined;
          } else if (type === 'chat:message:error') {
            updatedMessage.error = data?.error as MessageError | undefined;
            updatedMessage.done = true;
            setIsGenerating(false);
          } else if (type === 'chat:message:follow_ups') {
            updatedMessage.followUps = data?.follow_ups as string[] | undefined;
          } else if (type === 'source' || type === 'citation') {
            if (data?.type === 'code_execution') {
              if (!updatedMessage.code_executions) {
                updatedMessage.code_executions = [];
              }
              const codeExec = data as CodeExecution;
              const existingIndex = updatedMessage.code_executions.findIndex(
                (exec) => exec.id === codeExec?.id
              );
              if (existingIndex !== -1) {
                updatedMessage.code_executions[existingIndex] = codeExec;
              } else {
                updatedMessage.code_executions.push(codeExec);
              }
            } else {
              if (!updatedMessage.sources) {
                updatedMessage.sources = [];
              }
              updatedMessage.sources.push(data as Source);
            }
          }
        });

        newMessages[messageId] = updatedMessage;
        hasChanges = true;
      });

      pendingUpdatesRef.current.clear();

      if (!hasChanges) return prevHistory;

      newHistory.messages = newMessages;
      return newHistory;
    });

    // Trigger auto-scroll after batch update if enabled (like Svelte's tick)
    if (autoScroll) {
      setTimeout(() => {
        scrollToBottom();
      }, 0);
    }
  }, [handleChatCompletion, autoScroll, scrollToBottom]);

  useEffect(() => {
    if (!socket || !id) return;

    interface ChatEvent {
      chat_id: string;
      message_id?: string;
      data?: {
        type?: string;
        data?: Record<string, unknown>;
      };
    }

    const handleChatEvent = (event: ChatEvent) => {
      console.log('Chat event:', event);

      if (event.chat_id !== id) return;

      const type = event?.data?.type ?? null;
      const data = event?.data?.data ?? null;

      // Handle non-message events immediately
      if (type === 'chat:tasks:cancel') {
        setTaskIds(null);
        setHistory(prevHistory => {
          const newHistory = { ...prevHistory };
          const responseMessage = newHistory.messages[newHistory.currentId!];
          if (responseMessage && responseMessage.parentId) {
            const newMessages = { ...newHistory.messages };
            for (const msgId of newMessages[responseMessage.parentId].childrenIds) {
              newMessages[msgId] = { ...newMessages[msgId], done: true };
            }
            newHistory.messages = newMessages;
          }
          return newHistory;
        });
        return;
      } else if (type === 'chat:title' || type === 'chat:tags') {
        console.log(`${type} generated:`, data);
        return;
      } else if (type === 'notification') {
        const toastType = (data?.type as string) ?? 'info';
        const toastContent = String(data?.content ?? '');
        
        if (toastType === 'success') {
          toast.success(toastContent);
        } else if (toastType === 'error') {
          toast.error(toastContent);
        } else if (toastType === 'warning') {
          toast.warning(toastContent);
        } else {
          toast.info(toastContent);
        }
        return;
      }

      // Batch message updates for smooth streaming
      const messageId = event.message_id;
      if (!messageId) return;

      if (!pendingUpdatesRef.current.has(messageId)) {
        pendingUpdatesRef.current.set(messageId, []);
      }
      pendingUpdatesRef.current.get(messageId)!.push({ type: type || '', data: data || {} });

      // Throttle updates - flush every 50ms for smooth streaming
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      updateTimerRef.current = setTimeout(() => {
        flushPendingUpdates();
        updateTimerRef.current = null;
      }, 50);
    };

    socket.on('chat-events', handleChatEvent);

    return () => {
      socket.off('chat-events', handleChatEvent);
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
        flushPendingUpdates();
      }
    };
  }, [socket, id, flushPendingUpdates]);

  // Handle errors
  type ErrorType = MessageError | { 
    detail?: string; 
    error?: { message?: string }; 
    message?: string 
  } | Record<string, unknown>;
  
  const handleError = (error: ErrorType, message: ChatMessage) => {
    let errorMessage = '';
    
    if (typeof error === 'object' && error !== null) {
      if ('detail' in error && typeof error.detail === 'string') {
        toast.error(error.detail);
        errorMessage = error.detail;
      } else if ('error' in error && typeof error.error === 'object' && error.error !== null && 'message' in error.error && typeof error.error.message === 'string') {
        toast.error(error.error.message);
        errorMessage = error.error.message;
      } else if ('message' in error && typeof error.message === 'string') {
        toast.error(error.message);
        errorMessage = error.message;
      } else if ('content' in error && typeof error.content === 'string') {
        toast.error(error.content);
        errorMessage = error.content;
      }
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

  // Track if we're in the middle of creating a chat to prevent reload
  const isCreatingChatRef = useRef(false);
  const loadedChatIdRef = useRef<string | null>(null);

  // Load chat if ID is provided
  useEffect(() => {
    const loadChat = async () => {
      if (!id || !user) return;
      
      // Don't reload if we just created this chat
      if (isCreatingChatRef.current && id) {
        console.log('Skipping loadChat - just created this chat');
        isCreatingChatRef.current = false;
        loadedChatIdRef.current = id;
        return;
      }

      // Don't reload if we already loaded this exact chat
      if (loadedChatIdRef.current === id && Object.keys(history.messages).length > 0) {
        console.log('Skipping loadChat - already loaded');
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const chat = await getChatById(token || '', id);
        
        if (chat?.chat) {
          if (chat.chat.messages) {
            const convertedHistory = convertMessagesToHistory(chat.chat.messages);
            setHistory(convertedHistory);
            loadedChatIdRef.current = id;
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
  }, [id, user, onModelChange, history.messages]);

  // Convert simple messages array to history structure
  const convertMessagesToHistory = (messages: Array<Partial<ChatMessage> & { role: ChatMessage['role'] }>): ChatHistory => {
    const history: ChatHistory = {
      messages: {},
      currentId: null
    };

    if (!messages || messages.length === 0) return history;

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const messageId = msg.id || uuidv4();
      const parentId = i > 0 ? (messages[i - 1].id ?? null) : null;
      const nextMsgId = i < messages.length - 1 ? messages[i + 1].id : undefined;
      
      history.messages[messageId] = {
        id: messageId,
        parentId: parentId || null,
        childrenIds: nextMsgId ? [nextMsgId] : [],
        role: msg.role,
        content: msg.content || '',
        timestamp: msg.timestamp || Date.now(),
        files: msg.files,
        model: msg.model,
        modelName: msg.modelName,
        done: msg.done !== false
      };
    }

    const lastMsg = messages[messages.length - 1];
    if (messages.length > 0 && lastMsg?.id) {
      history.currentId = lastMsg.id;
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
        // Mark that we're creating a chat to prevent reload
        isCreatingChatRef.current = true;
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
              collection_name: (result as { collection_name?: string })?.collection_name
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

    interface Features {
      image_generation?: boolean;
      code_interpreter?: boolean;
      web_search?: boolean;
    }
    
    const features: Features = {};
    
    interface ConfigFeatures {
      enable_image_generation?: boolean;
      enable_code_interpreter?: boolean;
      enable_web_search?: boolean;
    }
    
    interface UserPermissions {
      features?: {
        image_generation?: boolean;
        code_interpreter?: boolean;
        web_search?: boolean;
      };
    }
    
    if (config?.features) {
      const configFeatures = config.features as ConfigFeatures;
      const userPermissions = user?.permissions as UserPermissions | undefined;
      
      if (configFeatures.enable_image_generation && 
          (user?.role === 'admin' || userPermissions?.features?.image_generation)) {
        features.image_generation = imageGenerationEnabled;
      }
      
      if (configFeatures.enable_code_interpreter && 
          (user?.role === 'admin' || userPermissions?.features?.code_interpreter)) {
        features.code_interpreter = codeInterpreterEnabled;
      }
      
      if (configFeatures.enable_web_search && 
          (user?.role === 'admin' || userPermissions?.features?.web_search)) {
        features.web_search = webSearchEnabled;
      }
    }

    try {
      const token = localStorage.getItem('token');
      
      const result = await generateOpenAIChatCompletion(
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
        return null;
      });

      // Check if the response indicates Socket.IO streaming
      if (result?.status === 'streaming') {
        console.log('Socket.IO streaming initiated, waiting for chat-events...');
        // Socket.IO will handle the streaming via chat-events
        // No need to do anything else here
      } else if (result) {
        // Non-streaming response - update message directly
        setHistory(prevHistory => {
          const newHistory = { ...prevHistory };
          const msg = newHistory.messages[responseMessageId];
          if (msg) {
            msg.content = result.choices?.[0]?.message?.content || '';
            msg.done = true;
          }
          return newHistory;
        });
        setIsGenerating(false);
      }

      // Refresh chat list after completion
      await getChatList(token || '', 1);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
      setIsGenerating(false);
    }
  };

  // Get messages for API call
  interface APIMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    files?: FileAttachment[];
  }
  
  const getMessagesForAPI = (history: ChatHistory, messageId: string): APIMessage[] => {
    const messages: APIMessage[] = [];
    let currentId: string | null = messageId;
    
    const responseMsg = history.messages[messageId];
    if (responseMsg && responseMsg.parentId) {
      currentId = responseMsg.parentId;
      
      while (currentId) {
        const currentMessage: ChatMessage | undefined = history.messages[currentId];
        if (currentMessage && currentMessage.role !== 'assistant') {
          messages.unshift({
            role: currentMessage.role,
            content: processDetails(currentMessage.content),
            ...(currentMessage.files && currentMessage.files.length > 0 && {
              files: currentMessage.files
            })
          });
          currentId = currentMessage.parentId;
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

  const handleRateMessage = async (_messageId: string, rating: number) => {
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
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="h-full w-full overflow-y-auto overflow-x-hidden"
          >
            <div 
              ref={messagesContentRef}
              className={`mx-auto py-8 w-full ${widescreenMode ? 'max-w-full' : 'max-w-5xl'}`}
            >
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
              {/* Bottom padding for better scrolling */}
              <div className="pb-20" />
            </div>
          </div>
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
