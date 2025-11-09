import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface AddFilesPlaceholderProps {
  title?: string;
  content?: string;
  children?: ReactNode;
}

export const AddFilesPlaceholder: React.FC<AddFilesPlaceholderProps> = ({
  title,
  content,
  children,
}) => {
  const { t } = useTranslation();

  return (
    <div className="px-3">
      <div className="text-center dark:text-white text-2xl font-medium z-50">
        {title || t('Add Files')}
      </div>

      {children ? (
        <div>{children}</div>
      ) : (
        <div className="px-2 mt-2 text-center text-gray-700 dark:text-gray-200 w-full">
          {content || t('Drop any files here to upload')}
        </div>
      )}
    </div>
  );
};

export default AddFilesPlaceholder;

