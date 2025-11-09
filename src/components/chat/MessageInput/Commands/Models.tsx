import React, { useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Fuse from 'fuse.js';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Model {
  id: string;
  name: string;
  value?: string;
  info?: {
    meta?: {
      profile_image_url?: string;
      hidden?: boolean;
      tags?: Array<{ name: string }>;
      description?: string;
    };
  };
}

interface ModelsCommandProps {
  query: string;
  models: Model[];
  onSelect: (data: { type: string; data: any }) => void;
  selectedIdx: number;
  onSelectedIdxChange: (idx: number) => void;
}

export const ModelsCommand: React.FC<ModelsCommandProps> = ({
  query,
  models,
  onSelect,
  selectedIdx,
  onSelectedIdxChange,
}) => {
  const { t } = useTranslation();

  const fuse = useMemo(() => {
    const items = models
      .filter((model) => !model?.info?.meta?.hidden)
      .map((model) => ({
        ...model,
        modelName: model.name,
        tags: model?.info?.meta?.tags?.map((tag) => tag.name).join(' ') || '',
        desc: model?.info?.meta?.description || '',
      }));

    return new Fuse(items, {
      keys: ['value', 'tags', 'modelName'],
      threshold: 0.5,
    });
  }, [models]);

  const filteredItems = useMemo(() => {
    return query
      ? fuse.search(query).map((e) => e.item)
      : models.filter((model) => !model?.info?.meta?.hidden);
  }, [query, fuse, models]);

  useEffect(() => {
    if (query) {
      onSelectedIdxChange(0);
    }
  }, [query, onSelectedIdxChange]);

  return (
    <>
      <div className="px-2 text-xs text-gray-500 py-1">{t('Models')}</div>

      {filteredItems.length > 0 && (
        <div>
          {filteredItems.map((model, modelIdx) => (
            <TooltipProvider key={model.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className={`px-2.5 py-1.5 rounded-xl w-full text-left ${
                      modelIdx === selectedIdx
                        ? 'bg-gray-50 dark:bg-gray-800'
                        : ''
                    }`}
                    onClick={() => onSelect({ type: 'model', data: model })}
                    onMouseMove={() => onSelectedIdxChange(modelIdx)}
                    data-selected={modelIdx === selectedIdx}
                  >
                    <div className="flex text-black dark:text-gray-100 line-clamp-1">
                      <img
                        src={model?.info?.meta?.profile_image_url || '/favicon.png'}
                        alt={model.name || model.id}
                        className="rounded-full size-5 items-center mr-2"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/favicon.png';
                        }}
                      />
                      <div className="truncate">{model.name}</div>
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent>{model.id}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      )}
    </>
  );
};

export default ModelsCommand;

