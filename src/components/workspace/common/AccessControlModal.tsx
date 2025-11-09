import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { getGroups } from '@/lib/apis/groups';

interface AccessControlModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessControl?: {
    read?: {
      group_ids?: string[];
      user_ids?: string[];
    };
    write?: {
      group_ids?: string[];
      user_ids?: string[];
    };
  };
  onSave: (accessControl: any) => void;
}

interface Group {
  id: string;
  name: string;
}

export default function AccessControlModal({
  open,
  onOpenChange,
  accessControl = {},
  onSave
}: AccessControlModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [readAccess, setReadAccess] = useState<'public' | 'groups'>('public');
  const [writeAccess, setWriteAccess] = useState<'public' | 'groups'>('public');
  const [selectedReadGroups, setSelectedReadGroups] = useState<string[]>([]);
  const [selectedWriteGroups, setSelectedWriteGroups] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const fetchedGroups = await getGroups(localStorage.token);
        setGroups(fetchedGroups || []);

        // Initialize from existing access control
        if (accessControl?.read?.group_ids && accessControl.read.group_ids.length > 0) {
          setReadAccess('groups');
          setSelectedReadGroups(accessControl.read.group_ids);
        }
        if (accessControl?.write?.group_ids && accessControl.write.group_ids.length > 0) {
          setWriteAccess('groups');
          setSelectedWriteGroups(accessControl.write.group_ids);
        }
      } catch (error) {
        toast.error(t('Failed to load groups'));
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      init();
    }
  }, [open, accessControl, t]);

  const handleSave = () => {
    const newAccessControl: any = {};

    if (readAccess === 'groups') {
      newAccessControl.read = {
        group_ids: selectedReadGroups
      };
    }

    if (writeAccess === 'groups') {
      newAccessControl.write = {
        group_ids: selectedWriteGroups
      };
    }

    onSave(newAccessControl);
    onOpenChange(false);
  };

  const toggleReadGroup = (groupId: string) => {
    setSelectedReadGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const toggleWriteGroup = (groupId: string) => {
    setSelectedWriteGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('Access Control')}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Read Access */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t('Read Access')}</Label>
              <RadioGroup value={readAccess} onValueChange={(val) => setReadAccess(val as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="read-public" />
                  <Label htmlFor="read-public" className="font-normal cursor-pointer">
                    {t('Public (Everyone)')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="groups" id="read-groups" />
                  <Label htmlFor="read-groups" className="font-normal cursor-pointer">
                    {t('Specific Groups')}
                  </Label>
                </div>
              </RadioGroup>

              {readAccess === 'groups' && (
                <div className="ml-6 space-y-2 max-h-40 overflow-y-auto">
                  {groups.map((group) => (
                    <div key={group.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`read-${group.id}`}
                        checked={selectedReadGroups.includes(group.id)}
                        onCheckedChange={() => toggleReadGroup(group.id)}
                      />
                      <Label htmlFor={`read-${group.id}`} className="font-normal cursor-pointer">
                        {group.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Write Access */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">{t('Write Access')}</Label>
              <RadioGroup value={writeAccess} onValueChange={(val) => setWriteAccess(val as any)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="public" id="write-public" />
                  <Label htmlFor="write-public" className="font-normal cursor-pointer">
                    {t('Public (Everyone)')}
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="groups" id="write-groups" />
                  <Label htmlFor="write-groups" className="font-normal cursor-pointer">
                    {t('Specific Groups')}
                  </Label>
                </div>
              </RadioGroup>

              {writeAccess === 'groups' && (
                <div className="ml-6 space-y-2 max-h-40 overflow-y-auto">
                  {groups.map((group) => (
                    <div key={group.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`write-${group.id}`}
                        checked={selectedWriteGroups.includes(group.id)}
                        onCheckedChange={() => toggleWriteGroup(group.id)}
                      />
                      <Label htmlFor={`write-${group.id}`} className="font-normal cursor-pointer">
                        {group.name}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {t('Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

