import { useState } from 'react';
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
import { createUser } from '@/lib/apis/users';

interface AddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AddUserModal({
  open,
  onOpenChange,
  onSuccess
}: AddUserModalProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });

  const handleSave = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error(t('Please fill in all fields'));
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error(t('Please enter a valid email'));
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      toast.error(t('Password must be at least 8 characters'));
      return;
    }

    setSaving(true);
    try {
      await createUser(localStorage.token, formData);
      toast.success(t('User created successfully'));
      onSuccess();
      onOpenChange(false);
      setFormData({ name: '', email: '', password: '', role: 'user' });
    } catch (error: any) {
      toast.error(error.message || t('Failed to create user'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('Add User')}</DialogTitle>
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
            <Label htmlFor="password">{t('Password')} *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              placeholder={t('At least 8 characters')}
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
            {saving ? t('Creating...') : t('Create User')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

