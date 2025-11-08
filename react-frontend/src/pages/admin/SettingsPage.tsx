import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Settings from '@/components/admin/Settings';

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If on base settings page, redirect to general
    if (location.pathname === '/admin/settings') {
      navigate('/admin/settings/general', { replace: true });
    }
  }, [location.pathname, navigate]);

  return <Settings />;
}
