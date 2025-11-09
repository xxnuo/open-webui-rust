import { useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Settings, Archive, LogOut, Code, Users } from 'lucide-react';
import { userSignOut } from '@/lib/apis/auths';
import { useAppStore } from '@/store';
import { toast } from 'sonner';

interface UserMenuProps {
  role?: string;
  children: ReactNode;
}

export default function UserMenu({ role, children }: UserMenuProps) {
  const navigate = useNavigate();
  const { 
    setUser, 
    setShowSettings, 
    setShowArchivedChats, 
    mobile, 
    setShowSidebar 
  } = useAppStore();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      const res = await userSignOut();
      setUser(undefined);
      localStorage.removeItem('token');
      
      const redirectUrl = res?.redirect_url ?? '/auth';
      window.location.href = redirectUrl;
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  const handleMenuItemClick = async (action: () => void) => {
    setOpen(false);
    action();
    
    if (mobile) {
      await new Promise(resolve => setTimeout(resolve, 0));
      setShowSidebar(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="start" 
        className="w-full max-w-[240px] rounded-2xl px-1 py-1 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-850 dark:text-white shadow-lg text-sm"
        sideOffset={4}
      >
        <DropdownMenuItem
          className="flex rounded-xl py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
          onClick={() => handleMenuItemClick(() => setShowSettings(true))}
        >
          <div className="self-center mr-3">
            <Settings className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="self-center truncate">Settings</div>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="flex rounded-xl py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
          onClick={() => handleMenuItemClick(() => setShowArchivedChats(true))}
        >
          <div className="self-center mr-3">
            <Archive className="size-5" strokeWidth={1.5} />
          </div>
          <div className="self-center truncate">Archived Chats</div>
        </DropdownMenuItem>

        {role === 'admin' && (
          <>
            <DropdownMenuItem
              className="flex rounded-xl py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
              onClick={() => handleMenuItemClick(() => navigate('/playground'))}
            >
              <div className="self-center mr-3">
                <Code className="size-5" strokeWidth={1.5} />
              </div>
              <div className="self-center truncate">Playground</div>
            </DropdownMenuItem>
            
            <DropdownMenuItem
              className="flex rounded-xl py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
              onClick={() => handleMenuItemClick(() => navigate('/admin'))}
            >
              <div className="self-center mr-3">
                <Users className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div className="self-center truncate">Admin Panel</div>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator className="border-gray-50 dark:border-gray-800 my-1 p-0" />

        <DropdownMenuItem
          className="flex rounded-xl py-1.5 px-3 w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
          onClick={() => handleMenuItemClick(handleSignOut)}
        >
          <div className="self-center mr-3">
            <LogOut className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="self-center truncate">Sign Out</div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

