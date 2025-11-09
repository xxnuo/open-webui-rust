import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Plus, Search } from 'lucide-react';
import { useAppStore } from '@/store';
import { getUsers } from '@/lib/apis/users';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function UserList() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') || '' : '';

  useEffect(() => {
    loadUsers();
  }, [page, searchQuery]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await getUsers(token, searchQuery, undefined, undefined, page);
      console.log('Users API response:', data); // Debug log
      if (data) {
        // Handle different response structures
        if (Array.isArray(data)) {
          setUsers(data);
        } else if (data.items && Array.isArray(data.items)) {
          setUsers(data.items);
        } else if (data.users && Array.isArray(data.users)) {
          setUsers(data.users);
        } else {
          console.error('Unexpected users data structure:', data);
          setUsers([]);
        }
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error(t('Failed to load users'));
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('Users')}</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t('Add User')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('Search users...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Users Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('Name')}</TableHead>
              <TableHead>{t('Email')}</TableHead>
              <TableHead>{t('Role')}</TableHead>
              <TableHead>{t('Created')}</TableHead>
              <TableHead className="text-right">{t('Actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  {t('Loading...')}
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {t('No users found')}
                </TableCell>
              </TableRow>
            ) : (
              Array.isArray(users) && users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary">
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.created_at ? new Date(user.created_at * 1000).toLocaleDateString() : '-'}
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

      {/* Pagination */}
      {users.length > 0 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            {t('Previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('Page')} {page}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={users.length < 20}
          >
            {t('Next')}
          </Button>
        </div>
      )}
    </div>
  );
}

