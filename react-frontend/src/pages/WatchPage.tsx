import { useTranslation } from 'react-i18next';

export default function WatchPage() {
  const { t } = useTranslation();

  return (
    <div className="w-full h-screen flex flex-col items-center justify-center">
      <div className="text-center">
        <div className="text-2xl font-medium text-gray-400 dark:text-gray-600">
          {t('Watch')}
        </div>
        <div className="mt-1 text-sm text-gray-300 dark:text-gray-700">
          {t('Coming soon')}
        </div>
      </div>
    </div>
  );
}

