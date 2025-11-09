import React, { useEffect, useCallback } from 'react';

interface SuggestionItem {
  id: string;
  name: string;
  label?: string;
}

interface MentionListProps {
  items: SuggestionItem[];
  command: (item: SuggestionItem) => void;
}

export default function MentionList({ items, command }: MentionListProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);

  const selectItem = useCallback((index: number) => {
    const item = items[index];
    if (item) {
      command(item);
    }
  }, [items, command]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((selectedIndex + items.length - 1) % items.length);
        return true;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((selectedIndex + 1) % items.length);
        return true;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        selectItem(selectedIndex);
        return true;
      }

      return false;
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, items, selectItem]);

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-[300px] overflow-y-auto">
      {items.length > 0 ? (
        items.map((item, index) => (
          <button
            key={item.id}
            className={`w-full text-left px-3 py-2 hover:bg-accent transition-colors ${
              index === selectedIndex ? 'bg-accent' : ''
            }`}
            onClick={() => selectItem(index)}
          >
            <div className="font-medium">{item.label || item.name}</div>
            {item.id !== item.name && (
              <div className="text-xs text-muted-foreground">{item.id}</div>
            )}
          </button>
        ))
      ) : (
        <div className="px-3 py-2 text-sm text-muted-foreground">No results</div>
      )}
    </div>
  );
}

