import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import SensitiveInput from '@/components/common/SensitiveInput';
import { updateUserPassword } from '@/lib/apis/auths';

interface UpdatePasswordModalProps {
  show: boolean;
  onClose: () => void;
}

export default function UpdatePasswordModal({ show, onClose }: UpdatePasswordModalProps) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== newPasswordConfirm) {
      toast.error(
        t("The passwords you entered don't quite match. Please double-check and try again.")
      );
      setNewPassword('');
      setNewPasswordConfirm('');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.token;
      const res = await updateUserPassword(token, currentPassword, newPassword);
      
      if (res) {
        toast.success(t('Successfully updated.'));
        setCurrentPassword('');
        setNewPassword('');
        setNewPasswordConfirm('');
        onClose();
      }
    } catch (error) {
      const err = error as { message?: string };
      toast.error(err.message || t('Failed to update password'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setNewPasswordConfirm('');
    onClose();
  };

  return (
    <Dialog open={show} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('Change Password')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-password" className="text-xs text-muted-foreground">
                {t('Current Password')}
              </Label>
              <SensitiveInput
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder={t('Enter your current password')}
                autoComplete="current-password"
                required
                inputClassName="w-full text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-xs text-muted-foreground">
                {t('New Password')}
              </Label>
              <SensitiveInput
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('Enter your new password')}
                autoComplete="new-password"
                required
                inputClassName="w-full text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-xs text-muted-foreground">
                {t('Confirm Password')}
              </Label>
              <SensitiveInput
                id="confirm-password"
                type="password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                placeholder={t('Confirm your new password')}
                autoComplete="off"
                required
                inputClassName="w-full text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              {t('Cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('Updating...') : t('Update password')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

