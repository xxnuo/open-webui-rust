import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { Toaster, toast } from 'sonner';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import { useEffect, useState, useCallback, useRef } from 'react';
import { initI18n, getLanguages, changeLanguage } from '@/lib/i18n';
import { useAppStore } from '@/store';
import { getBackendConfig } from '@/lib/apis';
import { userSignOut } from '@/lib/apis/auths';
import { getChatList, getAllTags } from '@/lib/apis/chats';
import { chatCompletion } from '@/lib/apis/openai';
import { executeToolServer } from '@/lib/apis';
import { WEBUI_BASE_URL } from '@/lib/constants';

// Types
type ToolExecutionData = {
  server?: { url: string };
  name?: string;
  params?: Record<string, unknown>;
};

type ChatEventData = {
  chat_id: string;
  data?: {
    type?: string;
    data?: {
      done?: boolean;
      content?: string;
      title?: string;
    };
    session_id?: string;
    channel?: string;
    form_data?: Record<string, unknown>;
    model?: Record<string, unknown>;
  };
};

type ChannelEventData = {
  channel_id: string;
  user?: { id: string };
  channel?: { name: string };
  data?: {
    type?: string;
    data?: {
      user?: {
        name: string;
        profile_image_url?: string;
      };
      content?: string;
    };
  };
};

// Pages
import Layout from '@/components/Layout';
import ChatPage from '@/pages/ChatPage';
import AuthPage from '@/pages/AuthPage';
import ErrorPage from '@/pages/ErrorPage';
import ErrorBoundary from '@/components/ErrorBoundary';

// Admin Pages
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminPage from '@/pages/admin/AdminPage';
import UsersPage from '@/pages/admin/UsersPage';
import SettingsPage from '@/pages/admin/SettingsPage';
import FunctionsPage from '@/pages/admin/FunctionsPage';
import EvaluationsPage from '@/pages/admin/EvaluationsPage';
import AnalyticsPage from '@/pages/admin/AnalyticsPage';

// Notes Pages
import NotesPage from '@/pages/NotesPage';
import NoteEditorPage from '@/pages/NoteEditorPage';

// Channel Pages
import ChannelPage from '@/pages/ChannelPage';

// Playground Pages
import PlaygroundPage from '@/pages/PlaygroundPage';

// Workspace Pages
import WorkspaceLayout from '@/pages/workspace/WorkspaceLayout';
import ModelsWorkspacePage from '@/pages/workspace/ModelsWorkspacePage';
import KnowledgeWorkspacePage from '@/pages/workspace/KnowledgeWorkspacePage';
import PromptsWorkspacePage from '@/pages/workspace/PromptsWorkspacePage';
import ToolsWorkspacePage from '@/pages/workspace/ToolsWorkspacePage';

// Other Pages
import SharedChatPage from '@/pages/SharedChatPage';
import WatchPage from '@/pages/WatchPage';

import '@/index.css';

const BREAKPOINT = 768;
const TOKEN_EXPIRY_BUFFER = 60; // seconds

// Helper function to find best matching language
const bestMatchingLanguage = (languages: string[], browserLanguages: string[], fallback: string) => {
  for (const bl of browserLanguages) {
    const match = languages.find((l) => l.toLowerCase().startsWith(bl.toLowerCase()));
    if (match) return match;
  }
  return fallback;
};

