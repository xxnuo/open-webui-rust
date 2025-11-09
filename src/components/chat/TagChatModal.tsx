import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Tags from '@/components/common/Tags';

interface TagChatModalProps {
  show: boolean;
  onClose: () => void;
  tags: string[];
  onAddTag: (tag: string) => void;
  onDeleteTag: (tag: string) => void;
}

export default function TagChatModal({
  show,
  onClose,
  tags,
  onAddTag,
  onDeleteTag
}: TagChatModalProps) {
  const { t } = useTranslation();

  const handleTagsChange = (newTags: string[]) => {
    // Determine if a tag was added or removed
    if (newTags.length > tags.length) {
      // Tag was added
      const addedTag = newTags.find(tag => !tags.includes(tag));
      if (addedTag) {
        onAddTag(addedTag);
      }
    } else if (newTags.length < tags.length) {
      // Tag was removed
      const removedTag = tags.find(tag => !newTags.includes(tag));
      if (removedTag) {
        onDeleteTag(removedTag);
      }
    }
  };

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Tags')}</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <Tags
            tags={tags}
            onChange={handleTagsChange}
            placeholder={t('Add a tag')}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
