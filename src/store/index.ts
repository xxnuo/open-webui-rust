import { create } from 'zustand';
import type { Socket } from 'socket.io-client';
import { APP_NAME } from '@/lib/constants';

// Types
export type Model = OpenAIModel;

type BaseModel = {
  id: string;
  name: string;
  info?: {
    meta?: {
      hidden?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  owned_by: 'openai' | 'arena';
};

export interface OpenAIModel extends BaseModel {
  owned_by: 'openai';
  external: boolean;
  source?: string;
}

type Settings = {
  pinnedModels?: never[];
  toolServers?: ToolServer[];
  detectArtifacts?: boolean;
  showUpdateToast?: boolean;
  voiceInterruption?: boolean;
  collapseCodeBlocks?: boolean;
  expandDetails?: boolean;
  notificationSound?: boolean;
  notificationSoundAlways?: boolean;
  stylizedPdfExport?: boolean;
  notifications?: Record<string, unknown>;
  imageCompression?: boolean;
  imageCompressionSize?: number | string;
  widescreenMode?: null;
  largeTextAsFile?: boolean;
  promptAutocomplete?: boolean;
  hapticFeedback?: boolean;
  responseAutoCopy?: boolean | string;
  richTextInput?: boolean;
  params?: Record<string, unknown>;
  userLocation?: Record<string, unknown>;
  webSearch?: Record<string, unknown>;
  memory?: boolean;
  autoTags?: boolean;
  autoFollowUps?: boolean;
  splitLargeChunks?(body: unknown, splitLargeChunks: unknown): unknown;
  backgroundImageUrl?: null;
  landingPageMode?: string;
  iframeSandboxAllowForms?: boolean;
  iframeSandboxAllowSameOrigin?: boolean;
  scrollOnBranchChange?: boolean;
  directConnections?: Record<string, unknown>;
  chatBubble?: boolean;
  copyFormatted?: boolean;
  models?: string[];
  conversationMode?: boolean;
  speechAutoSend?: boolean;
  responseAutoPlayback?: boolean;
  audio?: AudioSettings;
  showUsername?: boolean;
  notificationEnabled?: boolean;
  highContrastMode?: boolean;
  title?: TitleSettings;
  showChatTitleInTab?: boolean;
  splitLargeDeltas?: boolean;
  chatDirection?: 'LTR' | 'RTL' | 'auto';
  ctrlEnterToSend?: boolean;

  system?: string;
  seed?: number;
  temperature?: string;
  repeat_penalty?: string;
  top_k?: string;
  top_p?: string;
  num_ctx?: string;
  num_batch?: string;
  num_keep?: string;
  options?: ModelOptions;
};

export type ToolServer = {
  url: string;
  auth_type?: string;
  key?: string;
  openapi?: Record<string, unknown>;
  info?: Record<string, unknown>;
  specs?: Record<string, unknown>;
};

type ModelOptions = {
  stop?: boolean;
};

type AudioSettings = {
  stt: Record<string, unknown>;
  tts: Record<string, unknown>;
  STTEngine?: string;
  TTSEngine?: string;
  speaker?: string;
  model?: string;
  nonLocalVoices?: boolean;
};

type TitleSettings = {
  auto?: boolean;
  model?: string;
  modelExternal?: string;
  prompt?: string;
};

type Prompt = {
  command: string;
  user_id: string;
  title: string;
  content: string;
  timestamp: number;
};

type Document = {
  collection_name: string;
  filename: string;
  name: string;
  title: string;
};

type Config = {
  license_metadata: Record<string, unknown>;
  status: boolean;
  name: string;
  version: string;
  default_locale: string;
  default_models: string;
  default_prompt_suggestions: PromptSuggestion[];
  features: {
    auth: boolean;
    auth_trusted_header: boolean;
    enable_api_key: boolean;
    enable_signup: boolean;
    enable_login_form: boolean;
    enable_web_search?: boolean;
    enable_google_drive_integration: boolean;
    enable_onedrive_integration: boolean;
    enable_image_generation: boolean;
    enable_admin_export: boolean;
    enable_admin_chat_access: boolean;
    enable_community_sharing: boolean;
    enable_autocomplete_generation: boolean;
    enable_direct_connections: boolean;
    enable_version_update_check: boolean;
    enable_websocket?: boolean;
  };
  oauth: {
    providers: {
      [key: string]: string;
    };
  };
  ui?: {
    pending_user_overlay_title?: string;
    pending_user_overlay_description?: string;
  };
};

type PromptSuggestion = {
  content: string;
  title: [string, string];
};

export type SessionUser = {
  permissions: Record<string, unknown>;
  id: string;
  email: string;
  name: string;
  role: string;
  profile_image_url: string;
  expires_at?: number;
  token?: string;
};

export type Banner = {
  id: string;
  type: string;
  title: string;
  content: string;
  dismissible: boolean;
  timestamp: number;
};

// Store interface
interface AppState {
  // Backend
  WEBUI_NAME: string;
  config: Config | undefined;
  user: SessionUser | undefined;

  // Electron App
  isApp: boolean;
  appInfo: Record<string, unknown> | null;
  appData: Record<string, unknown> | null;

  // Frontend
  MODEL_DOWNLOAD_POOL: Record<string, Record<string, unknown>>;
  mobile: boolean;
  socket: Socket | null;
  activeUserIds: string[] | null;
  USAGE_POOL: string[] | null;
  theme: string;
  TTSWorker: Worker | null;
  chatId: string;
  chatTitle: string;
  channels: Array<Record<string, unknown>>;
  chats: Record<string, unknown> | null;
  pinnedChats: Array<Record<string, unknown>>;
  tags: Array<Record<string, unknown>>;
  folders: Array<Record<string, unknown>>;
  selectedFolder: Record<string, unknown> | null;
  models: Model[];
  prompts: Prompt[] | null;
  knowledge: Document[] | null;
  tools: Record<string, unknown> | null;
  functions: Record<string, unknown> | null;
  toolServers: ToolServer[];
  banners: Banner[];
  settings: Settings;
  showSidebar: boolean;
  showSearch: boolean;
  showSettings: boolean;
  showShortcuts: boolean;
  showArchivedChats: boolean;
  showControls: boolean;
  showEmbeds: boolean;
  showOverview: boolean;
  showArtifacts: boolean;
  showCallOverlay: boolean;
  embed: Record<string, unknown> | null;
  artifactCode: Record<string, unknown> | null;
  temporaryChatEnabled: boolean;
  scrollPaginationEnabled: boolean;
  currentChatPage: number;
  isLastActiveTab: boolean;
  playingNotificationSound: boolean;

  // Actions
  setWEBUI_NAME: (name: string) => void;
  setConfig: (config: Config | undefined) => void;
  setUser: (user: SessionUser | undefined) => void;
  setIsApp: (isApp: boolean) => void;
  setAppInfo: (appInfo: Record<string, unknown> | null) => void;
  setAppData: (appData: Record<string, unknown> | null) => void;
  setMODEL_DOWNLOAD_POOL: (pool: Record<string, Record<string, unknown>>) => void;
  setMobile: (mobile: boolean) => void;
  setSocket: (socket: Socket | null) => void;
  setActiveUserIds: (ids: string[] | null) => void;
  setUSAGE_POOL: (pool: string[] | null) => void;
  setTheme: (theme: string) => void;
  setTTSWorker: (worker: Worker | null) => void;
  setChatId: (id: string) => void;
  setChatTitle: (title: string) => void;
  setChannels: (channels: Array<Record<string, unknown>>) => void;
  setChats: (chats: Record<string, unknown> | null) => void;
  setPinnedChats: (chats: Array<Record<string, unknown>>) => void;
  setTags: (tags: Array<Record<string, unknown>>) => void;
  setFolders: (folders: Array<Record<string, unknown>>) => void;
  setSelectedFolder: (folder: Record<string, unknown> | null) => void;
  setModels: (models: Model[]) => void;
  setPrompts: (prompts: Prompt[] | null) => void;
  setKnowledge: (knowledge: Document[] | null) => void;
  setTools: (tools: Record<string, unknown> | null) => void;
  setFunctions: (functions: Record<string, unknown> | null) => void;
  setToolServers: (servers: ToolServer[]) => void;
  setBanners: (banners: Banner[]) => void;
  setSettings: (settings: Settings) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  setShowSidebar: (show: boolean) => void;
  setShowSearch: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowShortcuts: (show: boolean) => void;
  setShowArchivedChats: (show: boolean) => void;
  setShowControls: (show: boolean) => void;
  setShowEmbeds: (show: boolean) => void;
  setShowOverview: (show: boolean) => void;
  setShowArtifacts: (show: boolean) => void;
  setShowCallOverlay: (show: boolean) => void;
  setEmbed: (embed: Record<string, unknown> | null) => void;
  setArtifactCode: (code: Record<string, unknown> | null) => void;
  setTemporaryChatEnabled: (enabled: boolean) => void;
  setScrollPaginationEnabled: (enabled: boolean) => void;
  setCurrentChatPage: (page: number) => void;
  setIsLastActiveTab: (isLast: boolean) => void;
  setPlayingNotificationSound: (playing: boolean) => void;
}

// Create store
export const useAppStore = create<AppState>((set) => ({
  // Initial state
  WEBUI_NAME: APP_NAME,
  config: undefined,
  user: undefined,
  isApp: false,
  appInfo: null,
  appData: null,
  MODEL_DOWNLOAD_POOL: {},
  mobile: false,
  socket: null,
  activeUserIds: null,
  USAGE_POOL: null,
  theme: typeof window !== 'undefined' ? localStorage.getItem('theme') || 'system' : 'system',
  TTSWorker: null,
  chatId: '',
  chatTitle: '',
  channels: [],
  chats: null,
  pinnedChats: [],
  tags: [],
  folders: [],
  selectedFolder: null,
  models: [],
  prompts: null,
  knowledge: null,
  tools: null,
  functions: null,
  toolServers: [],
  banners: [],
  settings: {},
  showSidebar: false,
  showSearch: false,
  showSettings: false,
  showShortcuts: false,
  showArchivedChats: false,
  showControls: false,
  showEmbeds: false,
  showOverview: false,
  showArtifacts: false,
  showCallOverlay: false,
  embed: null,
  artifactCode: null,
  temporaryChatEnabled: false,
  scrollPaginationEnabled: false,
  currentChatPage: 1,
  isLastActiveTab: true,
  playingNotificationSound: false,

  // Actions
  setWEBUI_NAME: (name) => set({ WEBUI_NAME: name }),
  setConfig: (config) => set({ config }),
  setUser: (user) => set({ user }),
  setIsApp: (isApp) => set({ isApp }),
  setAppInfo: (appInfo) => set({ appInfo }),
  setAppData: (appData) => set({ appData }),
  setMODEL_DOWNLOAD_POOL: (pool) => set({ MODEL_DOWNLOAD_POOL: pool }),
  setMobile: (mobile) => set({ mobile }),
  setSocket: (socket) => set({ socket }),
  setActiveUserIds: (ids) => set({ activeUserIds: ids }),
  setUSAGE_POOL: (pool) => set({ USAGE_POOL: pool }),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', theme);
    }
    set({ theme });
  },
  setTTSWorker: (worker) => set({ TTSWorker: worker }),
  setChatId: (id) => set({ chatId: id }),
  setChatTitle: (title) => set({ chatTitle: title }),
  setChannels: (channels) => set({ channels }),
  setChats: (chats) => set({ chats }),
  setPinnedChats: (chats) => set({ pinnedChats: chats }),
  setTags: (tags) => set({ tags }),
  setFolders: (folders) => set({ folders }),
  setSelectedFolder: (folder) => set({ selectedFolder: folder }),
  setModels: (models) => set({ models }),
  setPrompts: (prompts) => set({ prompts }),
  setKnowledge: (knowledge) => set({ knowledge }),
  setTools: (tools) => set({ tools }),
  setFunctions: (functions) => set({ functions }),
  setToolServers: (servers) => set({ toolServers: servers }),
  setBanners: (banners) => set({ banners }),
  setSettings: (settings) => set({ settings }),
  updateSettings: (newSettings) => set((state) => ({ settings: { ...state.settings, ...newSettings } })),
  setShowSidebar: (show) => set({ showSidebar: show }),
  setShowSearch: (show) => set({ showSearch: show }),
  setShowSettings: (show) => set({ showSettings: show }),
  setShowShortcuts: (show) => set({ showShortcuts: show }),
  setShowArchivedChats: (show) => set({ showArchivedChats: show }),
  setShowControls: (show) => set({ showControls: show }),
  setShowEmbeds: (show) => set({ showEmbeds: show }),
  setShowOverview: (show) => set({ showOverview: show }),
  setShowArtifacts: (show) => set({ showArtifacts: show }),
  setShowCallOverlay: (show) => set({ showCallOverlay: show }),
  setEmbed: (embed) => set({ embed }),
  setArtifactCode: (code) => set({ artifactCode: code }),
  setTemporaryChatEnabled: (enabled) => set({ temporaryChatEnabled: enabled }),
  setScrollPaginationEnabled: (enabled) => set({ scrollPaginationEnabled: enabled }),
  setCurrentChatPage: (page) => set({ currentChatPage: page }),
  setIsLastActiveTab: (isLast) => set({ isLastActiveTab: isLast }),
  setPlayingNotificationSound: (playing) => set({ playingNotificationSound: playing }),
}));

