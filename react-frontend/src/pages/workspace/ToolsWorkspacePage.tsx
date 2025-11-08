import { useTranslation } from 'react-i18next';

export default function ToolsWorkspacePage() {
  const { t } = useTranslation();

  return (
    <div className="w-full text-center py-20">
      <div className="text-xl font-medium text-gray-400 dark:text-gray-600">
        {t('Tools Workspace')}
      </div>
      <div className="mt-1 text-sm text-gray-300 dark:text-gray-700">
        {t('Coming soon')}
      </div>
    </div>
  );
}

