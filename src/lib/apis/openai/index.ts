import { OPENAI_API_BASE_URL, WEBUI_BASE_URL } from '@/lib/constants';

export const chatCompletion = async (
  token: string = '',
  body: object,
  url: string = `${WEBUI_BASE_URL}/api`
): Promise<[Response | null, AbortController]> => {
  const controller = new AbortController();
  let error = null;

  const res = await fetch(`${url}/chat/completions`, {
    signal: controller.signal,
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }).catch((err) => {
    console.error(err);
    error = err;
    return null;
  });

  if (error) {
    throw error;
  }

  return [res, controller];
};

export const generateOpenAIChatCompletion = async (
  token: string = '',
  body: object,
  url: string = `${WEBUI_BASE_URL}/api`
) => {
  let error = null;

  const res = await fetch(`${url}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(body)
  }).catch((err) => {
    console.error(err);
    error = err;
    return null;
  });

  if (error) {
    throw error;
  }

  if (!res) {
    throw new Error('No response from server');
  }

  if (!res.ok) {
    const errorData = await res.json();
    throw errorData;
  }

  // Check content type to determine if it's Socket.IO streaming or regular response
  const contentType = res.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');

  if (isJson) {
    const jsonResponse = await res.json();
    
    // Check if backend is using Socket.IO for streaming
    if (jsonResponse.status === 'streaming' && jsonResponse.message?.includes('Socket.IO')) {
      console.log('Using Socket.IO streaming for chat completion');
      // Return the streaming status response - Socket.IO will handle actual streaming
      return jsonResponse;
    }
    
    // Regular JSON response (non-streaming)
    return jsonResponse;
  }

  // If not JSON, it might be SSE streaming - shouldn't happen with generateOpenAIChatCompletion
  throw new Error('Unexpected response format');
};

export const getOpenAIModels = async (token: string, urlIdx?: number) => {
  let error = null;

  const res = await fetch(
    `${OPENAI_API_BASE_URL}/models${typeof urlIdx === 'number' ? `/${urlIdx}` : ''}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token && { authorization: `Bearer ${token}` })
      }
    }
  )
    .then(async (res) => {
      if (!res.ok) throw await res.json();
      return res.json();
    })
    .catch((err) => {
      error = `OpenAI: ${err?.error?.message ?? 'Network Problem'}`;
      return [];
    });

  if (error) {
    throw error;
  }

  return res;
};

export const getOpenAIConfig = async (token: string = '') => {
  let error = null;

  const res = await fetch(`${OPENAI_API_BASE_URL}/config`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token && { authorization: `Bearer ${token}` })
    }
  })
    .then(async (res) => {
      if (!res.ok) throw await res.json();
      return res.json();
    })
    .catch((err) => {
      console.error(err);
      if ('detail' in err) {
        error = err.detail;
      } else {
        error = 'Server connection failed';
      }
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

type OpenAIConfig = {
  ENABLE_OPENAI_API: boolean;
  OPENAI_API_BASE_URLS: string[];
  OPENAI_API_KEYS: string[];
  OPENAI_API_CONFIGS: object;
};

export const updateOpenAIConfig = async (token: string = '', config: OpenAIConfig) => {
  let error = null;

  const res = await fetch(`${OPENAI_API_BASE_URL}/config/update`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token && { authorization: `Bearer ${token}` })
    },
    body: JSON.stringify({
      ...config
    })
  })
    .then(async (res) => {
      if (!res.ok) throw await res.json();
      return res.json();
    })
    .catch((err) => {
      console.error(err);
      if ('detail' in err) {
        error = err.detail;
      } else {
        error = 'Server connection failed';
      }
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

export const getOpenAIModelsDirect = async (url: string, key: string) => {
  let error = null;

  const res = await fetch(`${url}/models`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(key && { authorization: `Bearer ${key}` })
    }
  })
    .then(async (res) => {
      if (!res.ok) throw await res.json();
      return res.json();
    })
    .catch((err) => {
      error = `OpenAI: ${err?.error?.message ?? 'Network Problem'}`;
      return [];
    });

  if (error) {
    throw error;
  }

  return res;
};

