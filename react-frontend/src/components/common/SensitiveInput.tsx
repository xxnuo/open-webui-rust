import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SensitiveInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password';
  required?: boolean;
  readOnly?: boolean;
  className?: string;
}

export default function SensitiveInput({
  id = 'password-input',
  value,
  onChange,
  placeholder = '',
  type = 'text',
  required = true,
  readOnly = false,
  className = ''
}: SensitiveInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className={cn('flex flex-1 items-center gap-1.5', className)}>
      <Input
        id={id}
        type={type === 'password' && !show ? 'password' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required && !readOnly}
        disabled={readOnly}
        autoComplete="off"
        className="flex-1"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0"
        onClick={() => setShow(!show)}
        aria-pressed={show}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

