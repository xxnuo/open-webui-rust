import { WEBUI_BASE_URL } from '@/lib/constants';
import { getOpenAIModelsDirect } from './openai';

export const getModels = async (
  token: string = '',
  connections: Record<string, unknown> | null = null,
  base: boolean = false,
  refresh: boolean = false
) => {
  const searchParams = new URLSearchParams();
  if (refresh) {
    searchParams.append('refresh', 'true');
  }

  let error = null;
  const res = await fetch(
    `${WEBUI_BASE_URL}/api/models${base ? '/base' : ''}?${searchParams.toString()}`,
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
      error = err;
      console.error(err);
      return null;
    });

  if (error) {
    throw error;
  }

  let models = res?.data ?? [];

  if (connections && !base) {
    let localModels: unknown[] = [];

    if (connections) {
      const OPENAI_API_BASE_URLS = connections.OPENAI_API_BASE_URLS as string[];
      const OPENAI_API_KEYS = connections.OPENAI_API_KEYS as string[];
      const OPENAI_API_CONFIGS = connections.OPENAI_API_CONFIGS as Record<string, unknown>;

      const requests = [];
      for (const idx in OPENAI_API_BASE_URLS) {
        const url = OPENAI_API_BASE_URLS[idx];

        if (idx.toString() in OPENAI_API_CONFIGS) {
          const apiConfig = (OPENAI_API_CONFIGS[idx.toString()] ?? {}) as Record<string, unknown>;

          const enable = (apiConfig?.enable ?? true) as boolean;
          const modelIds = (apiConfig?.model_ids ?? []) as string[];

          if (enable) {
            if (modelIds.length > 0) {
              const modelList = {
                object: 'list',
                data: modelIds.map((modelId) => ({
                  id: modelId,
                  name: modelId,
                  owned_by: 'openai',
                  openai: { id: modelId },
                  urlIdx: idx
                }))
              };

              requests.push(
                (async () => {
                  return modelList;
                })()
              );
            } else {
              requests.push(
                (async () => {
                  return await getOpenAIModelsDirect(url, OPENAI_API_KEYS[idx])
                    .then((res) => {
                      return res;
                    })
                    .catch(() => {
                      return {
                        object: 'list',
                        data: [],
                        urlIdx: idx
                      };
                    });
                })()
              );
            }
          } else {
            requests.push(
              (async () => {
                return {
                  object: 'list',
                  data: [],
                  urlIdx: idx
                };
              })()
            );
          }
        }
      }

      const responses = await Promise.all(requests);

      for (const idx in responses) {
        const response = responses[idx] as { data?: unknown[] } | unknown[];
        const apiConfig = (OPENAI_API_CONFIGS[idx.toString()] ?? {}) as Record<string, unknown>;

        let responseModels = Array.isArray(response) ? response : (response?.data ?? []);
        responseModels = responseModels.map((model: unknown) => ({ 
          ...(model as Record<string, unknown>), 
          openai: { id: (model as { id: string }).id }, 
          urlIdx: idx 
        }));

        const prefixId = apiConfig.prefix_id as string | undefined;
        if (prefixId) {
          for (const model of responseModels) {
            (model as { id: string }).id = `${prefixId}.${(model as { id: string }).id}`;
          }
        }

        const tags = apiConfig.tags;
        if (tags) {
          for (const model of responseModels) {
            (model as Record<string, unknown>).tags = tags;
          }
        }

        localModels = localModels.concat(responseModels);
      }
    }

    models = models.concat(
      localModels.map((model) => ({
        ...(model as Record<string, unknown>),
        name: (model as { name?: string; id: string }).name ?? (model as { id: string }).id,
        direct: true
      }))
    );

    // Remove duplicates
    const modelsMap: Record<string, unknown> = {};
    for (const model of models) {
      modelsMap[(model as { id: string }).id] = model;
    }

    models = Object.values(modelsMap);
  }

  return models;
};

type ChatCompletedForm = {
  model: string;
  messages: string[];
  chat_id: string;
  session_id: string;
};

