import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  getFunctionValvesById,
  getFunctionValvesSpecById,
  updateFunctionValvesById,
  getUserValvesSpecById as getFunctionUserValvesSpecById,
  getUserValvesById as getFunctionUserValvesById,
  updateUserValvesById as updateFunctionUserValvesById,
} from '@/lib/apis/functions';
import {
  getToolValvesById,
  getToolValvesSpecById,
  updateToolValvesById,
  getUserValvesSpecById as getToolUserValvesSpecById,
  getUserValvesById as getToolUserValvesById,
  updateUserValvesById as updateToolUserValvesById,
} from '@/lib/apis/tools';
import Valves from '@/components/chat/Controls/Valves';

interface ValvesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'tool' | 'function';
  id: string | null;
  userValves?: boolean;
  onSave?: () => void;
}

export default function ValvesModal({
  open,
  onOpenChange,
  type,
  id,
  userValves = false,
  onSave
}: ValvesModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [valvesSpec, setValvesSpec] = useState<any>(null);
  const [valves, setValves] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadValves = async () => {
      if (!open || !id) return;

      setLoading(true);

      try {
        let spec = null;
        let vals = null;

        if (userValves) {
          if (type === 'tool') {
            spec = await getToolUserValvesSpecById(localStorage.token, id);
            vals = await getToolUserValvesById(localStorage.token, id);
          } else if (type === 'function') {
            spec = await getFunctionUserValvesSpecById(localStorage.token, id);
            vals = await getFunctionUserValvesById(localStorage.token, id);
          }
        } else {
          if (type === 'tool') {
            spec = await getToolValvesSpecById(localStorage.token, id);
            vals = await getToolValvesById(localStorage.token, id);
          } else if (type === 'function') {
            spec = await getFunctionValvesSpecById(localStorage.token, id);
            vals = await getFunctionValvesById(localStorage.token, id);
          }
        }

        setValvesSpec(spec);
        setValves(vals || {});
      } catch (error) {
        console.error('Error loading valves:', error);
        toast.error(t('Failed to load valves'));
      } finally {
        setLoading(false);
      }
    };

    loadValves();
  }, [open, id, type, userValves, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;

    setSaving(true);

    try {
      if (valvesSpec) {
        // Convert string to array for array type properties
        const processedValves = { ...valves };
        
        for (const property in valvesSpec.properties) {
          if (valvesSpec.properties[property]?.type === 'array') {
            if (typeof processedValves[property] === 'string') {
              processedValves[property] = (processedValves[property] || '')
                .split(',')
                .map((v: string) => v.trim())
                .filter((v: string) => v.length > 0);
            } else if (processedValves[property] == null) {
              processedValves[property] = null;
            }
          }
        }

        let res = null;

        if (userValves) {
          if (type === 'tool') {
            res = await updateToolUserValvesById(localStorage.token, id, processedValves);
          } else if (type === 'function') {
            res = await updateFunctionUserValvesById(localStorage.token, id, processedValves);
          }
        } else {
          if (type === 'tool') {
            res = await updateToolValvesById(localStorage.token, id, processedValves);
          } else if (type === 'function') {
            res = await updateFunctionValvesById(localStorage.token, id, processedValves);
          }
        }

        if (res) {
          toast.success(t('Valves updated successfully'));
          onSave?.();
          onOpenChange(false);
        }
      }
    } catch (error) {
      console.error('Error updating valves:', error);
      toast.error(t('Failed to update valves'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {userValves ? t('User Valves') : t('Valves')}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {valvesSpec && (
              <Valves
                valvesSpec={valvesSpec}
                valves={valves}
                onChange={setValves}
              />
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('Save')}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

