import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarProvider,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquarePlus,
  Box,
  MessageSquare,
  Settings,
  Search,
  Moon,
  Sun,
  Monitor,
  Globe,
  LogOut,
  User,
  Wrench,
  BookOpen,
  Zap,
  Shield,
  ChevronsUpDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTimeRange } from '@/lib/utils';
import { userSignOut } from '@/lib/apis/auths';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { getChatList } from '@/lib/apis/chats';
import { getFolders } from '@/lib/apis/folders';
import { NavGroup } from './NavGroup';
import type { NavGroup as NavGroupType } from './types';
import SettingsModal from '@/components/chat/SettingsModal';
import Folder from '@/components/common/Folder';
import ChatItem from './Sidebar/ChatItem';
import RecursiveFolder from './Sidebar/RecursiveFolder';

export default function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, showSettings, setShowSettings } = useAppStore();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  
  const [chats, setChats] = useState<any[]>([]);
  const [folders, setFolders] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadChats();
      loadFolders();
    }
  }, [user]);

  const loadChats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const chatList = await getChatList(token || '', 1, 50);
      // Add time_range to each chat
      const chatsWithTimeRange = (chatList || []).map((chat: any) => ({
        ...chat,
        time_range: getTimeRange(chat.updated_at)
      }));
      setChats(chatsWithTimeRange);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFolders = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      const folderList = await getFolders(token || '');
      
      // Convert folder array to folder map with hierarchy
      const folderMap: Record<string, any> = {};
      
      // First pass: Initialize all folders
      for (const folder of folderList || []) {
        folderMap[folder.id] = { ...folder };
      }
      
      // Second pass: Build parent-child relationships
      for (const folder of folderList || []) {
        if (folder.parent_id && folderMap[folder.parent_id]) {
          if (!folderMap[folder.parent_id].childrenIds) {
            folderMap[folder.parent_id].childrenIds = [];
          }
          folderMap[folder.parent_id].childrenIds.push(folder.id);
        }
      }
      
      setFolders(folderMap);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const handleNewChat = () => {
    navigate('/');
  };

  const handleSignOut = async () => {
    try {
      await userSignOut();
      localStorage.removeItem('token');
      setUser(undefined);
      navigate('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('locale', lang);
  };

  // Group chats by time range
  const groupedChats = chats.reduce((groups: Record<string, any[]>, chat) => {
    const timeRange = chat.time_range || 'Other';
    if (!groups[timeRange]) {
      groups[timeRange] = [];
    }
    groups[timeRange].push(chat);
    return groups;
  }, {});

  return (
    <>
    <Sidebar collapsible='icon' variant='sidebar'>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              size="lg" 
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
              onClick={() => navigate('/')}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                <img src="/logo.svg" alt="Open WebUI" className="size-8" />
              </div>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-semibold">Open WebUI + Rust</span>
                <span className="truncate text-xs">shadcn/ui: Vite + React</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="New Chat" onClick={handleNewChat}>
              <MessageSquarePlus className="size-4" />
              <span>New Chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Search"
              variant="outline"
              onClick={() => toast.info('Search coming soon!')}
            >
              <Search className="size-4" />
              <span className="flex-1 text-left">Search...</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="flex flex-col gap-2 overflow-y-auto">
        {/* Folders Section */}
        <div className="px-2">
          <Folder 
            name={t('Folders')}
            open={true}
            buttonClassName="text-gray-600 dark:text-gray-400"
          >
            {Object.keys(folders).length > 0 ? (
              <div className="ml-3 pl-1 mt-[1px] flex flex-col border-l border-gray-100 dark:border-gray-900">
                {/* Only render root folders (parent_id === null) */}
                {Object.values(folders)
                  .filter((folder: any) => folder.parent_id === null)
                  .sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
                  .map((folder: any) => (
                    <RecursiveFolder
                      key={folder.id}
                      folder={folder}
                      folders={folders}
                      onChange={() => {
                        loadFolders();
                        loadChats();
                      }}
                    />
                  ))}
              </div>
            ) : (
              <div className="ml-3 pl-1 py-2 text-xs text-gray-500">
                {t('No folders')}
              </div>
            )}
          </Folder>
        </div>

        {/* Chats Section */}
        <div className="flex-1 flex flex-col overflow-y-auto px-2">
          <Folder 
            name={`${t('Chats')} ${chats.length > 0 ? chats.length : ''}`}
            open={true}
            buttonClassName="text-gray-600 dark:text-gray-400"
          >
            <div className="pt-1.5">
              {Object.keys(groupedChats).length > 0 ? (
                Object.keys(groupedChats).map((timeRange, groupIndex) => (
                  <div key={timeRange}>
                    {/* Time Range Header */}
                    <div className={cn(
                      'w-full pl-2.5 text-xs text-gray-500 dark:text-gray-500 font-medium pb-1.5',
                      groupIndex === 0 ? '' : 'pt-5'
                    )}>
                      {t(timeRange)}
                    </div>

                    {/* Chat Items */}
                    {groupedChats[timeRange].map((chat: any) => (
                      <ChatItem
                        key={chat.id}
                        id={chat.id}
                        title={chat.title}
                        onChange={() => {
                          loadChats();
                          loadFolders();
                        }}
                      />
                    ))}
                  </div>
                ))
              ) : (
                <div className="pl-2.5 py-2 text-xs text-gray-500">
                  {loading ? t('Loading...') : t('No chats')}
                </div>
              )}
            </div>
          </Folder>
        </div>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user?.profile_image_url} />
                    <AvatarFallback className="rounded-lg">{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {user?.name}
                    </span>
                    <span className="truncate text-xs">{user?.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side="right"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={user?.profile_image_url} />
                      <AvatarFallback className="rounded-lg">{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-start text-sm leading-tight">
                      <span className="truncate font-semibold">{user?.name}</span>
                      <span className="truncate text-xs">{user?.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
            
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            
            <DropdownMenuItem onClick={() => setShowSettings(true)}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            
            {user?.role === 'admin' && (
              <DropdownMenuItem onClick={() => navigate('/admin')}>
                <Shield className="mr-2 h-4 w-4" />
                Admin Panel
              </DropdownMenuItem>
            )}
            
            <DropdownMenuSeparator />
            
            {/* Theme Selector */}
            <DropdownMenuLabel className="text-xs">Theme</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleThemeChange('light')}>
              <Sun className="mr-2 h-4 w-4" />
              Light
              {theme === 'light' && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
              <Moon className="mr-2 h-4 w-4" />
              Dark
              {theme === 'dark' && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleThemeChange('system')}>
              <Monitor className="mr-2 h-4 w-4" />
              System
              {theme === 'system' && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            {/* Language Selector */}
            <DropdownMenuLabel className="text-xs">Language</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleLanguageChange('en-US')}>
              <Globe className="mr-2 h-4 w-4" />
              English
              {i18n.language === 'en-US' && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleLanguageChange('zh-CN')}>
              <Globe className="mr-2 h-4 w-4" />
              中文
              {i18n.language === 'zh-CN' && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
    
    {/* User Settings Modal */}
    <SettingsModal
      show={showSettings}
      onClose={() => setShowSettings(false)}
    />
    </>
  );
}
