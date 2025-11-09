import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Save, MoreVertical, Sparkles, Mic } from 'lucide-react';
import RichTextInput, { RichTextInputHandle } from '@/components/common/RichTextInput';
import { toast } from 'sonner';

interface NoteEditorProps {
  noteId?: string;
  initialTitle?: string;
  initialContent?: string;
  onSave?: (title: string, content: string) => Promise<void>;
  onAIAction?: (action: string, selectedText: string) => void;
}

export default function NoteEditor({
  noteId,
  initialTitle = '',
  initialContent = '',
  onSave,
  onAIAction
}: NoteEditorProps) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const editorRef = useRef<RichTextInputHandle>(null);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(t('Please enter a title'));
      return;
    }

    setSaving(true);
    try {
      if (onSave) {
        await onSave(title, content);
        setLastSaved(new Date());
        toast.success(t('Note saved'));
      }
    } catch (error: any) {
      toast.error(error.message || t('Failed to save note'));
    } finally {
      setSaving(false);
    }
  };

  const handleAIAction = (action: string) => {
    // Get selected text from editor if available
    const selectedText = window.getSelection()?.toString() || '';
    
    if (onAIAction) {
      onAIAction(action, selectedText);
    } else {
      toast.info(t('AI features coming soon'));
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex-1">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('Untitled Note')}
            className="text-2xl font-bold border-none focus-visible:ring-0 px-0"
          />
          {lastSaved && (
            <div className="text-xs text-gray-500 mt-1">
              {t('Last saved')}: {lastSaved.toLocaleTimeString()}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* AI Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Sparkles className="size-4 mr-2" />
                {t('AI')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => handleAIAction('improve')}>
                {t('Improve Writing')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAIAction('summarize')}>
                {t('Summarize')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAIAction('expand')}>
                {t('Expand')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAIAction('simplify')}>
                {t('Simplify')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAIAction('translate')}>
                {t('Translate')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Record Button */}
          <Button variant="outline" size="sm">
            <Mic className="size-4" />
          </Button>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save className="size-4 mr-2" />
            {saving ? t('Saving...') : t('Save')}
          </Button>

          {/* More Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                {t('Export as PDF')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                {t('Export as Markdown')}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">
                {t('Delete Note')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6">
          <RichTextInput
            ref={editorRef}
            value={content}
            onChange={(md) => setContent(md)}
            placeholder={t('Start writing...')}
            richText={true}
            className="min-h-[500px]"
          />
        </div>
      </div>
    </div>
  );
}

