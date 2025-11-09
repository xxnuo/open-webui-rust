import { useTranslation } from 'react-i18next';

export default function Pipelines() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('Pipelines')}</h2>
      <p className="text-muted-foreground">{t('Configure Pipelines settings')}</p>
    </div>
  );
}
