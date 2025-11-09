import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Pencil,
  Share2,
  Copy,
  Download,
  Trash2,
  Globe,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';

interface FunctionType {
  type?: string;
  is_global?: boolean;
  [key: string]: any;
}

interface FunctionMenuProps {
  func: FunctionType;
  editHandler: () => void;
  shareHandler: () => void;
  cloneHandler: () => void;
  exportHandler: () => void;
  deleteHandler: () => void;
  toggleGlobalHandler: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

export const FunctionMenu: React.FC<FunctionMenuProps> = ({
  func,
  editHandler,
  shareHandler,
  cloneHandler,
  exportHandler,
  deleteHandler,
  toggleGlobalHandler,
  onClose,
  children,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      onClose();
    }
  };

  const showGlobalToggle = ['filter', 'action'].includes(func.type || '');

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{t('More')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent
        align="start"
        className="w-[180px] rounded-xl p-1 border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-850 dark:text-white shadow-sm"
      >
        {showGlobalToggle && (
          <>
            <div className="flex gap-2 justify-between items-center px-3 py-1.5 text-sm font-medium cursor-pointer rounded-md">
              <div className="flex gap-2 items-center">
                <Globe className="w-4 h-4" />
                <span>{t('Global')}</span>
              </div>
              <Switch
                checked={func.is_global ?? false}
                onCheckedChange={toggleGlobalHandler}
              />
            </div>
            <DropdownMenuSeparator className="my-1" />
          </>
        )}

        <DropdownMenuItem
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
          onSelect={editHandler}
        >
          <Pencil className="w-4 h-4" />
          <span>{t('Edit')}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
          onSelect={shareHandler}
        >
          <Share2 className="w-4 h-4" />
          <span>{t('Share')}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
          onSelect={cloneHandler}
        >
          <Copy className="w-4 h-4" />
          <span>{t('Clone')}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md"
          onSelect={exportHandler}
        >
          <Download className="w-4 h-4" />
          <span>{t('Export')}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1" />

        <DropdownMenuItem
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md text-red-600 dark:text-red-400"
          onSelect={deleteHandler}
        >
          <Trash2 className="w-4 h-4" strokeWidth={2} />
          <span>{t('Delete')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default FunctionMenu;

