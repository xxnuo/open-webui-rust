import { useEffect, useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useAppStore, type Model } from '@/store';
import { getModels } from '@/lib/apis';
import { updateUserSettings } from '@/lib/apis/users';
import { Search, Star } from 'lucide-react';
import { toast } from 'sonner';
import Fuse from 'fuse.js';
import { cn } from '@/lib/utils';

interface ModelSelectorProps {
  selectedModel?: string;
  onModelChange: (modelId: string) => void;
  showSetDefault?: boolean;
}

export default function ModelSelector({ 
  selectedModel, 
  onModelChange,
  showSetDefault = true 
}: ModelSelectorProps) {
  const { models, setModels, user, config, settings, setSettings } = useAppStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredModelId, setHoveredModelId] = useState<string | null>(null);

  // Load models on mount if not already loaded
  useEffect(() => {
    const loadModels = async () => {
      if (!user || models.length > 0) return;
      
      try {
        const token = localStorage.getItem('token');
        const connections = config?.features?.enable_direct_connections && (settings?.directConnections ?? null);
        const modelList = await getModels(token || '', connections);
        
        if (modelList && Array.isArray(modelList)) {
          setModels(modelList);
          
          // Select default model if none selected - matching Svelte behavior
          if (!selectedModel && modelList.length > 0) {
            let defaultModelId = '';
            
            // First priority: settings.models (user's saved default)
            if (settings?.models && settings.models.length > 0) {
              defaultModelId = settings.models[0];
            }
            // Second priority: config.default_models (server-side default)
            else if (config?.default_models) {
              defaultModelId = config.default_models.split(',')[0];
            }
            // Fallback: first available model
            else {
              defaultModelId = modelList[0].id;
            }
            
            // Verify the default model exists in the list
            if (modelList.find(m => m.id === defaultModelId)) {
              onModelChange(defaultModelId);
            } else {
              // If default doesn't exist, use first model
              onModelChange(modelList[0].id);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load models:', error);
        toast.error('Failed to load models');
      }
    };

    loadModels();
  }, [user, models.length, config, settings, selectedModel, onModelChange, setModels]);

  // Fuse.js search instance - matching Svelte implementation
  const fuse = useMemo(() => {
    if (!models.length) return null;
    
    return new Fuse(
      models
        .filter((model) => !(model?.info?.meta?.hidden ?? false))
        .map((model) => ({
          ...model,
          modelName: model?.name,
          tags: (model?.info?.meta?.tags ?? []).map((tag: any) => tag.name).join(' '),
          desc: model?.info?.meta?.description
        })),
      {
        keys: ['id', 'modelName', 'tags', 'desc'],
        threshold: 0.4
      }
    );
  }, [models]);

  // Filtered models based on search
  const filteredModels = useMemo(() => {
    if (!searchValue || !fuse) {
      return models.filter((model) => !(model?.info?.meta?.hidden ?? false));
    }
    
    return fuse.search(searchValue).map((result) => result.item);
  }, [searchValue, models, fuse]);

  // Refresh models on hover
  const handleMouseEnter = async () => {
    if (!user || isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      const connections = config?.features?.enable_direct_connections && (settings?.directConnections ?? null);
      const modelList = await getModels(token || '', connections);
      
      if (modelList && Array.isArray(modelList)) {
        setModels(modelList);
      }
    } catch (error) {
      console.error('Failed to refresh models:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Save default model for a specific model ID
  const setModelAsDefault = async (modelId: string) => {
    try {
      const newSettings = { ...settings, models: [modelId] };
      setSettings(newSettings);
      await updateUserSettings(localStorage.getItem('token') || '', { ui: newSettings });
      toast.success(`Set ${models.find(m => m.id === modelId)?.name || modelId} as default`);
    } catch (error) {
      console.error('Failed to save default model:', error);
      toast.error('Failed to save default model');
    }
  };

  // Get the selected model object for display
  const selectedModelObj = models.find(m => m.id === selectedModel);
  const displayName = selectedModelObj?.name || (models.length > 0 ? 'Select a model' : 'No models available');
  
  // Get current default model ID
  const currentDefaultModelId = settings?.models?.[0];

  // Clear search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchValue('');
      setHoveredModelId(null);
    }
  }, [isOpen]);

  return (
    <div className="flex items-center gap-2 w-full">
      <Select 
        value={selectedModel || ''} 
        onValueChange={onModelChange}
        onOpenChange={setIsOpen}
      >
        <SelectTrigger 
          className="w-full h-9" 
          onMouseEnter={handleMouseEnter}
          disabled={models.length === 0}
        >
          <SelectValue placeholder={displayName}>
            {displayName}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="w-[500px]">
          {/* Search input */}
          <div className="flex items-center px-2 pb-2 sticky top-0 bg-background z-10 border-b">
            <Search className="w-4 h-4 mr-2 text-muted-foreground flex-shrink-0" />
            <Input
              placeholder="Search models..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="h-8 w-full border-0 shadow-none focus-visible:ring-0"
              autoFocus
            />
          </div>
          
          {/* Model list */}
          {filteredModels.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto">
              {filteredModels.map((model) => (
                <div
                  key={model.id}
                  className="relative group"
                  onMouseEnter={() => setHoveredModelId(model.id)}
                  onMouseLeave={() => setHoveredModelId(null)}
                >
                  <SelectItem 
                    value={model.id}
                    className="pr-10"
                  >
                    <div className="flex flex-col w-full">
                      <div className="flex items-center gap-2">
                        <span className="flex-1">{model.name || model.id}</span>
                        {currentDefaultModelId === model.id && (
                          <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                        )}
                      </div>
                      {model.owned_by && (
                        <span className="text-xs text-muted-foreground">
                          {model.owned_by}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                  
                  {/* Set as default button - shows on hover */}
                  {showSetDefault && hoveredModelId === model.id && currentDefaultModelId !== model.id && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setModelAsDefault(model.id);
                      }}
                      className={cn(
                        "absolute right-2 top-1/2 -translate-y-1/2 z-10",
                        "flex items-center gap-1 px-2 py-1",
                        "text-xs text-muted-foreground hover:text-foreground",
                        "bg-background/80 backdrop-blur-sm",
                        "border rounded-md",
                        "transition-all duration-200",
                        "hover:bg-accent"
                      )}
                      title="Set as default model"
                    >
                      <Star className="w-3 h-3" />
                      <span className="hidden sm:inline">Set default</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-2 py-6 text-center text-sm text-muted-foreground">
              {searchValue ? 'No models found' : 'No models available'}
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