export const chatCompleted = async (token: string, body: ChatCompletedForm) => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/chat/completed`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token && { authorization: `Bearer ${token}` })
    },
    body: JSON.stringify(body)
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
        error = err;
      }
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

export const getBackendConfig = async () => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/config`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  })
    .then(async (res) => {
      if (!res.ok) throw await res.json();
      return res.json();
    })
    .catch((err) => {
      console.error(err);
      error = err;
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

export const stopTask = async (token: string, id: string) => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/tasks/stop/${id}`, {
    method: 'POST',
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
        error = err;
      }
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

export interface ModelConfig {
  id: string;
  name: string;
  meta: ModelMeta;
  base_model_id?: string;
  params: ModelParams;
}

export interface ModelMeta {
  toolIds: never[];
  description?: string;
  capabilities?: Record<string, unknown>;
  profile_image_url?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ModelParams extends Record<string, unknown> {}

export type GlobalModelConfig = ModelConfig[];

export const getModelConfig = async (token: string): Promise<GlobalModelConfig> => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/config/models`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
    .then(async (res) => {
      if (!res.ok) throw await res.json();
      return res.json();
    })
    .catch((err) => {
      console.error(err);
      error = err;
      return null;
    });

  if (error) {
    throw error;
  }

  return res.models;
};

export const executeToolServer = async (
  token: string,
  url: string,
  name: string,
  params: Record<string, unknown>,
  serverData: { openapi: Record<string, unknown>; info: Record<string, unknown>; specs: Record<string, unknown> }
) => {
  try {
    // Find the matching operationId in the OpenAPI spec
    const matchingRoute = Object.entries(serverData.openapi.paths as Record<string, unknown>).find(([, methods]) =>
      Object.entries(methods as Record<string, unknown>).some(([, operation]) => 
        (operation as { operationId?: string }).operationId === name
      )
    );

    if (!matchingRoute) {
      throw new Error(`No matching route found for operationId: ${name}`);
    }

    const [routePath, methods] = matchingRoute;

    const methodEntry = Object.entries(methods as Record<string, unknown>).find(
      ([, operation]) => (operation as { operationId?: string }).operationId === name
    );

    if (!methodEntry) {
      throw new Error(`No matching method found for operationId: ${name}`);
    }

    const [httpMethod, operation]: [string, unknown] = methodEntry;

    // Split parameters by type
    const pathParams: Record<string, unknown> = {};
    const queryParams: Record<string, unknown> = {};
    let bodyParams: Record<string, unknown> = {};

    const operationObj = operation as { parameters?: Array<{ name: string; in: string }>; requestBody?: { content: Record<string, unknown> } };

    if (operationObj.parameters) {
      operationObj.parameters.forEach((param) => {
        const paramName = param.name;
        const paramIn = param.in;
        if (Object.prototype.hasOwnProperty.call(params, paramName)) {
          if (paramIn === 'path') {
            pathParams[paramName] = params[paramName];
          } else if (paramIn === 'query') {
            queryParams[paramName] = params[paramName];
          }
        }
      });
    }

    let finalUrl = `${url}${routePath}`;

    // Replace path parameters (`{param}`)
    Object.entries(pathParams).forEach(([key, value]) => {
      finalUrl = finalUrl.replace(new RegExp(`{${key}}`, 'g'), encodeURIComponent(value as string));
    });

    // Append query parameters to URL if any
    if (Object.keys(queryParams).length > 0) {
      const queryString = new URLSearchParams(
        Object.entries(queryParams).map(([k, v]) => [k, String(v)])
      ).toString();
      finalUrl += `?${queryString}`;
    }

    // Handle requestBody composite
    if (operationObj.requestBody && operationObj.requestBody.content) {
      if (params !== undefined) {
        bodyParams = params;
      } else {
        // Optional: Fallback or explicit error if body is expected but not provided
        throw new Error(`Request body expected for operation '${name}' but none found.`);
      }
    }

    // Prepare headers and request options
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token && { authorization: `Bearer ${token}` })
    };

    const requestOptions: RequestInit = {
      method: httpMethod.toUpperCase(),
      headers
    };

    if (['post', 'put', 'patch'].includes(httpMethod.toLowerCase()) && operationObj.requestBody) {
      requestOptions.body = JSON.stringify(bodyParams);
    }

    const res = await fetch(finalUrl, requestOptions);
    if (!res.ok) {
      const resText = await res.text();
      throw new Error(`HTTP error! Status: ${res.status}. Message: ${resText}`);
    }

    // make a clone of res and extract headers
    const responseHeaders: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const text = await res.text();
    let responseData;

    try {
      responseData = JSON.parse(text);
    } catch {
      responseData = text;
    }
    return [responseData, responseHeaders];
  } catch (err) {
    const error_msg = (err as { message?: string }).message || 'Unknown error';
    console.error('API Request Error:', error_msg);
    return [{ error: error_msg }, null];
  }
};

