import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { useTranslation } from 'react-i18next';

/**
 * Error Page Component
 * Matches Svelte's /error page behavior - shown when backend is not detected
 * Equivalent to: src/routes/error/+page.svelte
 */
export default function ErrorPage() {
  const navigate = useNavigate();
  const { config, WEBUI_NAME } = useAppStore();
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // If config is available, redirect to home (backend is working)
    // This matches Svelte's behavior: if ($config) { await goto('/'); }
    if (config) {
      navigate('/');
    }

    setLoaded(true);
  }, [config, navigate]);

  if (!loaded) {
    return null;
  }

  return (
    <div className="absolute w-full h-full flex z-50">
      <div className="absolute rounded-xl w-full h-full backdrop-blur-sm flex justify-center">
        <div className="m-auto pb-44 flex flex-col justify-center">
          <div className="max-w-md">
            <div className="text-center text-2xl font-medium z-50">
              {t('{{webUIName}} Backend Required', { webUIName: WEBUI_NAME })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

