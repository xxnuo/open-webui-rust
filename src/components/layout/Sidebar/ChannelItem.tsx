import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store';
import HashtagIcon from '@/components/icons/HashtagIcon';
import LockIcon from '@/components/icons/LockIcon';

interface Channel {
  id: string;
  name: string;
  access_control: any;
}

interface ChannelItemProps {
  channel: Channel;
  onUpdate?: () => void;
  className?: string;
}

export default function ChannelItem({ 
  channel, 
  onUpdate = () => {},
  className = '' 
}: ChannelItemProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { mobile, setShowSidebar, user } = useAppStore();

  const isActive = location.pathname === `/channels/${channel.id}`;

  const handleClick = () => {
    navigate(`/channels/${channel.id}`);
    if (mobile) {
      setShowSidebar(false);
    }
  };

  return (
    <div
      id="sidebar-channel-item"
      className={`w-full ${className} rounded-xl flex relative group hover:bg-gray-100 dark:hover:bg-gray-900 ${
        isActive ? 'bg-gray-100 dark:bg-gray-900 selected' : ''
      } px-2.5 py-1`}
    >
      <a
        className="w-full flex justify-between cursor-pointer"
        onClick={(e) => {
          e.preventDefault();
          handleClick();
        }}
        draggable="false"
      >
        <div className="flex items-center gap-1 shrink-0">
          <div className="size-4 justify-center flex items-center">
            {channel?.access_control === null ? (
              <HashtagIcon className="size-3" strokeWidth="2.5" />
            ) : (
              <LockIcon className="size-[15px]" strokeWidth="2" />
            )}
          </div>

          <div className="text-left self-center overflow-hidden w-full line-clamp-1 flex-1">
            {channel.name}
          </div>
        </div>
      </a>

      {/* TODO: Add channel settings button for admin */}
      {/* {user?.role === 'admin' && (
        <button
          className="absolute z-10 right-2 invisible group-hover:visible self-center flex items-center dark:text-gray-300"
          onClick={(e) => {
            e.stopPropagation();
            // showEditChannelModal = true;
          }}
        >
          <button className="p-0.5 dark:hover:bg-gray-850 rounded-lg touch-auto">
            <SettingsIcon className="size-3.5" />
          </button>
        </button>
      )} */}
    </div>
  );
}

