import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Settings as SettingsIcon,
  Cloud,
  Database,
  FileText,
  Globe,
  Image,
  Mic,
  Code,
  Wrench,
  BarChart3,
  Blocks,
  Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Settings Components (placeholders for now)
import General from './Settings/General';
import Connections from './Settings/Connections';
import Models from './Settings/Models';
import Evaluations from './Settings/Evaluations';
import Tools from './Settings/Tools';
import Documents from './Settings/Documents';
import WebSearch from './Settings/WebSearch';
import CodeExecution from './Settings/CodeExecution';
import Interface from './Settings/Interface';
import Audio from './Settings/Audio';
import Images from './Settings/Images';
import Pipelines from './Settings/Pipelines';
import DatabaseSettings from './Settings/Database';

export default function Settings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { tab } = useParams();

  const [selectedTab, setSelectedTab] = useState<string>('general');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Determine tab from URL
    const pathParts = location.pathname.split('/');
    const tabFromPath = pathParts[pathParts.length - 1];
    const validTabs = [
      'general',
      'connections',
      'models',
      'evaluations',
      'tools',
      'documents',
      'web',
      'code-execution',
      'interface',
      'audio',
      'images',
      'pipelines',
      'db'
    ];
    const newTab = validTabs.includes(tabFromPath) ? tabFromPath : 'general';
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
      id: 'general',
      label: t('General'),
      icon: <SettingsIcon className="h-4 w-4" />,
      path: '/admin/settings/general'
    },
    {
      id: 'connections',
      label: t('Connections'),
      icon: <Cloud className="h-4 w-4" />,
      path: '/admin/settings/connections'
    },
    {
      id: 'models',
      label: t('Models'),
      icon: <Database className="h-4 w-4" />,
      path: '/admin/settings/models'
    },
    {
      id: 'evaluations',
      label: t('Evaluations'),
      icon: <BarChart3 className="h-4 w-4" />,
      path: '/admin/settings/evaluations'
    },
    {
      id: 'tools',
      label: t('Tools'),
      icon: <Wrench className="h-4 w-4" />,
      path: '/admin/settings/tools'
    },
    {
      id: 'documents',
      label: t('Documents'),
      icon: <FileText className="h-4 w-4" />,
      path: '/admin/settings/documents'
    },
    {
      id: 'web',
      label: t('Web'),
      icon: <Globe className="h-4 w-4" />,
      path: '/admin/settings/web'
    },
    {
      id: 'code-execution',
      label: t('Code Execution'),
      icon: <Code className="h-4 w-4" />,
      path: '/admin/settings/code-execution'
    },
    {
      id: 'interface',
      label: t('Interface'),
      icon: <Blocks className="h-4 w-4" />,
      path: '/admin/settings/interface'
    },
    {
      id: 'audio',
      label: t('Audio'),
      icon: <Mic className="h-4 w-4" />,
      path: '/admin/settings/audio'
    },
    {
      id: 'images',
      label: t('Images'),
      icon: <Image className="h-4 w-4" />,
      path: '/admin/settings/images'
    },
    {
      id: 'pipelines',
      label: t('Pipelines'),
      icon: <Layers className="h-4 w-4" />,
      path: '/admin/settings/pipelines'
    },
    {
      id: 'db',
      label: t('Database'),
      icon: <Database className="h-4 w-4" />,
      path: '/admin/settings/db'
    }
  ];

  const renderContent = () => {
    switch (selectedTab) {
      case 'general':
        return <General />;
      case 'connections':
        return <Connections />;
      case 'models':
        return <Models />;
      case 'evaluations':
        return <Evaluations />;
      case 'tools':
        return <Tools />;
      case 'documents':
        return <Documents />;
      case 'web':
        return <WebSearch />;
      case 'code-execution':
        return <CodeExecution />;
      case 'interface':
        return <Interface />;
      case 'audio':
        return <Audio />;
      case 'images':
        return <Images />;
      case 'pipelines':
        return <Pipelines />;
      case 'db':
        return <DatabaseSettings />;
      default:
        return <General />;
    }
  };

  return (
    <div className="flex flex-col lg:flex-row w-full h-full pb-2 lg:space-x-4">
      {/* Tab Sidebar */}
      <div
        ref={containerRef}
        id="admin-settings-tabs-container"
        className="tabs mx-[16px] lg:mx-0 lg:px-[16px] flex flex-row overflow-x-auto gap-2.5 max-w-full lg:gap-1 lg:flex-col lg:flex-none lg:w-50 dark:text-gray-200 text-sm font-medium text-left scrollbar-none"
      >
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            id={tab.id}
            variant="ghost"
            className={cn(
              'px-0.5 py-1 min-w-fit rounded-lg flex-1 lg:flex-none flex justify-start transition',
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
        {renderContent()}
      </div>
    </div>
  );
}

