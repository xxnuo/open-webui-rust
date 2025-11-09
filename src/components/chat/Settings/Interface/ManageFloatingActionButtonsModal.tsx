import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FloatingActionButton {
  id: string;
  label: string;
  input: boolean;
  prompt: string;
}

interface ManageFloatingActionButtonsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  floatingActionButtons: FloatingActionButton[] | null;
  onSave: (buttons: FloatingActionButton[] | null) => void;
}

export default function ManageFloatingActionButtonsModal({
  open,
  onOpenChange,
  floatingActionButtons,
  onSave
}: ManageFloatingActionButtonsModalProps) {
  const { t } = useTranslation();
  const [buttons, setButtons] = useState<FloatingActionButton[] | null>(null);

  useEffect(() => {
    if (open) {
      setButtons(floatingActionButtons);
    }
  }, [open, floatingActionButtons]);

  const getDefaultButtons = (): FloatingActionButton[] => [
    {
      id: 'ask',
      label: t('Ask'),
      input: true,
      prompt: `{{SELECTED_CONTENT}}\n\n\n{{INPUT_CONTENT}}`
    },
    {
      id: 'explain',
      label: t('Explain'),
      input: false,
      prompt: `{{SELECTED_CONTENT}}\n\n\n${t('Explain')}`
    }
  ];

  const toggleCustom = () => {
    if (buttons === null) {
      setButtons(getDefaultButtons());
    } else {
      setButtons(null);
    }
  };

  const addButton = () => {
    let id = 'new-button';
    let idx = 0;

    const currentButtons = buttons || [];
    while (currentButtons.some((b) => b.id === id)) {
      idx++;
      id = `new-button-${idx}`;
    }

    const newButton: FloatingActionButton = {
      id,
      label: '',
      input: false,
      prompt: ''
    };

    setButtons([...(buttons || []), newButton]);
  };

  const removeButton = (id: string) => {
    if (buttons) {
      setButtons(buttons.filter((b) => b.id !== id));
    }
  };

  const updateButton = (id: string, field: keyof FloatingActionButton, value: any) => {
    if (buttons) {
      setButtons(
        buttons.map((b) =>
          b.id === id ? { ...b, [field]: value } : b
        )
      );
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(buttons);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('Quick Actions')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-xs font-medium">{t('Actions')}</Label>
              
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={toggleCustom}
                >
                  {buttons === null ? t('Default') : t('Custom')}
                </Button>

                {buttons !== null && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addButton}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {buttons !== null && (
              <div className="space-y-4">
                {buttons.map((button) => (
                  <div
                    key={button.id}
                    className="p-4 border rounded-lg space-y-3 relative"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => removeButton(button.id)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>

                    <div className="space-y-2">
                      <Label htmlFor={`label-${button.id}`} className="text-xs">
                        {t('Label')}
                      </Label>
                      <Input
                        id={`label-${button.id}`}
                        value={button.label}
                        onChange={(e) => updateButton(button.id, 'label', e.target.value)}
                        placeholder={t('Action label')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`prompt-${button.id}`} className="text-xs">
                        {t('Prompt')}
                      </Label>
                      <Textarea
                        id={`prompt-${button.id}`}
                        value={button.prompt}
                        onChange={(e) => updateButton(button.id, 'prompt', e.target.value)}
                        placeholder={t('Enter prompt template')}
                        rows={3}
                      />
                      <div className="text-xs text-muted-foreground">
                        {t('Use {{SELECTED_CONTENT}} for selected text and {{INPUT_CONTENT}} for input')}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`input-${button.id}`}
                        checked={button.input}
                        onCheckedChange={(checked) => updateButton(button.id, 'input', checked)}
                      />
                      <Label htmlFor={`input-${button.id}`} className="text-xs">
                        {t('Require input')}
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('Cancel')}
            </Button>
            <Button type="submit">
              {t('Save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

