import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  getUserValvesSpecById as getToolUserValvesSpecById,
  getUserValvesById as getToolUserValvesById,
  updateUserValvesById as updateToolUserValvesById,
  getTools,
} from '@/lib/apis/tools';
import {
  getUserValvesSpecById as getFunctionUserValvesSpecById,
  getUserValvesById as getFunctionUserValvesById,
  updateUserValvesById as updateFunctionUserValvesById,
  getFunctions,
} from '@/lib/apis/functions';

interface ValveProperty {
  type: string;
  description?: string;
  enum?: string[];
  default?: any;
  title?: string;
}

interface ValvesSpec {
  properties: Record<string, ValveProperty>;
  required?: string[];
}

interface ValvesProps {
  show: boolean;
  onSave?: () => void;
}

export default function Valves({ show, onSave }: ValvesProps) {
  const [tab, setTab] = useState<'tools' | 'functions'>('tools');
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [valvesSpec, setValvesSpec] = useState<ValvesSpec | null>(null);
  const [valves, setValves] = useState<Record<string, any>>({});
  const [tools, setTools] = useState<any[]>([]);
  const [functions, setFunctions] = useState<any[]>([]);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (show) {
      init();
    }
  }, [show]);

  useEffect(() => {
    if (selectedId) {
      getUserValves();
    }
  }, [selectedId, tab]);

  useEffect(() => {
    setSelectedId('');
  }, [tab]);

  const init = async () => {
    setLoading(true);
    try {
      const [toolsData, functionsData] = await Promise.all([
        getTools(),
        getFunctions(),
      ]);
      setTools(toolsData || []);
      setFunctions(functionsData || []);
    } catch (error) {
      console.error('Failed to load tools/functions:', error);
    }
    setLoading(false);
  };

  const getUserValves = async () => {
    setLoading(true);
    try {
      let valvesData, specData;
      
      if (tab === 'tools') {
        valvesData = await getToolUserValvesById(selectedId);
        specData = await getToolUserValvesSpecById(selectedId);
      } else {
        valvesData = await getFunctionUserValvesById(selectedId);
        specData = await getFunctionUserValvesSpecById(selectedId);
      }

      setValvesSpec(specData);
      
      // Convert arrays to comma-separated strings for display
      if (specData?.properties) {
        const processedValves = { ...valvesData };
        for (const [key, spec] of Object.entries(specData.properties)) {
          if ((spec as ValveProperty).type === 'array' && Array.isArray(processedValves[key])) {
            processedValves[key] = processedValves[key].join(', ');
          }
        }
        setValves(processedValves);
      } else {
        setValves(valvesData || {});
      }
    } catch (error) {
      console.error('Failed to load valves:', error);
      toast.error('Failed to load valves');
    }
    setLoading(false);
  };

  const debounceSubmit = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    const timer = setTimeout(() => {
      submitHandler();
    }, 500);
    
    setDebounceTimer(timer);
  };

  const submitHandler = async () => {
    if (!valvesSpec) return;

    try {
      // Convert strings back to arrays
      const processedValves = { ...valves };
      for (const [key, spec] of Object.entries(valvesSpec.properties)) {
        if ((spec as ValveProperty).type === 'array' && typeof processedValves[key] === 'string') {
          processedValves[key] = processedValves[key]
            .split(',')
            .map((v: string) => v.trim())
            .filter(Boolean);
        }
      }

      let res;
      if (tab === 'tools') {
        res = await updateToolUserValvesById(selectedId, processedValves);
      } else {
        res = await updateFunctionUserValvesById(selectedId, processedValves);
      }

      if (res) {
        toast.success('Valves updated successfully');
        setValves(processedValves);
        onSave?.();
      }
    } catch (error) {
      console.error('Failed to update valves:', error);
      toast.error('Failed to update valves');
    }
  };

  const updateValve = (key: string, value: any) => {
    setValves((prev) => ({ ...prev, [key]: value }));
    debounceSubmit();
  };

  const renderValveInput = (key: string, property: ValveProperty) => {
    const value = valves[key] ?? property.default ?? '';

    if (property.type === 'boolean') {
      return (
        <div className="flex items-center justify-between">
          <Label htmlFor={key} className="text-sm">
            {property.title || key}
            {property.description && (
              <span className="block text-xs text-muted-foreground mt-1">
                {property.description}
              </span>
            )}
          </Label>
          <Switch
            id={key}
            checked={value}
            onCheckedChange={(checked) => updateValve(key, checked)}
          />
        </div>
      );
    }

    if (property.enum) {
      return (
        <div className="space-y-2">
          <Label htmlFor={key} className="text-sm">
            {property.title || key}
            {property.description && (
              <span className="block text-xs text-muted-foreground">
                {property.description}
              </span>
            )}
          </Label>
          <Select value={value} onValueChange={(v) => updateValve(key, v)}>
            <SelectTrigger id={key}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {property.enum.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (property.type === 'array' || property.type === 'object') {
      return (
        <div className="space-y-2">
          <Label htmlFor={key} className="text-sm">
            {property.title || key}
            {property.description && (
              <span className="block text-xs text-muted-foreground">
                {property.description}
              </span>
            )}
          </Label>
          <Textarea
            id={key}
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => updateValve(key, e.target.value)}
            rows={3}
            placeholder={property.type === 'array' ? 'Comma-separated values' : 'JSON object'}
          />
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <Label htmlFor={key} className="text-sm">
          {property.title || key}
          {property.description && (
            <span className="block text-xs text-muted-foreground">
              {property.description}
            </span>
          )}
        </Label>
        <Input
          id={key}
          type={property.type === 'number' ? 'number' : 'text'}
          value={value}
          onChange={(e) => updateValve(key, e.target.value)}
          placeholder={property.default?.toString() || ''}
        />
      </div>
    );
  };

  if (!show) return null;

  if (loading && !valvesSpec) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-3 text-sm">
      <div className="flex flex-col space-y-3">
        {/* Tab and ID Selectors */}
        <div className="flex gap-2">
          <Select value={tab} onValueChange={(v: any) => setTab(v)}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tools">Tools</SelectItem>
              <SelectItem value="functions">Functions</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={`Select a ${tab === 'tools' ? 'tool' : 'function'}`} />
            </SelectTrigger>
            <SelectContent>
              {tab === 'tools'
                ? tools
                    .filter((tool) => !tool?.id?.startsWith('server:'))
                    .map((tool) => (
                      <SelectItem key={tool.id} value={tool.id}>
                        {tool.name}
                      </SelectItem>
                    ))
                : functions.map((func) => (
                    <SelectItem key={func.id} value={func.id}>
                      {func.name}
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>
        </div>

        {/* Valves Form */}
        {selectedId && valvesSpec && (
          <div className="border-t pt-3 space-y-3">
            {loading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {Object.entries(valvesSpec.properties).map(([key, property]) => (
                  <div key={key}>
                    {renderValveInput(key, property as ValveProperty)}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {selectedId && !valvesSpec && !loading && (
          <div className="text-center text-muted-foreground py-4">
            No valves configuration available
          </div>
        )}
      </div>
    </div>
  );
}

