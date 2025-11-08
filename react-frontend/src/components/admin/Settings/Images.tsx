import { useTranslation } from 'react-i18next';

export default function Images() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('Images')}</h2>
      <p className="text-muted-foreground">{t('Configure Images settings')}</p>
    </div>
  );
}