export const generateTitle = async (
  token: string = '',
  model: string,
  messages: object[],
  chat_id?: string
) => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/v1/tasks/title/completions`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      ...(chat_id && { chat_id: chat_id })
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
      }
      return null;
    });

  if (error) {
    throw error;
  }

  try {
    const response = res?.choices[0]?.message?.content ?? '';
    const sanitizedResponse = response.replace(/['''`]/g, '"');
    const jsonStartIndex = sanitizedResponse.indexOf('{');
    const jsonEndIndex = sanitizedResponse.lastIndexOf('}');

    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      const jsonResponse = sanitizedResponse.substring(jsonStartIndex, jsonEndIndex + 1);
      const parsed = JSON.parse(jsonResponse);

      if (parsed && parsed.title) {
        return parsed.title;
      } else {
        return null;
      }
    }

    return null;
  } catch (e) {
    console.error('Failed to parse response: ', e);
    return null;
  }
};

export const generateFollowUps = async (
  token: string = '',
  model: string,
  messages: string,
  chat_id?: string
) => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/v1/tasks/follow_ups/completions`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      ...(chat_id && { chat_id: chat_id })
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
      }
      return null;
    });

  if (error) {
    throw error;
  }

  try {
    const response = res?.choices[0]?.message?.content ?? '';
    const sanitizedResponse = response.replace(/['''`]/g, '"');
    const jsonStartIndex = sanitizedResponse.indexOf('{');
    const jsonEndIndex = sanitizedResponse.lastIndexOf('}');

    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      const jsonResponse = sanitizedResponse.substring(jsonStartIndex, jsonEndIndex + 1);
      const parsed = JSON.parse(jsonResponse);

      if (parsed && parsed.follow_ups) {
        return Array.isArray(parsed.follow_ups) ? parsed.follow_ups : [];
      } else {
        return [];
      }
    }

    return [];
  } catch (e) {
    console.error('Failed to parse response: ', e);
    return [];
  }
};

export const generateTags = async (
  token: string = '',
  model: string,
  messages: string,
  chat_id?: string
) => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/v1/tasks/tags/completions`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      ...(chat_id && { chat_id: chat_id })
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
      }
      return null;
    });

  if (error) {
    throw error;
  }

  try {
    const response = res?.choices[0]?.message?.content ?? '';
    const sanitizedResponse = response.replace(/['''`]/g, '"');
    const jsonStartIndex = sanitizedResponse.indexOf('{');
    const jsonEndIndex = sanitizedResponse.lastIndexOf('}');

    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      const jsonResponse = sanitizedResponse.substring(jsonStartIndex, jsonEndIndex + 1);
      const parsed = JSON.parse(jsonResponse);

      if (parsed && parsed.tags) {
        return Array.isArray(parsed.tags) ? parsed.tags : [];
      } else {
        return [];
      }
    }

    return [];
  } catch (e) {
    console.error('Failed to parse response: ', e);
    return [];
  }
};

