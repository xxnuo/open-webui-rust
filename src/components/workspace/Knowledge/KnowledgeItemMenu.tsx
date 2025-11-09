import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Share2, Copy, Download, Trash2, Archive } from 'lucide-react';

interface KnowledgeItemMenuProps {
  onEdit?: () => void;
  onShare?: () => void;
  onClone?: () => void;
  onExport?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}

export default function KnowledgeItemMenu({
  onEdit,
  onShare,
  onClone,
  onExport,
  onArchive,
  onDelete
}: KnowledgeItemMenuProps) {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            {t('Edit')}
          </DropdownMenuItem>
        )}
        {onShare && (
          <DropdownMenuItem onClick={onShare}>
            <Share2 className="h-4 w-4 mr-2" />
            {t('Share')}
          </DropdownMenuItem>
        )}
        {onClone && (
          <DropdownMenuItem onClick={onClone}>
            <Copy className="h-4 w-4 mr-2" />
            {t('Clone')}
          </DropdownMenuItem>
        )}
        {onExport && (
          <DropdownMenuItem onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            {t('Export')}
          </DropdownMenuItem>
        )}
        {onArchive && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onArchive}>
              <Archive className="h-4 w-4 mr-2" />
              {t('Archive')}
            </DropdownMenuItem>
          </>
        )}
        {onDelete && (
          <>
            {!onArchive && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              {t('Delete')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

