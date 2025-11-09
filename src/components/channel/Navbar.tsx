import React from 'react';
import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ChannelNavbarProps {
  channel: {
    id: string;
    name: string;
    [key: string]: any;
  };
  showSidebar?: boolean;
  onToggleSidebar?: () => void;
  userImageUrl?: string;
}

export const ChannelNavbar: React.FC<ChannelNavbarProps> = ({
  channel,
  showSidebar = true,
  onToggleSidebar,
  userImageUrl,
}) => {
  const { t } = useTranslation();

  return (
    <nav className="sticky top-0 z-30 w-full px-1.5 py-1.5 -mb-8 flex items-center">
      <div className="bg-gradient-to-b from-white via-white to-transparent dark:from-gray-900 dark:via-gray-900 dark:to-transparent pointer-events-none absolute inset-0 -bottom-7 z-[-1]" />

      <div className="flex max-w-full w-full mx-auto px-1 pt-0.5 bg-transparent">
        <div className="flex items-center w-full max-w-full">
          {onToggleSidebar && (
            <div className="mr-1.5 mt-0.5 self-start flex flex-none items-center text-gray-600 dark:text-gray-400">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={onToggleSidebar}
                      className="cursor-pointer flex rounded-lg hover:bg-gray-100 dark:hover:bg-gray-850 transition p-1.5"
                      aria-label={showSidebar ? t('Close Sidebar') : t('Open Sidebar')}
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showSidebar ? t('Close Sidebar') : t('Open Sidebar')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          <div className={`flex-1 overflow-hidden max-w-full py-0.5 ${showSidebar ? 'ml-1' : ''}`}>
            {channel && (
              <div className="line-clamp-1 capitalize font-medium text-lg">
                {channel.name}
              </div>
            )}
          </div>

          {userImageUrl && (
            <div className="self-start flex flex-none items-center text-gray-600 dark:text-gray-400">
              <button
                className="select-none flex rounded-xl p-1.5 w-full hover:bg-gray-50 dark:hover:bg-gray-850 transition"
                aria-label={t('User Menu')}
              >
                <img
                  src={userImageUrl}
                  className="size-6 object-cover rounded-full"
                  alt={t('User profile')}
                  draggable="false"
                />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default ChannelNavbar;

