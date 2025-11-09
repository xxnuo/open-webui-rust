import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users as UsersIcon, UsersRound } from 'lucide-react';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import UserList from './Users/UserList';
import Groups from './Users/Groups';

export default function Users() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { tab } = useParams();
  const { user } = useAppStore();

  const [selectedTab, setSelectedTab] = useState<string>('overview');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }

    // Determine tab from URL
    const pathParts = location.pathname.split('/');
    const tabFromPath = pathParts[pathParts.length - 1];
    const newTab = ['overview', 'groups'].includes(tabFromPath) ? tabFromPath : 'overview';
    setSelectedTab(newTab);
  }, [location.pathname, user, navigate]);

  useEffect(() => {
    // Handle horizontal scroll with mouse wheel
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY !== 0) {
        container.scrollLeft += event.deltaY;
      }
    };

    container.addEventListener('wheel', handleWheel);
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    // Scroll to selected tab
    const tabElement = document.getElementById(selectedTab);
    if (tabElement) {
      tabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
    }
  }, [selectedTab]);

  const tabs = [
    {
      id: 'overview',
      label: t('Overview'),
      icon: <UsersIcon className="h-4 w-4" />,
      path: '/admin/users/overview'
    },
    {
      id: 'groups',
      label: t('Groups'),
      icon: <UsersRound className="h-4 w-4" />,
      path: '/admin/users/groups'
    }
  ];

  return (
    <div className="flex flex-col lg:flex-row w-full h-full pb-2 lg:space-x-4">
      {/* Tab Sidebar */}
      <div
        ref={containerRef}
        id="users-tabs-container"
        className="mx-[16px] lg:mx-0 lg:px-[16px] flex flex-row overflow-x-auto gap-2.5 max-w-full lg:gap-1 lg:flex-col lg:flex-none lg:w-50 dark:text-gray-200 text-sm font-medium text-left scrollbar-none"
      >
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            id={tab.id}
            variant="ghost"
            className={cn(
              'px-0.5 py-1 min-w-fit rounded-lg lg:flex-none flex justify-start transition',
              selectedTab === tab.id
                ? ''
                : 'text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-white'
            )}
            onClick={() => navigate(tab.path)}
          >
            <div className="self-center mr-2">{tab.icon}</div>
            <div className="self-center">{tab.label}</div>
          </Button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 mt-1 lg:mt-0 px-[16px] lg:pr-[16px] lg:pl-0 overflow-y-scroll">
        {selectedTab === 'overview' && <UserList />}
        {selectedTab === 'groups' && <Groups />}
      </div>
    </div>
  );
}