export const generateQueries = async (
  token: string = '',
  model: string,
  messages: object[],
  prompt: string,
  type: string = 'web_search'
) => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/v1/tasks/queries/completions`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      prompt: prompt,
      type: type
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
      }
      return null;
    });

  if (error) {
    throw error;
  }

  const response = res?.choices[0]?.message?.content ?? '';

  try {
    const jsonStartIndex = response.indexOf('{');
    const jsonEndIndex = response.lastIndexOf('}');

    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      const jsonResponse = response.substring(jsonStartIndex, jsonEndIndex + 1);
      const parsed = JSON.parse(jsonResponse);

      if (parsed && parsed.queries) {
        return Array.isArray(parsed.queries) ? parsed.queries : [];
      } else {
        return [];
      }
    }

    return [response];
  } catch (e) {
    console.error('Failed to parse response: ', e);
    return [response];
  }
};

export const generateAutoCompletion = async (
  token: string = '',
  model: string,
  prompt: string,
  messages?: object[],
  type: string = 'search query'
) => {
  const controller = new AbortController();
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/v1/tasks/auto/completions`, {
    signal: controller.signal,
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      ...(messages && { messages: messages }),
      type: type,
      stream: false
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
      }
      return null;
    });

  if (error) {
    throw error;
  }

  const response = res?.choices[0]?.message?.content ?? '';

  try {
    const jsonStartIndex = response.indexOf('{');
    const jsonEndIndex = response.lastIndexOf('}');

    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      const jsonResponse = response.substring(jsonStartIndex, jsonEndIndex + 1);
      const parsed = JSON.parse(jsonResponse);

      if (parsed && parsed.text) {
        return parsed.text;
      } else {
        return '';
      }
    }

    return response;
  } catch (e) {
    console.error('Failed to parse response: ', e);
    return response;
  }
};

export const generateMoACompletion = async (
  token: string = '',
  model: string,
  prompt: string,
  responses: string[]
) => {
  const controller = new AbortController();
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/v1/tasks/moa/completions`, {
    signal: controller.signal,
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      model: model,
      prompt: prompt,
      responses: responses,
      stream: true
    })
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

export const getPipelinesList = async (token: string = '') => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/v1/pipelines/list`, {
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
      error = err;
      return null;
    });

  if (error) {
    throw error;
  }

  const pipelines = res?.data ?? [];
  return pipelines;
};

