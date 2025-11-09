import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { action: 'Open new chat', keys: ['Ctrl/⌘', 'Shift', 'O'] },
  { action: 'Focus chat input', keys: ['Shift', 'Esc'] },
  { action: 'Stop Generating', keys: ['Esc'] },
  { action: 'Copy last code block', keys: ['Ctrl/⌘', 'Shift', 'C'] },
  { action: 'Copy last response', keys: ['Ctrl/⌘', 'Shift', 'E'] },
  { action: 'Toggle sidebar', keys: ['Ctrl/⌘', 'Shift', 'S'] },
  { action: 'Delete chat', keys: ['Ctrl/⌘', 'Shift', 'Del'] },
  { action: 'Show shortcuts', keys: ['Ctrl/⌘', '/'] },
];

export default function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('Keyboard shortcuts')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {shortcuts.map((shortcut, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <div className="text-sm">{t(shortcut.action)}</div>
              <div className="flex gap-1">
                {shortcut.keys.map((key, keyIdx) => (
                  <kbd
                    key={keyIdx}
                    className="px-2 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