function AppContent() {
  const [initialized, setInitialized] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  const {
    setConfig,
    setWEBUI_NAME,
    user,
    setUser,
    setTheme,
    socket,
    setMobile,
    settings,
    setTags,
    setChats,
    setCurrentChatPage,
    chatId,
    temporaryChatEnabled,
    isLastActiveTab,
    setIsLastActiveTab,
    setPlayingNotificationSound,
    setIsApp,
    setAppInfo,
    toolServers
  } = useAppStore();

  const bcRef = useRef<BroadcastChannel | null>(null);
  const tokenTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Socket setup is now handled in Layout.tsx - removed duplicate

  // Execute tool function
  const executeTool = useCallback(async (data: ToolExecutionData, cb: (result: unknown) => void) => {
    const toolServer = settings?.toolServers?.find((server) => server.url === data.server?.url);
    const toolServerData = toolServers?.find((server) => server.url === data.server?.url);

    console.log('executeTool', data, toolServer);

    if (toolServer) {
      let toolServerToken = null;
      const auth_type = toolServer?.auth_type ?? 'bearer';
      if (auth_type === 'bearer') {
        toolServerToken = toolServer?.key;
      } else if (auth_type === 'session') {
        toolServerToken = localStorage.token;
      }

      const res = await executeToolServer(
        toolServerToken ?? '',
        toolServer.url,
        data?.name ?? '',
        data?.params ?? {},
        toolServerData
      );

      console.log('executeToolServer', res);
      if (cb) {
        cb(JSON.parse(JSON.stringify(res)));
      }
    } else {
      if (cb) {
        cb(
          JSON.parse(
            JSON.stringify({
              error: 'Tool Server Not Found'
            })
          )
        );
      }
    }
  }, [settings, toolServers]);

  // Chat event handler
  const chatEventHandler = useCallback(async (event: ChatEventData, cb?: (result: unknown) => void) => {
    let isFocused = document.visibilityState !== 'visible';
    if ((window as any).electronAPI) {
      const res = await (window as any).electronAPI.send({
        type: 'window:isFocused'
      });
      if (res) {
        isFocused = res.isFocused;
      }
    }

    const type = event?.data?.type ?? null;
    const data = event?.data?.data ?? null;

    if ((event.chat_id !== chatId && !temporaryChatEnabled) || isFocused) {
      if (type === 'chat:completion' && data) {
        const { done, content, title } = data;

        if (done) {
          if (settings?.notificationSoundAlways ?? false) {
            setPlayingNotificationSound(true);

            const audio = new Audio(`/audio/notification.mp3`);
            audio.play().finally(() => {
              setPlayingNotificationSound(false);
            });
          }

          if (isLastActiveTab) {
            if (settings?.notificationEnabled ?? false) {
              new Notification(`${title} • Open WebUI`, {
                body: content,
                icon: `${WEBUI_BASE_URL}/static/favicon.png`
              });
            }
          }

          toast.info(title, {
            description: content,
            duration: 15000,
            action: {
              label: 'View',
              onClick: () => navigate(`/c/${event.chat_id}`)
            }
          });
        }
      } else if (type === 'chat:title') {
        setCurrentChatPage(1);
        const chatList = await getChatList(localStorage.token, 1);
        setChats(chatList);
      } else if (type === 'chat:tags') {
        const tags = await getAllTags(localStorage.token);
        setTags(tags);
      }
    } else if (event.data?.session_id === socket?.id && socket) {
      if (type === 'execute:python') {
        console.log('execute:python', data);
        if (cb) {
          cb({ error: 'Python execution not supported. Please configure Jupyter backend.' });
        }
      } else if (type === 'execute:tool' && data) {
        console.log('execute:tool', data);
        executeTool(data as ToolExecutionData, cb || (() => {}));
      } else if (type === 'request:chat:completion' && event.data) {
        console.log(data, socket.id);
        const { channel, form_data, model } = event.data as any;

        try {
          const directConnections = settings?.directConnections as any ?? {};

          if (directConnections) {
            const urlIdx = model?.urlIdx;

            const OPENAI_API_URL = directConnections.OPENAI_API_BASE_URLS?.[urlIdx];
            const OPENAI_API_KEY = directConnections.OPENAI_API_KEYS?.[urlIdx];
            const API_CONFIG = directConnections.OPENAI_API_CONFIGS?.[urlIdx];

            try {
              if (API_CONFIG?.prefix_id) {
                const prefixId = API_CONFIG.prefix_id;
                form_data['model'] = form_data['model'].replace(`${prefixId}.`, ``);
              }

              const [res] = await chatCompletion(
                OPENAI_API_KEY,
                form_data,
                OPENAI_API_URL
              );

              if (res) {
                if (!res.ok) {
                  throw await res.json();
                }

                if (form_data?.stream ?? false) {
                  if (cb) cb({ status: true });
                  console.log({ status: true });

                  const reader = res.body!.getReader();
                  const decoder = new TextDecoder();

                  const processStream = async () => {
                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) {
                        break;
                      }

                      const chunk = decoder.decode(value, { stream: true });
                      const lines = chunk.split('\n').filter((line: string) => line.trim() !== '');

                      for (const line of lines) {
                        console.log(line);
                        socket.emit(channel, line);
                      }
                    }
                  };

                  await processStream();
                } else {
                  const resData = await res.json();
                  if (cb) cb(resData);
                }
              } else {
                throw new Error('An error occurred while fetching the completion');
              }
            } catch (error) {
              console.error('chatCompletion', error);
              if (cb) cb(error);
            }
          }
        } catch (error) {
          console.error('chatCompletion', error);
          if (cb) cb(error);
        } finally {
          socket.emit(channel, {
            done: true
          });
        }
      } else {
        console.log('chatEventHandler', event);
      }
    }
  }, [location.pathname, chatId, temporaryChatEnabled, settings, isLastActiveTab, socket, setPlayingNotificationSound, setCurrentChatPage, setChats, setTags, executeTool, navigate]);

  // Channel event handler
  const channelEventHandler = useCallback(async (event: ChannelEventData) => {
    if (event.data?.type === 'typing') {
      return;
    }

    const channel = location.pathname.includes(`/channels/${event.channel_id}`);

    let isFocused = document.visibilityState !== 'visible';
    if ((window as any).electronAPI) {
      const res = await (window as any).electronAPI.send({
        type: 'window:isFocused'
      });
      if (res) {
        isFocused = res.isFocused;
      }
    }

    if ((!channel || isFocused) && event?.user?.id !== user?.id) {
      const type = event?.data?.type ?? null;
      const data = event?.data?.data ?? null;

      if (type === 'message') {
        if (isLastActiveTab) {
          if (settings?.notificationEnabled ?? false) {
            new Notification(`${data?.user?.name} (#${event?.channel?.name}) • Open WebUI`, {
              body: data?.content,
              icon: data?.user?.profile_image_url ?? `${WEBUI_BASE_URL}/static/favicon.png`
            });
          }
        }

        toast.info(`#${event?.channel?.name}`, {
          description: data?.content,
          duration: 15000,
          action: {
            label: 'View',
            onClick: () => navigate(`/channels/${event.channel_id}`)
          }
        });
      }
    }
  }, [location.pathname, user, isLastActiveTab, settings, navigate]);

  // Token expiry check
  const checkTokenExpiry = useCallback(async () => {
    const exp = user?.expires_at;
    const now = Math.floor(Date.now() / 1000);

    if (!exp) {
      return;
    }

    if (now >= exp - TOKEN_EXPIRY_BUFFER) {
      const res = await userSignOut();
      setUser(undefined);
      localStorage.removeItem('token');

      window.location.href = res?.redirect_url ?? '/auth';
    }
  }, [user, setUser]);

  // Initialize app
  useEffect(() => {
    const initialize = async () => {
      // Apply theme
      if (typeof window !== 'undefined' && (window as any).applyTheme) {
        (window as any).applyTheme();
      }

      // Check for Electron app
      if ((window as any)?.electronAPI) {
        const info = await (window as any).electronAPI.send({
          type: 'app:info'
        });

        if (info) {
          setIsApp(true);
          setAppInfo(info);
        }
      }

      // Setup BroadcastChannel for tab management
      bcRef.current = new BroadcastChannel('active-tab-channel');
      
      bcRef.current.onmessage = (event) => {
        if (event.data === 'active') {
          setIsLastActiveTab(false);
        }
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          setIsLastActiveTab(true);
          bcRef.current?.postMessage('active');
          checkTokenExpiry();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      handleVisibilityChange();

      // Set theme
      setTheme(localStorage.theme || 'system');

      // Set mobile
      setMobile(window.innerWidth < BREAKPOINT);

      const onResize = () => {
        setMobile(window.innerWidth < BREAKPOINT);
      };
      window.addEventListener('resize', onResize);

      // Initialize backend config
      let backendConfig = null;
      try {
        backendConfig = await getBackendConfig();
        console.log('Backend config:', backendConfig);
      } catch (error) {
        console.error('Error loading backend config:', error);
      }

      // Initialize i18n
      initI18n(localStorage?.locale);
      if (!localStorage.locale) {
        const languages = await getLanguages();
        const browserLanguages = navigator.languages
          ? navigator.languages
          : [navigator.language || (navigator as any).userLanguage];
        const lang = backendConfig?.default_locale
          ? backendConfig.default_locale
          : bestMatchingLanguage(languages.map(l => typeof l === 'string' ? l : l.code), Array.from(browserLanguages), 'en-US');
        changeLanguage(lang);
      }

      if (backendConfig) {
        await setConfig(backendConfig);
        await setWEBUI_NAME(backendConfig.name);

        // Socket setup is now handled in Layout.tsx
        // Authentication and model loading moved to Layout.tsx for better lifecycle management
      } else {
        navigate(`/error`);
      }

      setInitialized(true);

      return () => {
        window.removeEventListener('resize', onResize);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        if (bcRef.current) {
          bcRef.current.close();
        }
      };
    };

    initialize();
  }, []);

  // Setup socket event handlers when user changes
  useEffect(() => {
    if (user && socket) {
      socket.off('chat-events', chatEventHandler);
      socket.off('channel-events', channelEventHandler);

      socket.on('chat-events', chatEventHandler);
      socket.on('channel-events', channelEventHandler);

      // Set up token expiry check
      if (tokenTimerRef.current) {
        clearInterval(tokenTimerRef.current);
      }
      tokenTimerRef.current = setInterval(checkTokenExpiry, 15000);

      return () => {
        socket.off('chat-events', chatEventHandler);
        socket.off('channel-events', channelEventHandler);
        if (tokenTimerRef.current) {
          clearInterval(tokenTimerRef.current);
        }
      };
    }
  }, [user, socket, chatEventHandler, channelEventHandler, checkTokenExpiry]);

  if (!initialized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<ChatPage />} />
          <Route path="c/:id" element={<ChatPage />} />
          
          {/* Notes Routes */}
          <Route path="notes" element={<NotesPage />} />
          <Route path="notes/:id" element={<NoteEditorPage />} />
          
          {/* Channel Routes */}
          <Route path="channels/:id" element={<ChannelPage />} />
          
          {/* Playground Routes */}
          <Route path="playground" element={<PlaygroundPage />} />
          <Route path="playground/completions" element={<PlaygroundPage />} />
          
          {/* Workspace Routes */}
          <Route path="workspace" element={<WorkspaceLayout />}>
            <Route index element={<ModelsWorkspacePage />} />
            <Route path="models" element={<ModelsWorkspacePage />} />
            <Route path="models/create" element={<ModelsWorkspacePage />} />
            <Route path="models/edit" element={<ModelsWorkspacePage />} />
            <Route path="knowledge" element={<KnowledgeWorkspacePage />} />
            <Route path="knowledge/create" element={<KnowledgeWorkspacePage />} />
            <Route path="knowledge/:id" element={<KnowledgeWorkspacePage />} />
            <Route path="prompts" element={<PromptsWorkspacePage />} />
            <Route path="prompts/create" element={<PromptsWorkspacePage />} />
            <Route path="prompts/edit" element={<PromptsWorkspacePage />} />
            <Route path="tools" element={<ToolsWorkspacePage />} />
            <Route path="tools/create" element={<ToolsWorkspacePage />} />
            <Route path="tools/edit" element={<ToolsWorkspacePage />} />
          </Route>
          
          {/* Admin Routes */}
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="analytics/:tab" element={<AnalyticsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="users/:tab" element={<UsersPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="settings/:tab" element={<SettingsPage />} />
            <Route path="functions" element={<FunctionsPage />} />
            <Route path="functions/:action" element={<FunctionsPage />} />
            <Route path="evaluations" element={<EvaluationsPage />} />
            <Route path="evaluations/:tab" element={<EvaluationsPage />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
        
        {/* Auth and Error pages without sidebar */}
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/error" element={<ErrorPage />} />
        
        {/* Shared Chat page (standalone) */}
        <Route path="/s/:id" element={<SharedChatPage />} />
        
        {/* Watch page */}
        <Route path="/watch" element={<WatchPage />} />
      </Routes>
    </ErrorBoundary>
  );
}

function App() {
  const { theme } = useAppStore();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <I18nextProvider i18n={i18n}>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>

        <Toaster
          theme={theme.includes('dark')
            ? 'dark'
            : theme === 'system'
              ? window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'dark'
                : 'light'
              : 'light'}
          richColors
          position="top-right"
          closeButton
        />
      </I18nextProvider>
    </ThemeProvider>
  );
}

export default App;
