import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Prompt {
  id?: string;
  title?: [string, string];
  content: string;
}

interface SuggestionsProps {
  suggestions?: Prompt[];
  className?: string;
  inputValue?: string;
  onSelect?: (data: string) => void;
}

export default function Suggestions({
  suggestions = [],
  className = '',
  inputValue = '',
  onSelect = () => {},
}: SuggestionsProps) {
  const { t } = useTranslation();
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>([]);

  useEffect(() => {
    if (inputValue && inputValue.length > 500) {
      setFilteredPrompts([]);
      return;
    }

    let prompts = [...suggestions].sort(() => Math.random() - 0.5);

    if (inputValue && inputValue.trim()) {
      const query = inputValue.toLowerCase();
      prompts = prompts.filter(
        (p) =>
          p.content.toLowerCase().includes(query) ||
          (p.title && (p.title[0]?.toLowerCase().includes(query) || p.title[1]?.toLowerCase().includes(query)))
      );
    }

    setFilteredPrompts(prompts.slice(0, 4));
  }, [suggestions, inputValue]);

  if (filteredPrompts.length === 0) {
    return null;
  }

  return (
    <div className={`w-full ${className || 'grid grid-cols-2 gap-2'}`}>
      {filteredPrompts.map((prompt, idx) => (
        <button
          key={prompt.id || prompt.content || idx}
          className="flex flex-col w-full justify-between px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-850 hover:bg-gray-100 dark:hover:bg-gray-800 transition group text-left"
          onClick={() => onSelect(prompt.content)}
        >
          {prompt.title && prompt.title[0] ? (
            <>
              <div className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                {prompt.title[0]}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                {prompt.title[1]}
              </div>
            </>
          ) : (
            <>
              <div className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                {prompt.content}
              </div>
            </>
          )}
        </button>
      ))}
    </div>
  );
}

