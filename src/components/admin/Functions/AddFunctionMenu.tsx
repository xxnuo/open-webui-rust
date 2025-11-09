import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PenLine, Link } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AddFunctionMenuProps {
  createHandler: () => void;
  importFromLinkHandler: () => void;
  onClose?: () => void;
  children: React.ReactNode;
}

export const AddFunctionMenu: React.FC<AddFunctionMenuProps> = ({
  createHandler,
  importFromLinkHandler,
  onClose,
  children,
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen && onClose) {
      onClose();
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>{t('Create')}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DropdownMenuContent
        align="start"
        className="w-[190px] text-sm rounded-xl p-1 bg-white dark:bg-gray-850 dark:text-white shadow-lg"
      >
        <DropdownMenuItem
          className="flex items-center gap-2 rounded-md py-1.5 px-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          onSelect={() => {
            createHandler();
            setOpen(false);
          }}
        >
          <PenLine className="w-4 h-4" />
          <span className="truncate">{t('New Function')}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          className="flex items-center gap-2 rounded-md py-1.5 px-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          onSelect={() => {
            importFromLinkHandler();
            setOpen(false);
          }}
        >
          <Link className="w-4 h-4" />
          <span className="truncate">{t('Import From Link')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AddFunctionMenu;

