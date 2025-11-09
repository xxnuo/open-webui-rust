import { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface Prompt {
  id: string;
  command: string;
  title: string;
  content: string;
}

interface Knowledge {
  id: string;
  name: string;
  description?: string;
}

interface Model {
  id: string;
  name: string;
  info?: {
    meta?: {
      description?: string;
    };
  };
}

interface CommandSuggestionListProps {
  char: '/' | '#' | '@';
  query: string;
  prompts?: Prompt[];
  knowledge?: Knowledge[];
  models?: Model[];
  onSelect: (data: { type: string; data: any }) => void;
  onUpload?: (data: { type: string; data: any }) => void;
  insertTextHandler?: (text: string) => void;
}

export interface CommandSuggestionListHandle {
  selectUp: () => void;
  selectDown: () => void;
  select: () => void;
}

const CommandSuggestionList = forwardRef<CommandSuggestionListHandle, CommandSuggestionListProps>(
  ({ char, query, prompts = [], knowledge = [], models = [], onSelect, onUpload, insertTextHandler }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [filteredItems, setFilteredItems] = useState<any[]>([]);
    const [loading] = useState(false);

    useEffect(() => {
      const lowerQuery = query.toLowerCase();
      let items: any[] = [];

      if (char === '/') {
        items = prompts.filter(
          (p) =>
            p.command.toLowerCase().includes(lowerQuery) ||
            p.title.toLowerCase().includes(lowerQuery)
        );
      } else if (char === '#') {
        items = knowledge.filter(
          (k) =>
            k.name.toLowerCase().includes(lowerQuery) ||
            (k.description?.toLowerCase().includes(lowerQuery) ?? false)
        );
      } else if (char === '@') {
        items = models.filter(
          (m) =>
            m.name.toLowerCase().includes(lowerQuery) ||
            m.id.toLowerCase().includes(lowerQuery)
        );
      }

      setFilteredItems(items);
      setSelectedIndex(0);
    }, [char, query, prompts, knowledge, models]);

    useImperativeHandle(ref, () => ({
      selectUp: () => {
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
      },
      selectDown: () => {
        setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
      },
      select: () => {
        if (filteredItems[selectedIndex]) {
          handleSelect(filteredItems[selectedIndex]);
        }
      }
    }));

    const handleSelect = (item: any) => {
      if (char === '/') {
        if (insertTextHandler) {
          insertTextHandler(item.content);
        }
      } else if (char === '#') {
        if (insertTextHandler) {
          insertTextHandler('');
        }
        if (onUpload) {
          onUpload({
            type: 'knowledge',
            data: item
          });
        }
      } else if (char === '@') {
        if (insertTextHandler) {
          insertTextHandler('');
        }
        onSelect({
          type: 'model',
          data: item
        });
      }
    };

    if (filteredItems.length === 0) {
      return null;
    }

    return (
      <div className="rounded-2xl shadow-lg border border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-850 w-72 p-1">
        <div className="overflow-y-auto scrollbar-thin max-h-60">
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : (
            <div>
              {filteredItems.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  data-selected={index === selectedIndex}
                  className={`w-full flex items-start gap-3 px-3 py-2 text-sm text-left cursor-pointer rounded-lg transition ${
                    index === selectedIndex
                      ? 'bg-gray-100 dark:bg-gray-800'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-gray-900 dark:text-gray-100">
                      {char === '/' && (item as Prompt).command}
                      {char === '#' && (item as Knowledge).name}
                      {char === '@' && (item as Model).name}
                    </div>
                    {char === '/' && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {(item as Prompt).title}
                      </div>
                    )}
                    {char === '#' && (item as Knowledge).description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {(item as Knowledge).description}
                      </div>
                    )}
                    {char === '@' && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {(item as Model).id}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
);

CommandSuggestionList.displayName = 'CommandSuggestionList';

export default CommandSuggestionList;

