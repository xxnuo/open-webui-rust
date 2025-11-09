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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { updateUserById } from '@/lib/apis/users';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  profile_image_url?: string;
}

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onSuccess: () => void;
}

export default function EditUserModal({
  open,
  onOpenChange,
  user,
  onSuccess
}: EditUserModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    profile_image_url: '',
    password: ''
  });

  useEffect(() => {
    if (user && open) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        profile_image_url: user.profile_image_url || '',
        password: ''
      });
    }
  }, [user, open]);

  const handleSave = async () => {
    if (!user) return;

    if (!formData.name || !formData.email) {
      toast.error(t('Please fill in required fields'));
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error(t('Please enter a valid email'));
      return;
    }

    // Validate password if provided
    if (formData.password && formData.password.length < 8) {
      toast.error(t('Password must be at least 8 characters'));
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        profile_image_url: formData.profile_image_url || undefined
      };

      // Only include password if it was changed
      if (formData.password) {
        updateData.password = formData.password;
      }

      await updateUserById(localStorage.token, user.id, updateData);
      toast.success(t('User updated successfully'));
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || t('Failed to update user'));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('Edit User')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('Name')} *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder={t('John Doe')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{t('Email')} *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="user@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t('New Password')}</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder={t('Leave blank to keep current password')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-image">{t('Profile Image URL')}</Label>
            <Input
              id="profile-image"
              value={formData.profile_image_url}
              onChange={(e) =>
                setFormData({ ...formData, profile_image_url: e.target.value })
              }
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">{t('Role')} *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) =>
                setFormData({ ...formData, role: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">{t('User')}</SelectItem>
                <SelectItem value="admin">{t('Admin')}</SelectItem>
                <SelectItem value="pending">{t('Pending')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('Saving...') : t('Save Changes')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

