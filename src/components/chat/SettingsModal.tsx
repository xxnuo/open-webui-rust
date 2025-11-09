import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Settings as SettingsIcon,
  Palette,
  Link,
  User,
  Volume2,
  Database,
  Wrench,
  Search as SearchIcon,
  X,
} from 'lucide-react';

// Settings Components
import Account from './Settings/Account';
import General from './Settings/General';
import Interface from './Settings/Interface';
import Audio from './Settings/Audio';
import Connections from './Settings/Connections';
import Tools from './Settings/Tools';
import Personalization from './Settings/Personalization';
import DataControls from './Settings/DataControls';

import { useAppStore } from '@/store';
import { updateUserSettings } from '@/lib/apis/users';

interface SettingsTab {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
}

interface SettingsModalProps {
  show: boolean;
  onClose: () => void;
}

export default function SettingsModal({ show, onClose }: SettingsModalProps) {
  const { t } = useTranslation();
  const { user, config, settings: storeSettings, updateSettings } = useAppStore();
  const [selectedTab, setSelectedTab] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');

  // Debug log
  useEffect(() => {
    console.log('SettingsModal show state:', show);
  }, [show]);

  const allSettings: SettingsTab[] = [
    {
      id: 'general',
      title: t('General'),
      icon: SettingsIcon,
      keywords: ['general', 'settings', 'preferences', 'theme', 'language', 'system'],
    },
    {
      id: 'interface',
      title: t('Interface'),
      icon: Palette,
      keywords: ['interface', 'theme', 'appearance', 'ui', 'display', 'chat'],
    },
    {
      id: 'account',
      title: t('Account'),
      icon: User,
      keywords: ['account', 'profile', 'user', 'name', 'email', 'password', 'api', 'key'],
    },
    {
      id: 'audio',
      title: t('Audio'),
      icon: Volume2,
      keywords: ['audio', 'voice', 'tts', 'speech', 'sound', 'stt'],
    },
    {
      id: 'connections',
      title: t('Connections'),
      icon: Link,
      keywords: ['connections', 'api', 'openai', 'external', 'direct'],
    },
    {
      id: 'tools',
      title: t('External Tools'),
      icon: Wrench,
      keywords: ['tools', 'functions', 'plugins', 'servers'],
    },
    {
      id: 'personalization',
      title: t('Personalization'),
      icon: User,
      keywords: ['personalization', 'custom', 'preferences', 'memory'],
    },
    {
      id: 'data_controls',
      title: t('Data Controls'),
      icon: Database,
      keywords: ['data', 'controls', 'export', 'import', 'delete', 'archive', 'chats'],
    },
  ];

  const filteredSettings = searchQuery
    ? allSettings.filter((setting) =>
        setting.keywords.some((keyword) =>
          keyword.toLowerCase().includes(searchQuery.toLowerCase())
        ) ||
        setting.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allSettings;

  useEffect(() => {
    if (show) {
      // Reset search when modal opens
      setSearchQuery('');
    }
  }, [show]);

  const saveSettings = async (settings: Record<string, unknown>) => {
    try {
      const token = localStorage.getItem('token') || '';
      console.log('Saving settings:', settings);
      
      // Update local store
      updateSettings(settings);
      
      // Persist to backend
      await updateUserSettings(token, settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  };

  const renderContent = () => {
    switch (selectedTab) {
      case 'general':
        return (
          <General
            saveSettings={saveSettings}
            onSave={() => {
              toast.success(t('Settings saved successfully!'));
            }}
          />
        );
      case 'interface':
        return (
          <Interface
            saveSettings={saveSettings}
            onSave={() => {
              toast.success(t('Settings saved successfully!'));
            }}
          />
        );
      case 'account':
        return (
          <Account
            config={config}
            saveHandler={() => {
              toast.success(t('Settings saved successfully!'));
            }}
          />
        );
      case 'audio':
        return (
          <Audio
            saveSettings={saveSettings}
            onSave={() => {
              toast.success(t('Settings saved successfully!'));
            }}
          />
        );
      case 'connections':
        return (
          <Connections
            saveSettings={async (updated) => {
              await saveSettings(updated);
              toast.success(t('Settings saved successfully!'));
            }}
          />
        );
      case 'tools':
        return (
          <Tools
            saveSettings={async (updated) => {
              await saveSettings(updated);
              toast.success(t('Settings saved successfully!'));
            }}
          />
        );
      case 'personalization':
        return (
          <Personalization
            saveSettings={saveSettings}
            onSave={() => {
              toast.success(t('Settings saved successfully!'));
            }}
          />
        );
      case 'data_controls':
        return <DataControls saveSettings={saveSettings} />;
      default:
        return (
          <General
            saveSettings={saveSettings}
            onSave={() => {
              toast.success(t('Settings saved successfully!'));
            }}
          />
        );
    }
  };

  return (
    <Dialog open={show} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[min(800px,92vw)]! w-[min(800px,92vw)]! h-[90vh] max-h-[900px] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-8 pt-6 pb-5 shrink-0 border-b">
          <DialogTitle className="text-2xl font-semibold">{t('Settings')}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Sidebar */}
          <div className="w-[240px] md:w-[260px] border-r flex flex-col shrink-0 bg-muted/20">
            <div className="px-3 md:px-4 py-4">
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('Search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-9 text-sm h-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1 px-2 md:px-3">
              <div className="space-y-1 py-2 pb-4">
                {filteredSettings.map((setting) => {
                  const Icon = setting.icon;
                  return (
                    <Button
                      key={setting.id}
                      variant="ghost"
                      className={cn(
                        'w-full justify-start gap-3 px-3 h-10 text-sm font-medium',
                        selectedTab === setting.id &&
                          'bg-accent text-accent-foreground'
                      )}
                      onClick={() => setSelectedTab(setting.id)}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{setting.title}</span>
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            <ScrollArea className="flex-1 h-full">
              <div className="px-8 md:px-12 lg:px-16 py-8 md:py-10 min-w-0">
                <div className="w-full max-w-5xl">
                  {renderContent()}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

