import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { getUserGroups } from '@/lib/apis/users';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function Groups() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') || '' : '';

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await getUserGroups(token);
      if (data) {
        setGroups(data);
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
      toast.error(t('Failed to load groups'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('Groups')}</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t('Add Group')}
        </Button>
      </div>

      {/* Groups Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Group Name')}</TableHead>
              <TableHead>{t('Members')}</TableHead>
              <TableHead>{t('Permissions')}</TableHead>
              <TableHead className="text-right">{t('Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8">
                  {t('Loading...')}
                </TableCell>
              </TableRow>
            ) : groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  {t('No groups found')}
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>{group.user_count || 0}</TableCell>
                  <TableCell>
                    {group.permissions ? Object.keys(group.permissions).length : 0} {t('permissions')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      {t('Edit')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

