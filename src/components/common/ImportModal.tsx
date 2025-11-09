import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from './Loader';

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport?: (data: any) => void;
  loadUrlHandler?: (url: string) => Promise<any>;
  successMessage?: string;
}

const extractFrontmatter = (content: string) => {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
  const match = content.match(frontmatterRegex);
  
  if (!match) return null;
  
  const frontmatterText = match[1];
  const frontmatter: any = {};
  
  const lines = frontmatterText.split('\n');
  lines.forEach((line) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      frontmatter[key] = value.replace(/^["']|["']$/g, '');
    }
  });
  
  return frontmatter;
};

export const ImportModal: React.FC<ImportModalProps> = ({
  open,
  onOpenChange,
  onImport,
  loadUrlHandler,
  successMessage,
}) => {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const submitHandler = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!url) {
      toast.error(t('Please enter a valid URL'));
      setLoading(false);
      return;
    }

    if (!loadUrlHandler) {
      toast.error(t('Load URL handler not provided'));
      setLoading(false);
      return;
    }

    try {
      const res = await loadUrlHandler(url);

      if (res) {
        const message = successMessage || t('Function imported successfully');
        toast.success(message);

        let func = res;
        func.id = func.id || func.name.replace(/\s+/g, '_').toLowerCase();

        const frontmatter = extractFrontmatter(res.content);

        if (frontmatter?.title) {
          func.name = frontmatter.title;
        }

        func.meta = {
          ...(func.meta ?? {}),
          description: frontmatter?.description ?? func.name,
        };

        if (onImport) {
          onImport(func);
        }

        onOpenChange(false);
        setUrl('');
      }
    } catch (err: any) {
      toast.error(`${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium">{t('Import')}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submitHandler} className="space-y-4">
          <div>
            <Label htmlFor="url" className="text-xs text-gray-500 mb-1">
              {t('URL')}
            </Label>
            <Input
              id="url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('Enter the URL to import')}
              required
              disabled={loading}
            />
          </div>

          <div className="flex justify-end pt-3">
            <Button type="submit" disabled={loading}>
              {t('Import')}
              {loading && <Loader className="ml-2" />}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ImportModal;

