import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore } from '@/store';

interface PersonalizationProps {
  saveSettings: (settings: Record<string, unknown>) => Promise<void>;
  onSave: () => void;
}

export default function Personalization({ saveSettings, onSave }: PersonalizationProps) {
  const { t } = useTranslation();
  const { settings } = useAppStore();

  const [enableMemory, setEnableMemory] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);

  useEffect(() => {
    setEnableMemory(settings?.memory ?? false);
  }, []);

  const handleMemoryToggle = async (checked: boolean) => {
    setEnableMemory(checked);
    await saveSettings({ memory: checked });
  };

  const handleSave = async () => {
    onSave();
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full justify-between text-sm">
        <div className="space-y-4 overflow-y-auto max-h-[28rem] md:max-h-full py-1">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="text-sm font-medium cursor-help">
                    {t('Memory')}
                    <span className="text-xs text-gray-500 ml-2">({t('Experimental')})</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {t(
                      'This is an experimental feature, it may not function as expected and is subject to change at any time.'
                    )}
                  </p>
                </TooltipContent>
              </Tooltip>

              <Switch
                checked={enableMemory}
                onCheckedChange={handleMemoryToggle}
              />
            </div>

            <div className="text-xs text-gray-600 dark:text-gray-400">
              <div>
                {t(
                  "You can personalize your interactions with LLMs by adding memories through the 'Manage' button below, making them more helpful and tailored to you."
                )}
              </div>
            </div>

            <div className="mt-3 mb-1 ml-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowManageModal(true);
                }}
                className="rounded-full"
              >
                {t('Manage')}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-3">
          <Button
            onClick={handleSave}
            className="px-3.5 py-1.5 text-sm font-medium rounded-full"
          >
            {t('Save')}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}

