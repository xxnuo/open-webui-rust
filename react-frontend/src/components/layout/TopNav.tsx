import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAppStore } from '@/store';
import { Bell, Settings, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import ModelSelector from '@/components/chat/ModelSelector';

interface TopNavProps {
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;
  showModelSelector?: boolean;
}

export default function TopNav({ selectedModel, onModelChange, showModelSelector = true }: TopNavProps) {
  const navigate = useNavigate();
  const { user } = useAppStore();
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
      {/* Model Selector */}
      {showModelSelector && onModelChange && (
        <div className="flex-1 max-w-md">
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={onModelChange}
          />
        </div>
      )}

      <div className="flex items-center gap-2 ml-auto">
        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? (
            <Moon className="h-5 w-5" />
          ) : (
            <Sun className="h-5 w-5" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>

        {/* Settings */}
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <Settings className="h-5 w-5" />
        </Button>

        {/* User Avatar */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/profile')}
          className="rounded-full"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.profile_image_url} />
            <AvatarFallback>{user?.name?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Button>

        {/* Sidebar Toggle - Right Side */}
        <SidebarTrigger />
      </div>
    </header>
  );
}

