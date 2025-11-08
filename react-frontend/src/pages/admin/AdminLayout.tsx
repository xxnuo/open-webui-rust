import { useEffect } from 'react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import AppSidebar from '@/components/layout/AppSidebar';
import TopNav from '@/components/layout/TopNav';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default function AdminLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, WEBUI_NAME } = useAppStore();

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Set page title
  useEffect(() => {
    document.title = `${t('Admin Panel')} • ${WEBUI_NAME}`;
  }, [t, WEBUI_NAME]);

  if (user?.role !== 'admin') {
    return null;
  }

  const isActive = (path: string) => {
    return location.pathname.includes(path);
  };

  const navItems = [
    { path: '/admin/users', label: t('Users') },
    { path: '/admin/evaluations', label: t('Evaluations') },
    { path: '/admin/functions', label: t('Functions') },
    { path: '/admin/settings', label: t('Settings') },
  ];

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex h-full w-full flex-col">
          <TopNav />
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Navigation Header */}
            <nav className="px-2.5 pt-1.5 backdrop-blur-xl border-b">
              <div className="flex items-center gap-1">
                {/* Navigation tabs */}
                <div className="flex w-full">
                  <div className="flex gap-1 scrollbar-none overflow-x-auto w-fit text-center text-sm font-medium rounded-full bg-transparent pt-1">
                    {navItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={cn(
                          'min-w-fit p-1.5 transition',
                          isActive(item.path)
                            ? ''
                            : 'text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-white'
                        )}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </nav>

            {/* Content Area */}
            <div className="pb-1 flex-1 overflow-y-auto">
              <Outlet />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

