import { useAppStore } from '@/store';
import { marked } from 'marked';
import Suggestions from './Suggestions';

interface PlaceholderProps {
  selectedModel: string;
  onSelectPrompt: (prompt: string) => void;
}

export default function Placeholder({ selectedModel, onSelectPrompt }: PlaceholderProps) {
  const { user, models, config } = useAppStore();
  
  const model = models.find(m => m.id === selectedModel);
  
  // Get suggestion prompts from model or config
  const suggestionPrompts = 
    model?.info?.meta?.suggestion_prompts ?? 
    config?.default_prompt_suggestions ?? 
    [];

  return (
    <div className="m-auto w-full max-w-6xl px-8 lg:px-20 py-24">
      <div className="flex justify-center">
        {model?.info?.meta?.profile_image_url && (
          <div className="flex justify-center mb-4">
            <img
              src={model.info.meta.profile_image_url}
              className="size-16 rounded-full object-cover"
              alt={model.name || 'Model'}
            />
          </div>
        )}
      </div>

      <div className="mt-2 mb-4 text-3xl text-gray-800 dark:text-gray-100 text-center flex flex-col items-center gap-4 font-primary">
        <div>
          <div className="capitalize line-clamp-1">
            {model?.name || `Hello, ${user?.name || 'User'}`}
          </div>

          <div>
            {model?.info?.meta?.description ? (
              <div className="mt-0.5 text-base font-normal text-gray-500 dark:text-gray-400 line-clamp-3">
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: marked.parse(model.info.meta.description.replace(/\n/g, '<br>')) 
                  }} 
                />
              </div>
            ) : (
              <div className="text-gray-400 dark:text-gray-500 line-clamp-1 font-normal">
                How can I help you today?
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full font-primary mt-6">
        <Suggestions
          suggestions={suggestionPrompts}
          onSelect={onSelectPrompt}
        />
      </div>
    </div>
  );
}

