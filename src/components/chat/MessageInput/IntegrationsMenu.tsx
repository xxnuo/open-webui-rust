import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Globe,
  Image as ImageIcon,
  Code,
  Wrench,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IntegrationsMenuProps {
  webSearchEnabled?: boolean;
  onWebSearchToggle?: (enabled: boolean) => void;
  imageGenerationEnabled?: boolean;
  onImageGenerationToggle?: (enabled: boolean) => void;
  codeExecutionEnabled?: boolean;
  onCodeExecutionToggle?: (enabled: boolean) => void;
  documentsEnabled?: boolean;
  onDocumentsToggle?: (enabled: boolean) => void;
  selectedTools?: string[];
  onToolsChange?: (tools: string[]) => void;
  availableTools?: Array<{ id: string; name: string; description?: string }>;
  className?: string;
}

export default function IntegrationsMenu({
  webSearchEnabled = false,
  onWebSearchToggle,
  imageGenerationEnabled = false,
  onImageGenerationToggle,
  codeExecutionEnabled = false,
  onCodeExecutionToggle,
  documentsEnabled = false,
  onDocumentsToggle,
  selectedTools = [],
  onToolsChange,
  availableTools = [],
  className = '',
}: IntegrationsMenuProps) {
  const [open, setOpen] = useState(false);

  const toggleTool = (toolId: string) => {
    if (!onToolsChange) return;
    
    if (selectedTools.includes(toolId)) {
      onToolsChange(selectedTools.filter((id) => id !== toolId));
    } else {
      onToolsChange([...selectedTools, toolId]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', className)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start" side="top">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm mb-3">Integrations</h4>
            <div className="space-y-3">
              {/* Web Search */}
              {onWebSearchToggle && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="web-search" className="text-sm cursor-pointer">
                      Web Search
                    </Label>
                  </div>
                  <Switch
                    id="web-search"
                    checked={webSearchEnabled}
                    onCheckedChange={onWebSearchToggle}
                  />
                </div>
              )}

              {/* Image Generation */}
              {onImageGenerationToggle && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="image-gen" className="text-sm cursor-pointer">
                      Image Generation
                    </Label>
                  </div>
                  <Switch
                    id="image-gen"
                    checked={imageGenerationEnabled}
                    onCheckedChange={onImageGenerationToggle}
                  />
                </div>
              )}

              {/* Code Execution */}
              {onCodeExecutionToggle && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="code-exec" className="text-sm cursor-pointer">
                      Code Execution
                    </Label>
                  </div>
                  <Switch
                    id="code-exec"
                    checked={codeExecutionEnabled}
                    onCheckedChange={onCodeExecutionToggle}
                  />
                </div>
              )}

              {/* Documents */}
              {onDocumentsToggle && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="documents" className="text-sm cursor-pointer">
                      Documents
                    </Label>
                  </div>
                  <Switch
                    id="documents"
                    checked={documentsEnabled}
                    onCheckedChange={onDocumentsToggle}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Available Tools */}
          {availableTools.length > 0 && onToolsChange && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  Tools
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {availableTools.map((tool) => (
                    <div
                      key={tool.id}
                      className="flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <Label
                          htmlFor={`tool-${tool.id}`}
                          className="text-sm cursor-pointer"
                        >
                          {tool.name}
                        </Label>
                        {tool.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {tool.description}
                          </p>
                        )}
                      </div>
                      <Switch
                        id={`tool-${tool.id}`}
                        checked={selectedTools.includes(tool.id)}
                        onCheckedChange={() => toggleTool(tool.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {availableTools.length === 0 && !onWebSearchToggle && !onImageGenerationToggle && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No integrations available
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

