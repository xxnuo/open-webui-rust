import { useTranslation } from 'react-i18next';

export default function Interface() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('Interface')}</h2>
      <p className="text-muted-foreground">{t('Configure Interface settings')}</p>
    </div>
  );
}
