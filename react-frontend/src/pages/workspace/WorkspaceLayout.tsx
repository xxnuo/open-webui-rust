import { useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store';
import { Button } from '@/components/ui/button';
import AppSidebar from '@/components/layout/AppSidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

export default function WorkspaceLayout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, WEBUI_NAME, mobile, showSidebar, setShowSidebar } = useAppStore();

  useEffect(() => {
    document.title = `${t('Workspace')} • ${WEBUI_NAME}`;
  }, [t, WEBUI_NAME]);

  // Redirect to first available workspace section if on root
  useEffect(() => {
    if (location.pathname === '/workspace') {
      if (user?.role === 'admin') {
        navigate('/workspace/models');
      } else if (user?.permissions?.workspace?.models) {
        navigate('/workspace/models');
      } else if (user?.permissions?.workspace?.knowledge) {
        navigate('/workspace/knowledge');
      } else if (user?.permissions?.workspace?.prompts) {
        navigate('/workspace/prompts');
      } else if (user?.permissions?.workspace?.tools) {
        navigate('/workspace/tools');
      } else {
        navigate('/');
      }
    }
  }, [location.pathname, user, navigate]);

  const tabs = [
    { name: 'Models', path: '/workspace/models', permission: 'models' },
    { name: 'Knowledge', path: '/workspace/knowledge', permission: 'knowledge' },
    { name: 'Prompts', path: '/workspace/prompts', permission: 'prompts' },
    { name: 'Tools', path: '/workspace/tools', permission: 'tools' },
  ];

  const hasPermission = (permission: string) => {
    return user?.role === 'admin' || user?.permissions?.workspace?.[permission];
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-full w-full">
          <nav className="px-2.5 pt-1.5 backdrop-blur-xl">
            <div className="flex items-center gap-1">
              {mobile && (
                <div className={showSidebar ? 'md:hidden' : ''}>
                  <button
                    className="cursor-pointer flex rounded-lg hover:bg-gray-100 dark:hover:bg-gray-850 transition p-1.5"
                    onClick={() => setShowSidebar(!showSidebar)}
                    aria-label={showSidebar ? t('Close Sidebar') : t('Open Sidebar')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                      />
                    </svg>
                  </button>
                </div>
              )}

              <div className="flex gap-1 overflow-x-auto w-fit text-center text-sm font-medium rounded-full bg-transparent py-1">
                {tabs.filter(tab => hasPermission(tab.permission)).map((tab) => (
                  <Link key={tab.path} to={tab.path}>
                    <Button
                      variant={location.pathname.startsWith(tab.path) ? 'default' : 'ghost'}
                      size="sm"
                      className="rounded-full"
                    >
                      {t(tab.name)}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          <div className="flex-1 overflow-auto p-4">
            <Outlet />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

