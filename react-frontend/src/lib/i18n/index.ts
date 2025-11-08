import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

export const initI18n = (defaultLocale?: string | undefined) => {
  const detectionOrder = defaultLocale
    ? ['querystring', 'localStorage']
    : ['querystring', 'localStorage', 'navigator'];
  const fallbackDefaultLocale = defaultLocale ? [defaultLocale] : ['en-US'];

  const loadResource = (language: string, namespace: string) =>
    import(`./locales/${language}/${namespace}.json`);

  i18next
    .use(resourcesToBackend(loadResource))
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      debug: false,
      detection: {
        order: detectionOrder,
        caches: ['localStorage'],
        lookupQuerystring: 'lang',
        lookupLocalStorage: 'locale'
      },
      fallbackLng: {
        default: fallbackDefaultLocale
      },
      ns: 'translation',
      returnEmptyString: false,
      interpolation: {
        escapeValue: false // React already escapes by default
      }
    });

  const lang = i18next?.language || defaultLocale || 'en-US';
  document.documentElement.setAttribute('lang', lang);
};

export const getLanguages = async () => {
  const languages = (await import(`./locales/languages.json`)).default;
  return languages;
};

export const changeLanguage = (lang: string) => {
  document.documentElement.setAttribute('lang', lang);
  i18next.changeLanguage(lang);
};

export default i18next;

