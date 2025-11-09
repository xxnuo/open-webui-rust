import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import localizedFormat from 'dayjs/plugin/localizedFormat';

dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.extend(localizedFormat);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Canvas pixel test for fingerprint detection
export const canvasPixelTest = () => {
  // Test a 1x1 pixel to potentially identify browser/plugin fingerprint blocking or spoofing
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  
  canvas.height = 1;
  canvas.width = 1;
  const imageData = new ImageData(canvas.width, canvas.height);
  const pixelValues = imageData.data;

  // Generate RGB test data
  for (let i = 0; i < imageData.data.length; i += 1) {
    if (i % 4 !== 3) {
      pixelValues[i] = Math.floor(256 * Math.random());
    } else {
      pixelValues[i] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const p = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

  // Read RGB data back and verify
  for (let i = 0; i < p.length; i += 1) {
    if (p[i] !== pixelValues[i]) {
      console.log(
        'canvasPixelTest: Wrong canvas pixel RGB value detected:',
        p[i],
        'at:',
        i,
        'expected:',
        pixelValues[i]
      );
      console.log('canvasPixelTest: Canvas blocking or spoofing is likely');
      return false;
    }
  }

  return true;
};

// Generate initials image for user avatar
export const generateInitialsImage = (name: string) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 100;
  canvas.height = 100;

  if (!ctx) return '/user.png';

  if (!canvasPixelTest()) {
    console.log(
      'generateInitialsImage: failed pixel test, fingerprint evasion is likely. Using default image.'
    );
    return '/user.png';
  }

  ctx.fillStyle = '#F39C12';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '40px Helvetica';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const sanitizedName = name.trim();
  const initials =
    sanitizedName.length > 0
      ? sanitizedName[0] +
        (sanitizedName.split(' ').length > 1
          ? sanitizedName[sanitizedName.lastIndexOf(' ') + 1]
          : '')
      : '';

  ctx.fillText(initials.toUpperCase(), canvas.width / 2, canvas.height / 2);

  return canvas.toDataURL();
};

// Copy text to clipboard
export const copyToClipboard = async (text: string) => {
  let result = false;
  if (!navigator.clipboard) {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.position = 'fixed';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      const msg = successful ? 'successful' : 'unsuccessful';
      console.log('Fallback: Copying text command was ' + msg);
      result = successful;
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
    return result;
  }
  result = await navigator.clipboard.writeText(text).then(
    function () {
      console.log('Async: Copying to clipboard was successful!');
      return true;
    },
    function (err) {
      console.error('Async: Could not copy text: ', err);
      return false;
    }
  );
  return result;
};

export { dayjs };

// Group timestamps by time range
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

// Capitalize first letter of string
export const capitalizeFirstLetter = (str: string) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Slugify string for URLs
export const slugify = (str: string) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Remove specific details from content
export const removeDetails = (content: string, types: string[]) => {
  let result = content;
  for (const type of types) {
    const detailsRegex = new RegExp(`<details\\s+type="${type}"([^>]*)>([\\s\\S]*?)<\\/details>`, 'gis');
    result = result.replace(detailsRegex, '');
  }
  return result;
};

// Remove all details from content
export const removeAllDetails = (content: string) => {
  return content.replace(/<details[\s\S]*?<\/details>/gi, '');
};

// Process details in content for sending to API
export const processDetails = (content: string) => {
  let result = removeDetails(content, ['reasoning', 'code_interpreter']);
  
  // This regex matches <details> tags with type="tool_calls" and captures their attributes to convert them to a string
  const detailsRegex = /<details\s+type="tool_calls"([^>]*)>([\s\S]*?)<\/details>/gis;
  const matches = result.match(detailsRegex);
  
  if (matches) {
    for (const match of matches) {
      const attributesRegex = /(\w+)="([^"]*)"/g;
      const attributes: Record<string, string> = {};
      let attributeMatch;
      
      while ((attributeMatch = attributesRegex.exec(match)) !== null) {
        attributes[attributeMatch[1]] = attributeMatch[2];
      }
      
      result = result.replace(match, `"${attributes.result || ''}"`);
    }
  }
  
  return result;
};
