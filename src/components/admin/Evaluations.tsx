import { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FileBarChart, FileText } from 'lucide-react';
import Leaderboard from './Evaluations/Leaderboard';
import Feedbacks from './Evaluations/Feedbacks';
import { getAllFeedbacks } from '@/lib/apis/evaluations';

export default function Evaluations() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedTab, setSelectedTab] = useState<string>('leaderboard');
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadFeedbacks = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await getAllFeedbacks(token);
      if (res) {
        setFeedbacks(res);
      }
      setLoaded(true);
    };

    loadFeedbacks();
  }, []);

  useEffect(() => {
    // Determine tab from URL
    const pathParts = location.pathname.split('/');
    const tabFromPath = pathParts[pathParts.length - 1];
    const newTab = ['leaderboard', 'feedbacks'].includes(tabFromPath) ? tabFromPath : 'leaderboard';
    setSelectedTab(newTab);
  }, [location.pathname]);

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
      id: 'leaderboard',
      label: t('Leaderboard'),
      icon: <FileBarChart className="h-4 w-4" />,
      path: '/admin/evaluations/leaderboard'
    },
    {
      id: 'feedbacks',
      label: t('Feedbacks'),
      icon: <FileText className="h-4 w-4" />,
      path: '/admin/evaluations/feedbacks'
    }
  ];

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">{t('Loading...')}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row w-full h-full pb-2 lg:space-x-4">
      {/* Tab Sidebar */}
      <div
        ref={containerRef}
        id="users-tabs-container"
        className="tabs mx-[16px] lg:mx-0 lg:px-[16px] flex flex-row overflow-x-auto gap-2.5 max-w-full lg:gap-1 lg:flex-col lg:flex-none lg:w-50 dark:text-gray-200 text-sm font-medium text-left scrollbar-none"
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
        {selectedTab === 'leaderboard' && <Leaderboard feedbacks={feedbacks} />}
        {selectedTab === 'feedbacks' && <Feedbacks feedbacks={feedbacks} onUpdate={(updated) => setFeedbacks(updated)} />}
      </div>
    </div>
  );
}
