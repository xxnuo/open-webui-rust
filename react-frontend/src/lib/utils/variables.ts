/**
 * Extract template variables from text
 * Matches {{VARIABLE_NAME}} or {{VARIABLE_NAME|default}}
 */
export function extractInputVariables(text: string): Record<string, { default?: string }> {
  const variables: Record<string, { default?: string }> = {};
  const regex = /{{\s*([^|}]+)(?:\|([^}]*))?\s*}}/g;
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    const varName = match[1].trim();
    const defaultValue = match[2]?.trim();
    
    variables[varName] = {
      default: defaultValue
    };
  }
  
  return variables;
}

/**
 * Replace variables in text with provided values
 */
export function replaceVariables(
  text: string,
  variables: Record<string, unknown>
): string {
  return text.replace(/{{\s*([^|}]+)(?:\|[^}]*)?\s*}}/g, (match, varName) => {
    const trimmedVarName = varName.trim();
    return Object.prototype.hasOwnProperty.call(variables, trimmedVarName)
      ? String(variables[trimmedVarName])
      : match;
  });
}

/**
 * Find next template variable in text
 */
export function findNextTemplate(text: string, from = 0): { start: number; end: number } | null {
  const patterns = [{ start: '{{', end: '}}' }];
  
  for (const pattern of patterns) {
    const startIndex = text.indexOf(pattern.start, from);
    if (startIndex !== -1) {
      const endIndex = text.indexOf(pattern.end, startIndex + pattern.start.length);
      if (endIndex !== -1) {
        return {
          start: startIndex,
          end: endIndex + pattern.end.length
        };
      }
    }
  }
  
  return null;
}

/**
 * Get current datetime in specified format
 */
export function getCurrentDateTime(format = 'YYYY-MM-DD HH:mm:ss'): string {
  const now = new Date();
  
  const map: Record<string, string> = {
    'YYYY': now.getFullYear().toString(),
    'MM': String(now.getMonth() + 1).padStart(2, '0'),
    'DD': String(now.getDate()).padStart(2, '0'),
    'HH': String(now.getHours()).padStart(2, '0'),
    'mm': String(now.getMinutes()).padStart(2, '0'),
    'ss': String(now.getSeconds()).padStart(2, '0'),
  };
  
  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, (matched) => map[matched]);
}

/**
 * Built-in variable replacements
 */
export async function processBuiltInVariables(text: string): Promise<string> {
  let processed = text;
  
  // {{CURRENT_DATE}}
  if (processed.includes('{{CURRENT_DATE}}')) {
    processed = processed.replaceAll('{{CURRENT_DATE}}', getCurrentDateTime('YYYY-MM-DD'));
  }
  
  // {{CURRENT_TIME}}
  if (processed.includes('{{CURRENT_TIME}}')) {
    processed = processed.replaceAll('{{CURRENT_TIME}}', getCurrentDateTime('HH:mm:ss'));
  }
  
  // {{CURRENT_DATETIME}}
  if (processed.includes('{{CURRENT_DATETIME}}')) {
    processed = processed.replaceAll('{{CURRENT_DATETIME}}', getCurrentDateTime('YYYY-MM-DD HH:mm:ss'));
  }
  
  // {{CLIPBOARD}}
  if (processed.includes('{{CLIPBOARD}}')) {
    try {
      const clipboardText = await navigator.clipboard.readText();
      processed = processed.replaceAll('{{CLIPBOARD}}', clipboardText);
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  }
  
  // {{USER_LOCATION}}
  if (processed.includes('{{USER_LOCATION}}')) {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      const location = `${position.coords.latitude}, ${position.coords.longitude}`;
      processed = processed.replaceAll('{{USER_LOCATION}}', location);
    } catch (error) {
      console.error('Failed to get location:', error);
      processed = processed.replaceAll('{{USER_LOCATION}}', 'LOCATION_UNKNOWN');
    }
  }
  
  return processed;
}

