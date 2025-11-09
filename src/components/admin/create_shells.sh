#!/bin/bash
cd "$(dirname "$0")"

# Create Settings components
for file in Connections Models Evaluations Tools Documents WebSearch CodeExecution Interface Audio Images Pipelines Database; do
  cat > "Settings/$file.tsx" << INNER_EOF
import { useTranslation } from 'react-i18next';

export default function $file() {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{t('$file')}</h2>
      <p className="text-muted-foreground">{t('Configure $file settings')}</p>
    </div>
  );
}
INNER_EOF
done

# Create Functions.tsx
cat > "Functions.tsx" << 'INNER_EOF'
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function Functions() {
  const { t } = useTranslation();
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('Functions')}</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t('Add Function')}
        </Button>
      </div>
    </div>
  );
}
INNER_EOF

# Create Evaluations.tsx
cat > "Evaluations.tsx" << 'INNER_EOF'
import { useTranslation } from 'react-i18next';

export default function Evaluations() {
  const { t } = useTranslation();
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">{t('Evaluations')}</h2>
    </div>
  );
}
INNER_EOF

echo "✅ All shell components created!"
