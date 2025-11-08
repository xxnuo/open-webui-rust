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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { userSignOut } from '@/lib/apis/auths';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { getChatList } from '@/lib/apis/chats';
import { NavGroup } from './NavGroup';
import type { NavGroup as NavGroupType } from './types';
import SettingsModal from '@/components/chat/SettingsModal';

export default function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, showSettings, setShowSettings } = useAppStore();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadChats();
  }, [user]);

  const loadChats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const chatList = await getChatList(token || '', 1, 50);
      setChats(chatList || []);
    } catch (error) {
      console.error('Failed to load chats:', error);
    } finally {
      setLoading(false);
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

  // Navigation groups - matching Svelte sidebar structure exactly
  const navGroups: NavGroupType[] = [];

  // Notes section (conditional based on config)
  const showNotes = 
    (useAppStore.getState().config?.features?.enable_notes ?? false) && 
    (user?.role === 'admin' || (user?.permissions?.features?.notes ?? true));

  if (showNotes) {
    navGroups.push({
      title: 'Notes',
      items: [
        { 
          title: 'Notes', 
          url: '/notes', 
          icon: BookOpen 
        },
      ],
    });
  }

  // Workspace section (conditional based on permissions)
  const showWorkspace = 
    user?.role === 'admin' || 
    user?.permissions?.workspace?.models || 
    user?.permissions?.workspace?.knowledge ||
    user?.permissions?.workspace?.prompts ||
    user?.permissions?.workspace?.tools;

  if (showWorkspace) {
    navGroups.push({
      title: 'Workspace',
      items: [
        {
          title: 'Workspace',
          icon: Wrench,
          items: [
            { 
              title: 'Models', 
              url: '/workspace/models', 
              icon: Zap 
            },
            {
              title: 'Knowledge',
              url: '/workspace/knowledge',
              icon: BookOpen
            },
            { 
              title: 'Prompts', 
              url: '/workspace/prompts', 
              icon: MessageSquare 
            },
            { 
              title: 'Tools', 
              url: '/workspace/tools', 
              icon: Wrench 
            },
          ],
        },
      ],
    });
  }

  // Channels section (conditional based on config)
  const showChannels = 
    (useAppStore.getState().config?.features?.enable_channels ?? false) && 
    (user?.role === 'admin' || useAppStore.getState().channels.length > 0);

  if (showChannels) {
    navGroups.push({
      title: 'Channels',
      items: [
        { 
          title: 'Channels', 
          url: '/channels', 
          icon: MessageSquare,
          badge: useAppStore.getState().channels.length > 0 ? useAppStore.getState().channels.length : undefined
        },
      ],
    });
  }

  // Folders section (for chat organization)
  navGroups.push({
    title: 'Folders',
    items: [
      { 
        title: 'Folders', 
        url: '/folders', 
        icon: Box,
      },
    ],
  });

  // Chats section (main chat list)
  navGroups.push({
    title: 'Chats',
    items: [
      { 
        title: 'Chats', 
        url: '/chats', 
        icon: MessageSquare,
        badge: chats.length > 0 ? chats.length : undefined
      },
    ],
  });

  // Note: Settings and Admin Panel are accessible from the user menu

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

      <SidebarContent>
        {navGroups.map((group) => (
          <NavGroup key={group.title} {...group} />
        ))}
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
