import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface InputVariablesModalProps {
  open: boolean;
  onClose: () => void;
  variables: Record<string, { default?: string }>;
  onSubmit: (values: Record<string, string>) => void;
}

export default function InputVariablesModal({
  open,
  onClose,
  variables,
  onSubmit
}: InputVariablesModalProps) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initialValues: Record<string, string> = {};
    Object.keys(variables).forEach((key) => {
      initialValues[key] = variables[key].default || '';
    });
    return initialValues;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(values);
    onClose();
  };

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Input Variables</DialogTitle>
            <DialogDescription>
              Fill in the values for the template variables.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-4">
            {Object.keys(variables).map((key) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>
                  {key}
                  {variables[key].default && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (default: {variables[key].default})
                    </span>
                  )}
                </Label>
                <Input
                  id={key}
                  value={values[key] || ''}
                  onChange={(e) => handleChange(key, e.target.value)}
                  placeholder={variables[key].default || `Enter ${key}`}
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Apply</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

