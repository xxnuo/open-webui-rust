import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.extend(localizedFormat);

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const sanitizeResponseContent = (content: string) => {
  return content
    .replace(/<\|[a-z]*$/, '')
    .replace(/<\|[a-z]+\|$/, '')
    .replace(/<$/, '')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll(/<\|[a-z]+\|>/g, ' ')
    .trim();
};

export const processResponseContent = (content: string) => {
  return content.trim();
};

export const bestMatchingLanguage = (languages: string[], browserLanguages: string[], defaultLanguage: string = 'en-US') => {
  for (const browserLang of browserLanguages) {
    const match = languages.find(lang => lang.toLowerCase() === browserLang.toLowerCase());
    if (match) return match;
    
    // Try partial match (e.g., 'en' matches 'en-US')
    const partialMatch = languages.find(lang => 
      lang.toLowerCase().startsWith(browserLang.toLowerCase().split('-')[0])
    );
    if (partialMatch) return partialMatch;
  }
  return defaultLanguage;
};

export const convertOpenApiToToolPayload = (openapi: Record<string, unknown>) => {
  // Simplified version - can be expanded later
  return openapi;
};

export const getTimeRange = (timestamp: number) => {
  const now = new Date();
  const date = new Date(timestamp * 1000); // Convert Unix timestamp to milliseconds

  // Calculate the difference in milliseconds
  const diffTime = now.getTime() - date.getTime();
  const diffDays = diffTime / (1000 * 3600 * 24);

  const nowDate = now.getDate();
  const nowMonth = now.getMonth();
  const nowYear = now.getFullYear();

  const dateDate = date.getDate();
  const dateMonth = date.getMonth();
  const dateYear = date.getFullYear();

  if (nowYear === dateYear && nowMonth === dateMonth && nowDate === dateDate) {
    return 'Today';
  } else if (nowYear === dateYear && nowMonth === dateMonth && nowDate - dateDate === 1) {
    return 'Yesterday';
  } else if (diffDays <= 7) {
    return 'Previous 7 days';
  } else if (diffDays <= 30) {
    return 'Previous 30 days';
  } else if (nowYear === dateYear) {
    return date.toLocaleString('default', { month: 'long' });
  } else {
    return date.getFullYear().toString();
  }
};

export const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

export const capitalizeFirstLetter = (str: string) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const slugify = (str: string) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

export { dayjs };

