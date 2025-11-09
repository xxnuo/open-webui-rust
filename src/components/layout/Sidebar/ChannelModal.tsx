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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { deleteChannelById } from '@/lib/apis/channels';
import { useNavigate, useLocation } from 'react-router-dom';

interface Channel {
  id?: string;
  name: string;
  access_control?: any;
}

interface ChannelModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; access_control: any }) => Promise<void>;
  onUpdate?: () => void;
  channel?: Channel | null;
  edit?: boolean;
}

export default function ChannelModal({
  show,
  onClose,
  onSubmit,
  onUpdate = () => {},
  channel = null,
  edit = false
}: ChannelModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState('');
  const [accessControl, setAccessControl] = useState({});
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (show) {
      if (channel) {
        setName(channel.name);
        setAccessControl(channel.access_control || {});
      }
    } else {
      // Reset form
      setName('');
      setAccessControl({});
      setLoading(false);
    }
  }, [show, channel]);

  // Auto-format name to lowercase with dashes
  const handleNameChange = (value: string) => {
    setName(value.replace(/\s/g, '-').toLowerCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        name: name.replace(/\s/g, '-'),
        access_control: accessControl
      });
      onClose();
    } catch (error) {
      console.error('Failed to submit channel:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!channel?.id) return;
    
    setShowDeleteConfirm(false);
    try {
      const token = localStorage.getItem('token') || '';
      await deleteChannelById(token, channel.id);
      toast.success(t('Channel deleted successfully'));
      onUpdate();
      
      // Navigate away if currently on the deleted channel page
      if (location.pathname === `/channels/${channel.id}`) {
        navigate('/');
      }
      
      onClose();
    } catch (error: any) {
      toast.error(error.message || t('Failed to delete channel'));
    }
  };

  return (
    <>
      <Dialog open={show && !showDeleteConfirm} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {edit ? t('Edit Channel') : t('Create Channel')}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="channel-name" className="text-xs text-gray-500">
                {t('Channel Name')}
              </Label>
              <Input
                id="channel-name"
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder={t('new-channel')}
                autoComplete="off"
                required
              />
            </div>

            {/* TODO: Add AccessControl component */}
            {/* <div className="my-2">
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-950 rounded-3xl">
                <AccessControl 
                  accessControl={accessControl}
                  onChange={setAccessControl}
                />
              </div>
            </div> */}

            <DialogFooter className="flex justify-end gap-2">
              {edit && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  {t('Delete')}
                </Button>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="bg-black hover:bg-gray-950 text-white dark:bg-white dark:text-black dark:hover:bg-gray-100"
              >
                {loading ? t('Loading...') : edit ? t('Update') : t('Create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t('Confirm Delete')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('Are you sure you want to delete this channel?')}
          </p>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              {t('Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              {t('Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

