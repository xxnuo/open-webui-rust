import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message?: string;
  cancelLabel?: string;
  confirmLabel?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  input?: boolean;
  inputPlaceholder?: string;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  children?: React.ReactNode;
}

const ConfirmDialog = ({
  open,
  onOpenChange,
  title,
  message,
  cancelLabel,
  confirmLabel,
  onConfirm,
  onCancel,
  input = false,
  inputPlaceholder,
  inputValue = '',
  onInputChange,
  children
}: ConfirmDialogProps) => {
  const { t } = useTranslation();
  const [localInputValue, setLocalInputValue] = useState(inputValue);

  useEffect(() => {
    if (open) {
      setLocalInputValue(inputValue);
    }
  }, [open, inputValue]);

  const handleConfirm = async () => {
    onOpenChange(false);
    await onConfirm?.();
  };

  const handleCancel = () => {
    onOpenChange(false);
    onCancel?.();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalInputValue(value);
    onInputChange?.(value);
  };

  const getSanitizedMessage = () => {
    if (!message) return '';
    return DOMPurify.sanitize(marked.parse(message) as string);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[32rem]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {title || t('Confirm your action')}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            {children ? (
              <div className="text-sm text-gray-500 flex-1">
                {children}
              </div>
            ) : (
              <div className="text-sm text-gray-500 flex-1">
                {message ? (
                  <div dangerouslySetInnerHTML={{ __html: getSanitizedMessage() }} />
                ) : (
                  <p>{t('This action cannot be undone. Do you wish to continue?')}</p>
                )}

                {input && (
                  <Textarea
                    value={localInputValue}
                    onChange={handleInputChange}
                    placeholder={inputPlaceholder || t('Enter your message')}
                    className="mt-2"
                    rows={3}
                  />
                )}
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {cancelLabel || t('Cancel')}
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>
            {confirmLabel || t('Confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ConfirmDialog;







