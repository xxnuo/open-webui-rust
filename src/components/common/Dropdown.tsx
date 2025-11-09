import { ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';

export interface DropdownItemConfig {
  type?: 'item' | 'checkbox' | 'radio' | 'separator' | 'label';
  label?: string;
  icon?: ReactNode;
  onClick?: () => void;
  checked?: boolean;
  value?: string;
  disabled?: boolean;
  className?: string;
}

interface DropdownProps {
  trigger: ReactNode;
  items: DropdownItemConfig[];
  radioValue?: string;
  onRadioChange?: (value: string) => void;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export default function Dropdown({
  trigger,
  items,
  radioValue,
  onRadioChange,
  align = 'start',
  side = 'bottom',
  open,
  onOpenChange,
  className = '',
}: DropdownProps) {
  const hasRadioItems = items.some((item) => item.type === 'radio');

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align={align} side={side} className={className}>
        {hasRadioItems && radioValue !== undefined && onRadioChange ? (
          <DropdownMenuRadioGroup value={radioValue} onValueChange={onRadioChange}>
            {items.map((item, index) => {
              if (item.type === 'separator') {
                return <DropdownMenuSeparator key={index} />;
              }
              if (item.type === 'label') {
                return (
                  <DropdownMenuLabel key={index} className={item.className}>
                    {item.label}
                  </DropdownMenuLabel>
                );
              }
              if (item.type === 'radio') {
                return (
                  <DropdownMenuRadioItem
                    key={index}
                    value={item.value || ''}
                    disabled={item.disabled}
                    className={item.className}
                  >
                    {item.icon && <span className="mr-2">{item.icon}</span>}
                    {item.label}
                  </DropdownMenuRadioItem>
                );
              }
              return null;
            })}
          </DropdownMenuRadioGroup>
        ) : (
          <>
            {items.map((item, index) => {
              if (item.type === 'separator') {
                return <DropdownMenuSeparator key={index} />;
              }
              if (item.type === 'label') {
                return (
                  <DropdownMenuLabel key={index} className={item.className}>
                    {item.label}
                  </DropdownMenuLabel>
                );
              }
              if (item.type === 'checkbox') {
                return (
                  <DropdownMenuCheckboxItem
                    key={index}
                    checked={item.checked}
                    onCheckedChange={() => item.onClick?.()}
                    disabled={item.disabled}
                    className={item.className}
                  >
                    {item.icon && <span className="mr-2">{item.icon}</span>}
                    {item.label}
                  </DropdownMenuCheckboxItem>
                );
              }
              return (
                <DropdownMenuItem
                  key={index}
                  onClick={item.onClick}
                  disabled={item.disabled}
                  className={item.className}
                >
                  {item.icon && <span className="mr-2">{item.icon}</span>}
                  {item.label}
                </DropdownMenuItem>
              );
            })}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

