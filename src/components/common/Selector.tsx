import { ReactNode } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export interface SelectorOption {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

interface SelectorProps {
  label?: string;
  value: string;
  options: SelectorOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export default function Selector({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  className = '',
  required = false,
}: SelectorProps) {
  return (
    <div className={className}>
      {label && (
        <Label className="mb-2 block">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              <div className="flex items-center gap-2">
                {option.icon && <span>{option.icon}</span>}
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

