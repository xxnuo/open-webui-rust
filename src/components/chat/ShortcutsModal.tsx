import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ShortcutsModalProps {
  show: boolean;
  onClose: () => void;
}

interface ShortcutItemProps {
  label: string;
  keys: string[];
  tooltip?: string;
}

function ShortcutItem({ label, keys, tooltip }: ShortcutItemProps) {
  const content = (
    <div className="w-full flex justify-between items-center">
      <div className="text-sm">{label}</div>
      <div className="flex space-x-1 text-xs">
        {keys.map((key, idx) => (
          <div
            key={idx}
            className="h-fit py-1 px-2 flex items-center justify-center rounded-sm border border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-300 font-mono"
          >
            {key}
          </div>
        ))}
      </div>
    </div>
  );

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>{content}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
}

export default function ShortcutsModal({ show, onClose }: ShortcutsModalProps) {
  const { t } = useTranslation();

  const keyboardShortcuts = [
    [
      { label: t('Open new chat'), keys: ['Ctrl/⌘', 'Shift', 'O'] },
      { label: t('Focus chat input'), keys: ['Shift', 'Esc'] },
      { 
        label: t('Stop Generating') + ' *', 
        keys: ['Esc'],
        tooltip: t('Only active when the chat input is in focus and an LLM is generating a response.')
      },
      { label: t('Copy last code block'), keys: ['Ctrl/⌘', 'Shift', ';'] },
      { label: t('Copy last response'), keys: ['Ctrl/⌘', 'Shift', 'C'] },
      { 
        label: t('Prevent file creation') + ' *', 
        keys: ['Ctrl/⌘', 'Shift', 'V'],
        tooltip: t('Only active when "Paste Large Text as File" setting is toggled on.')
      }
    ],
    [
      { label: t('Generate prompt pair'), keys: ['Ctrl/⌘', 'Shift', 'Enter'] },
      { 
        label: t('Regenerate response') + ' *', 
        keys: ['Ctrl/⌘', 'Shift', 'R'],
        tooltip: t('Only active when the chat input is empty and in focus.')
      },
      { label: t('Toggle search'), keys: ['Ctrl/⌘', 'K'] },
      { label: t('Toggle settings'), keys: ['Ctrl/⌘', '.'] },
      { label: t('Toggle sidebar'), keys: ['Ctrl/⌘', 'Shift', 'S'] },
      { label: t('Delete chat'), keys: ['Ctrl/⌘', 'Shift', '⌫/Delete'] },
      { label: t('Show shortcuts'), keys: ['Ctrl/⌘', '/'] }
    ]
  ];

  const inputCommands = [
    { label: t('Attach file from knowledge'), keys: ['#'] },
    { label: t('Add custom prompt'), keys: ['/'] },
    { label: t('Talk to model'), keys: ['@'] },
    { label: t('Accept autocomplete generation / Jump to prompt variable'), keys: ['TAB'] }
  ];

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('Keyboard shortcuts')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Keyboard Shortcuts Section */}
          <div className="flex flex-col md:flex-row w-full md:space-x-6">
            {keyboardShortcuts.map((column, colIdx) => (
              <div key={colIdx} className="flex flex-col space-y-3 w-full">
                {column.map((shortcut, idx) => (
                  <ShortcutItem
                    key={idx}
                    label={shortcut.label}
                    keys={shortcut.keys}
                    tooltip={shortcut.tooltip}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Asterisk Note */}
          <div className="text-xs text-muted-foreground border-t border-border pt-4">
            {t('Shortcuts with an asterisk (*) are situational and only active under specific conditions.')}
          </div>

          {/* Input Commands Section */}
          <div className="border-t border-border pt-4">
            <h3 className="text-lg font-medium mb-4">{t('Input commands')}</h3>
            <div className="flex flex-col space-y-3">
              {inputCommands.map((command, idx) => (
                <ShortcutItem
                  key={idx}
                  label={command.label}
                  keys={command.keys}
                />
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
