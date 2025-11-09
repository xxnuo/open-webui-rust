import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Settings, RotateCcw } from 'lucide-react';

export interface ChatControlsConfig {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  repeat_penalty?: number;
  seed?: number;
  stop?: string[];
  stream?: boolean;
}

interface ChatControlsProps {
  config: ChatControlsConfig;
  onChange: (config: ChatControlsConfig) => void;
  disabled?: boolean;
}

const DEFAULT_CONFIG: ChatControlsConfig = {
  temperature: 0.7,
  max_tokens: 2048,
  top_p: 0.9,
  top_k: 40,
  frequency_penalty: 0,
  presence_penalty: 0,
  repeat_penalty: 1.0,
  seed: undefined,
  stop: [],
  stream: true,
};

export default function ChatControls({ config, onChange, disabled = false }: ChatControlsProps) {
  const [open, setOpen] = useState(false);

  const handleReset = () => {
    onChange(DEFAULT_CONFIG);
  };

  const updateConfig = (key: keyof ChatControlsConfig, value: unknown) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="shrink-0"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Chat Controls</SheetTitle>
          <SheetDescription>
            Configure generation parameters for this conversation
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Reset Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Temperature</Label>
              <span className="text-sm text-muted-foreground">
                {config.temperature?.toFixed(2) || 0.7}
              </span>
            </div>
            <Slider
              value={[config.temperature || 0.7]}
              onValueChange={([value]) => updateConfig('temperature', value)}
              min={0}
              max={2}
              step={0.01}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Controls randomness. Lower values make output more focused and deterministic.
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Max Tokens</Label>
              <Input
                type="number"
                value={config.max_tokens || 2048}
                onChange={(e) => updateConfig('max_tokens', parseInt(e.target.value))}
                className="w-24 h-8"
                min={1}
                max={32768}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Maximum number of tokens to generate.
            </p>
          </div>

          {/* Top P */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Top P</Label>
              <span className="text-sm text-muted-foreground">
                {config.top_p?.toFixed(2) || 0.9}
              </span>
            </div>
            <Slider
              value={[config.top_p || 0.9]}
              onValueChange={([value]) => updateConfig('top_p', value)}
              min={0}
              max={1}
              step={0.01}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Nucleus sampling: considers tokens with top_p probability mass.
            </p>
          </div>

          {/* Top K */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Top K</Label>
              <Input
                type="number"
                value={config.top_k || 40}
                onChange={(e) => updateConfig('top_k', parseInt(e.target.value))}
                className="w-24 h-8"
                min={1}
                max={100}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Limits sampling to the top K tokens.
            </p>
          </div>

          {/* Frequency Penalty */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Frequency Penalty</Label>
              <span className="text-sm text-muted-foreground">
                {config.frequency_penalty?.toFixed(2) || 0}
              </span>
            </div>
            <Slider
              value={[config.frequency_penalty || 0]}
              onValueChange={([value]) => updateConfig('frequency_penalty', value)}
              min={-2}
              max={2}
              step={0.01}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Reduces repetition based on token frequency.
            </p>
          </div>

          {/* Presence Penalty */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Presence Penalty</Label>
              <span className="text-sm text-muted-foreground">
                {config.presence_penalty?.toFixed(2) || 0}
              </span>
            </div>
            <Slider
              value={[config.presence_penalty || 0]}
              onValueChange={([value]) => updateConfig('presence_penalty', value)}
              min={-2}
              max={2}
              step={0.01}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Encourages new topics based on token presence.
            </p>
          </div>

          {/* Repeat Penalty */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Repeat Penalty</Label>
              <span className="text-sm text-muted-foreground">
                {config.repeat_penalty?.toFixed(2) || 1.0}
              </span>
            </div>
            <Slider
              value={[config.repeat_penalty || 1.0]}
              onValueChange={([value]) => updateConfig('repeat_penalty', value)}
              min={0}
              max={2}
              step={0.01}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Penalizes repetition. Values &gt; 1 reduce repetition.
            </p>
          </div>

          {/* Seed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Seed</Label>
              <Input
                type="number"
                value={config.seed || ''}
                onChange={(e) => updateConfig('seed', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Random"
                className="w-32 h-8"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Set a seed for deterministic generation.
            </p>
          </div>

          {/* Stream */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Stream Responses</Label>
              <p className="text-xs text-muted-foreground">
                Show responses as they are generated
              </p>
            </div>
            <Switch
              checked={config.stream !== false}
              onCheckedChange={(checked) => updateConfig('stream', checked)}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

