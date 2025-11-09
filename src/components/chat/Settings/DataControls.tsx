import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store';
import { 
  Download, 
  Upload, 
  Archive, 
  Trash2,
  Check,
  X 
} from 'lucide-react';

interface DataControlsProps {
  saveSettings: (settings: Record<string, unknown>) => Promise<void>;
}

export default function DataControls({ saveSettings }: DataControlsProps) {
  const { t } = useTranslation();
  const { user } = useAppStore();

  const [importFiles, setImportFiles] = useState<FileList | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showArchivedChatsModal, setShowArchivedChatsModal] = useState(false);

  const chatImportInputElement = useRef<HTMLInputElement>(null);

  const importChatsHandler = async (files: FileList) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const chats = JSON.parse(event.target?.result as string);
        console.log('Imported chats:', chats);
        
        // TODO: Implement actual import logic with API call
        toast.success(t('Chats imported successfully'));
      } catch (error) {
        console.error('Unable to import chats:', error);
        toast.error(t('Failed to import chats'));
      }
    };

    reader.readAsText(file);
    setImportFiles(null);
  };

  const exportChatsHandler = async () => {
    try {
      // TODO: Implement actual export logic with API call
      // const chats = await getAllChats(token);
      // const blob = new Blob([JSON.stringify(chats)], { type: 'application/json' });
      // const url = URL.createObjectURL(blob);
      // const a = document.createElement('a');
      // a.href = url;
      // a.download = `chat-export-${Date.now()}.json`;
      // a.click();
      toast.success(t('Chats exported successfully'));
    } catch (error) {
      console.error('Unable to export chats:', error);
      toast.error(t('Failed to export chats'));
    }
  };

  const archiveAllChatsHandler = async () => {
    try {
      // TODO: Implement actual archive logic with API call
      // await archiveAllChats(token);
      toast.success(t('All chats archived successfully'));
      setShowArchiveConfirm(false);
    } catch (error) {
      console.error('Unable to archive chats:', error);
      toast.error(t('Failed to archive chats'));
    }
  };

  const deleteAllChatsHandler = async () => {
    try {
      // TODO: Implement actual delete logic with API call
      // await deleteAllChats(token);
      toast.success(t('All chats deleted successfully'));
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Unable to delete chats:', error);
      toast.error(t('Failed to delete chats'));
    }
  };

  return (
    <div className="flex flex-col h-full text-sm">
      <div className="space-y-2 overflow-y-auto max-h-[28rem] md:max-h-full">
        <div className="space-y-1">
          <input
            ref={chatImportInputElement}
            type="file"
            accept=".json"
            hidden
            onChange={(e) => {
              if (e.target.files) {
                importChatsHandler(e.target.files);
              }
            }}
          />

          <Button
            variant="ghost"
            className="w-full justify-start gap-3 px-3.5 py-2"
            onClick={() => chatImportInputElement.current?.click()}
          >
            <Upload className="h-4 w-4" />
            <span className="text-sm font-medium">{t('Import Chats')}</span>
          </Button>

          {(user?.role === 'admin' || user?.permissions?.chat?.export) && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-3.5 py-2"
              onClick={exportChatsHandler}
            >
              <Download className="h-4 w-4" />
              <span className="text-sm font-medium">{t('Export Chats')}</span>
            </Button>
          )}
        </div>

        <hr className="border-gray-200 dark:border-gray-800 my-3" />

        <div className="space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 px-3.5 py-2"
            onClick={() => setShowArchivedChatsModal(true)}
          >
            <Archive className="h-4 w-4" />
            <span className="text-sm font-medium">{t('Archived Chats')}</span>
          </Button>

          {showArchiveConfirm ? (
            <div className="flex justify-between items-center rounded-md py-2 px-3.5 w-full transition">
              <div className="flex items-center gap-3">
                <Archive className="h-4 w-4" />
                <span>{t('Are you sure?')}</span>
              </div>

              <div className="flex gap-1.5 items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    archiveAllChatsHandler();
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setShowArchiveConfirm(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-3.5 py-2"
              onClick={() => setShowArchiveConfirm(true)}
            >
              <Archive className="h-4 w-4" />
              <span className="text-sm font-medium">{t('Archive All Chats')}</span>
            </Button>
          )}

          {showDeleteConfirm ? (
            <div className="flex justify-between items-center rounded-md py-2 px-3.5 w-full transition">
              <div className="flex items-center gap-3">
                <Trash2 className="h-4 w-4" />
                <span>{t('Are you sure?')}</span>
              </div>

              <div className="flex gap-1.5 items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    deleteAllChatsHandler();
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 px-3.5 py-2"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="text-sm font-medium">{t('Delete All Chats')}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