export const uploadPipeline = async (token: string, file: File, urlIdx: string) => {
  let error = null;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('urlIdx', urlIdx);

  const res = await fetch(`${WEBUI_BASE_URL}/api/v1/pipelines/upload`, {
    method: 'POST',
    headers: {
      ...(token && { authorization: `Bearer ${token}` })
    },
    body: formData
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
        error = err;
      }
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

export const downloadPipeline = async (token: string, url: string, urlIdx: string) => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/v1/pipelines/add`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token && { authorization: `Bearer ${token}` })
    },
    body: JSON.stringify({
      url: url,
      urlIdx: urlIdx
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
        error = err;
      }
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

export const deletePipeline = async (token: string, id: string, urlIdx: string) => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/v1/pipelines/delete`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token && { authorization: `Bearer ${token}` })
    },
    body: JSON.stringify({
      id: id,
      urlIdx: urlIdx
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
        error = err;
      }
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

export const getPipelines = async (token: string, urlIdx?: string) => {
  let error = null;

  const searchParams = new URLSearchParams();
  if (urlIdx !== undefined) {
    searchParams.append('urlIdx', urlIdx);
  }

  const res = await fetch(`${WEBUI_BASE_URL}/api/v1/pipelines/?${searchParams.toString()}`, {
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
      error = err;
      return null;
    });

  if (error) {
    throw error;
  }

  const pipelines = res?.data ?? [];
  return pipelines;
};

export const getPipelineValves = async (token: string, pipeline_id: string, urlIdx: string) => {
  let error = null;

  const searchParams = new URLSearchParams();
  if (urlIdx !== undefined) {
    searchParams.append('urlIdx', urlIdx);
  }

  const res = await fetch(
    `${WEBUI_BASE_URL}/api/v1/pipelines/${pipeline_id}/valves?${searchParams.toString()}`,
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
      console.error(err);
      error = err;
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

export const getPipelineValvesSpec = async (token: string, pipeline_id: string, urlIdx: string) => {
  let error = null;

  const searchParams = new URLSearchParams();
  if (urlIdx !== undefined) {
    searchParams.append('urlIdx', urlIdx);
  }

  const res = await fetch(
    `${WEBUI_BASE_URL}/api/v1/pipelines/${pipeline_id}/valves/spec?${searchParams.toString()}`,
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
      console.error(err);
      error = err;
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

export const updatePipelineValves = async (
  token: string = '',
  pipeline_id: string,
  valves: object,
  urlIdx: string
) => {
  let error = null;

  const searchParams = new URLSearchParams();
  if (urlIdx !== undefined) {
    searchParams.append('urlIdx', urlIdx);
  }

  const res = await fetch(
    `${WEBUI_BASE_URL}/api/v1/pipelines/${pipeline_id}/valves/update?${searchParams.toString()}`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token && { authorization: `Bearer ${token}` })
      },
      body: JSON.stringify(valves)
    }
  )
    .then(async (res) => {
      if (!res.ok) throw await res.json();
      return res.json();
    })
    .catch((err) => {
      console.error(err);

      if ('detail' in err) {
        error = err.detail;
      } else {
        error = err;
      }
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

export const getUsage = async (token: string = '') => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/usage`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  })
    .then(async (res) => {
      if (!res.ok) throw await res.json();
      return res.json();
    })
    .catch((err) => {
      console.error(err);
      error = err;
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

export const getVersionUpdates = async (token: string) => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/version/updates`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
    .then(async (res) => {
      if (!res.ok) throw await res.json();
      return res.json();
    })
    .catch((err) => {
      console.error(err);
      error = err;
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

export const getModelFilterConfig = async (token: string) => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/config/model/filter`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
    .then(async (res) => {
      if (!res.ok) throw await res.json();
      return res.json();
    })
    .catch((err) => {
      console.error(err);
      error = err;
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

export const updateModelFilterConfig = async (
  token: string,
  enabled: boolean,
  models: string[]
) => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/config/model/filter`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      enabled: enabled,
      models: models
    })
  })
    .then(async (res) => {
      if (!res.ok) throw await res.json();
      return res.json();
    })
    .catch((err) => {
      console.error(err);
      error = err;
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

export const getWebhookUrl = async (token: string) => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/webhook`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
    .then(async (res) => {
      if (!res.ok) throw await res.json();
      return res.json();
    })
    .catch((err) => {
      console.error(err);
      error = err;
      return null;
    });

  if (error) {
    throw error;
  }

  return res.url;
};

export const updateWebhookUrl = async (token: string, url: string) => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      url: url
    })
  })
    .then(async (res) => {
      if (!res.ok) throw await res.json();
      return res.json();
    })
    .catch((err) => {
      console.error(err);
      error = err;
      return null;
    });

  if (error) {
    throw error;
  }

  return res.url;
};

export const getCommunitySharingEnabledStatus = async (token: string) => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/community_sharing`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
    .then(async (res) => {
      if (!res.ok) throw await res.json();
      return res.json();
    })
    .catch((err) => {
      console.error(err);
      error = err;
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

export const toggleCommunitySharingEnabledStatus = async (token: string) => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/community_sharing/toggle`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
    .then(async (res) => {
      if (!res.ok) throw await res.json();
      return res.json();
    })
    .catch((err) => {
      console.error(err);
      error = err.detail;
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

export const updateModelConfig = async (token: string, config: GlobalModelConfig) => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/config/models`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      models: config
    })
  })
    .then(async (res) => {
      if (!res.ok) throw await res.json();
      return res.json();
    })
    .catch((err) => {
      console.error(err);
      error = err;
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

export const getTaskConfig = async (token: string = '') => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/v1/tasks/config`, {
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
      error = err;
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

export const updateTaskConfig = async (token: string, config: object) => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/v1/tasks/config/update`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token && { authorization: `Bearer ${token}` })
    },
    body: JSON.stringify(config)
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
        error = err;
      }
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

export const getTaskIdsByChatId = async (token: string, chat_id: string) => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/tasks/chat/${chat_id}`, {
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
        error = err;
      }
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

export type ChatActionForm = {
  model: string;
  messages: string[];
  chat_id: string;
};

export const chatAction = async (token: string, action_id: string, body: ChatActionForm) => {
  let error = null;

  const res = await fetch(`${WEBUI_BASE_URL}/api/chat/actions/${action_id}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token && { authorization: `Bearer ${token}` })
    },
    body: JSON.stringify(body)
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
        error = err;
      }
      return null;
    });

  if (error) {
    throw error;
  }

  return res;
};

