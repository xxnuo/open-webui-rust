import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import Fuse from 'fuse.js';
import { Database, FileText, Globe, Youtube } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface KnowledgeItem {
  id: string;
  name: string;
  description?: string;
  type?: string;
  meta?: any;
  files?: any[];
  legacy?: boolean;
  collection_names?: string[];
}

interface KnowledgeCommandProps {
  query: string;
  knowledge: KnowledgeItem[];
  onSelect: (data: { type: string; data: any }) => void;
  selectedIdx: number;
  onSelectedIdxChange: (idx: number) => void;
}

const isValidHttpUrl = (str: string): boolean => {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const isYoutubeUrl = (str: string): boolean => {
  return /youtube\.com|youtu\.be/.test(str);
};

const decodeString = (str: string): string => {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
};

export const KnowledgeCommand: React.FC<KnowledgeCommandProps> = ({
  query,
  knowledge,
  onSelect,
  selectedIdx,
  onSelectedIdxChange,
}) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [fuse, setFuse] = useState<Fuse<any> | null>(null);

  useEffect(() => {
    const legacyDocuments = knowledge
      .filter((item) => item?.meta?.document)
      .map((item) => ({ ...item, type: 'file' }));

    const legacyCollections: any[] = legacyDocuments.length > 0
      ? [
          {
            name: 'All Documents',
            legacy: true,
            type: 'collection',
            description: 'Deprecated (legacy collection), please create a new knowledge base.',
            collection_names: legacyDocuments.map((item) => item.id),
          },
        ]
      : [];

    const collections = knowledge
      .filter((item) => !item?.meta?.document)
      .map((item) => ({ ...item, type: 'collection' }));

    const collectionFiles = knowledge.length > 0
      ? knowledge
          .reduce((acc: any[], item) => {
            const files = (item?.files ?? []).map((file: any) => ({
              ...file,
              collection: { name: item.name, description: item.description },
            }));
            return [...acc, ...files];
          }, [])
          .map((file: any) => ({
            ...file,
            name: file?.meta?.name,
            description: `${file?.collection?.name} - ${file?.collection?.description}`,
            knowledge: true,
            type: 'file',
          }))
      : [];

    const allItems = [...collections, ...collectionFiles, ...legacyCollections, ...legacyDocuments].map(
      (item) => ({
        ...item,
        ...(item?.legacy || item?.meta?.legacy || item?.meta?.document ? { legacy: true } : {}),
      })
    );

    setItems(allItems);
    setFuse(new Fuse(allItems, { keys: ['name', 'description'] }));
  }, [knowledge]);

  const filteredItems = useMemo(() => {
    const baseItems = fuse && query
      ? fuse.search(query).map((e) => e.item)
      : items;

    const urlItems = query.startsWith('http')
      ? isYoutubeUrl(query)
        ? [{ type: 'youtube', name: query, description: query }]
        : [{ type: 'web', name: query, description: query }]
      : [];

    return [...baseItems, ...urlItems];
  }, [fuse, query, items]);

  const handleSelect = (item: any) => {
    if (item.type === 'youtube' || item.type === 'web') {
      if (isValidHttpUrl(query)) {
        onSelect({ type: item.type, data: query });
      } else {
        toast.error(t('Oops! Looks like the URL is invalid. Please double-check and try again.'));
      }
    } else {
      onSelect({ type: 'knowledge', data: item });
    }
  };

  useEffect(() => {
    if (query) {
      onSelectedIdxChange(0);
    }
  }, [query, onSelectedIdxChange]);

  return (
    <>
      <div className="px-2 text-xs text-gray-500 py-1">{t('Knowledge')}</div>

      {filteredItems.length > 0 || query.startsWith('http') ? (
        <div>
          {filteredItems.map((item, idx) => (
            <button
              key={`${item.type}-${item.name}-${idx}`}
              type="button"
              className={`px-2 py-1 rounded-xl w-full text-left flex justify-between items-center ${
                idx === selectedIdx
                  ? 'bg-gray-50 dark:bg-gray-800 dark:text-gray-100'
                  : ''
              }`}
              onClick={() => handleSelect(item)}
              onMouseMove={() => onSelectedIdxChange(idx)}
              data-selected={idx === selectedIdx}
            >
              <div className="text-black dark:text-gray-100 flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      {item.type === 'collection' ? (
                        <Database className="size-4" />
                      ) : item.type === 'youtube' ? (
                        <Youtube className="size-4" />
                      ) : item.type === 'web' ? (
                        <Globe className="size-4" />
                      ) : (
                        <FileText className="size-4" />
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      {item.legacy
                        ? t('Legacy')
                        : item.type === 'file'
                          ? t('File')
                          : item.type === 'collection'
                            ? t('Collection')
                            : item.type === 'youtube'
                              ? t('YouTube')
                              : item.type === 'web'
                                ? t('Web')
                                : ''}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="line-clamp-1 flex-1">{decodeString(item.name)}</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {item.description || decodeString(item.name)}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
};

export default KnowledgeCommand;

