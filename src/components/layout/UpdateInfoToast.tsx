import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface Version {
  current: string;
  latest: string;
}

interface UpdateInfoToastProps {
  version: Version;
  onClose: () => void;
}

export const UpdateInfoToast: React.FC<UpdateInfoToastProps> = ({ version, onClose }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-start bg-[#F1F8FE] dark:bg-[#020C1D] border border-[#3371D5] dark:border-[#03113B] text-[#2B6CD4] dark:text-[#6795EC] rounded-lg px-3.5 py-3 text-xs max-w-80 pr-2 w-full shadow-lg">
      <div className="flex-1 font-medium">
        {t(`A new version (v{{LATEST_VERSION}}) is now available.`, {
          LATEST_VERSION: version.latest,
        })}
        <a
          href="https://github.com/knoxchat/open-webui-rust/releases"
          target="_blank"
          rel="noopener noreferrer"
          className="underline ml-1"
        >
          {t('Update for the latest features and improvements.')}
        </a>
      </div>

      <div className="shrink-0 pr-1">
        <button
          onClick={onClose}
          className="hover:text-blue-900 dark:hover:text-blue-300 transition"
          aria-label={t('Close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default UpdateInfoToast;

