import React, { useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Prompt {
  command: string;
  title: string;
  content?: string;
  [key: string]: any;
}

interface PromptsCommandProps {
  query: string;
  prompts: Prompt[];
  onSelect: (data: { type: string; data: any }) => void;
  selectedIdx: number;
  onSelectedIdxChange: (idx: number) => void;
}

export const PromptsCommand: React.FC<PromptsCommandProps> = ({
  query,
  prompts,
  onSelect,
  selectedIdx,
  onSelectedIdxChange,
}) => {
  const { t } = useTranslation();

  const filteredItems = useMemo(() => {
    return prompts
      .filter((p) => p.command.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [query, prompts]);

  useEffect(() => {
    if (query) {
      onSelectedIdxChange(0);
    }
  }, [query, onSelectedIdxChange]);

  return (
    <>
      <div className="px-2 text-xs text-gray-500 py-1">{t('Prompts')}</div>

      {filteredItems.length > 0 && (
        <div className="space-y-0.5">
          {filteredItems.map((promptItem, promptIdx) => (
            <TooltipProvider key={`${promptItem.command}-${promptIdx}`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-xl w-full text-left ${
                      promptIdx === selectedIdx
                        ? 'bg-gray-50 dark:bg-gray-800'
                        : ''
                    } truncate`}
                    onClick={() => onSelect({ type: 'prompt', data: promptItem })}
                    onMouseMove={() => onSelectedIdxChange(promptIdx)}
                    data-selected={promptIdx === selectedIdx}
                  >
                    <span className="font-medium text-black dark:text-gray-100">
                      {promptItem.command}
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-100 ml-2">
                      {promptItem.title}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>{promptItem.title}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      )}
    </>
  );
};

export default PromptsCommand;

