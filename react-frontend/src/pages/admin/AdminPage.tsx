import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to users page by default
    navigate('/admin/users', { replace: true });
  }, [navigate]);

  return null;
}
