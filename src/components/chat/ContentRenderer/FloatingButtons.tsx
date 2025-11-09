import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { MessageSquare, Lightbulb, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { chatCompletion } from '@/lib/apis/openai';
import Markdown from '../Markdown';
import { Skeleton } from '@/components/ui/skeleton';

interface Action {
  id: string;
  label: string;
  icon?: any;
  input?: boolean;
  prompt: string;
}

interface FloatingButtonsProps {
  id?: string;
  messageId?: string;
  model: string | null;
  messages: any[];
  actions?: Action[];
  onAdd?: (data: { modelId: string; parentId: string; messages: any[] }) => void;
}

export interface FloatingButtonsHandle {
  closeHandler: () => void;
}

const FloatingButtons = forwardRef<FloatingButtonsHandle, FloatingButtonsProps>(
  ({ id = '', messageId = '', model, messages, actions = [], onAdd }, ref) => {
    const { t } = useTranslation();
    
    const [floatingInput, setFloatingInput] = useState(false);
    const [selectedAction, setSelectedAction] = useState<Action | null>(null);
    const [selectedText, setSelectedText] = useState('');
    const [floatingInputValue, setFloatingInputValue] = useState('');
    const [content, setContent] = useState('');
    const [responseContent, setResponseContent] = useState<string | null>(null);
    const [responseDone, setResponseDone] = useState(false);
    
    const controllerRef = useRef<AbortController | null>(null);
    const responseContainerRef = useRef<HTMLDivElement>(null);

    const DEFAULT_ACTIONS: Action[] = [
      {
        id: 'ask',
        label: t('Ask'),
        icon: MessageSquare,
        input: true,
        prompt: `{{SELECTED_CONTENT}}\n\n\n{{INPUT_CONTENT}}`
      },
      {
        id: 'explain',
        label: t('Explain'),
        icon: Lightbulb,
        prompt: `{{SELECTED_CONTENT}}\n\n\n${t('Explain')}`
      }
    ];

    const effectiveActions = actions.length === 0 ? DEFAULT_ACTIONS : actions;

    const autoScroll = () => {
      if (responseContainerRef.current) {
        const container = responseContainerRef.current;
        if (
          container.scrollHeight - container.clientHeight <=
          container.scrollTop + 50
        ) {
          container.scrollTop = container.scrollHeight;
        }
      }
    };

    const actionHandler = async (actionId: string) => {
      if (!model) {
        toast.error(t('Model not selected'));
        return;
      }

      const selectedContent = selectedText
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');

      const action = effectiveActions.find((a) => a.id === actionId);
      if (!action) {
        toast.error(t('Action not found'));
        return;
      }

      let prompt = action.prompt || '';
      const toolIds: string[] = [];

      // Handle: {{variableId|tool:id="toolId"}} pattern
      const varToolPattern = /\{\{(.*?)\|tool:id="([^"]+)"\}\}/g;
      prompt = prompt.replace(varToolPattern, (_match, variableId, toolId) => {
        toolIds.push(toolId);
        return variableId;
      });

      // Legacy {{TOOL:toolId}} pattern (for backward compatibility)
      const toolIdPattern = /\{\{TOOL:([^\}]+)\}\}/g;
      let match;
      while ((match = toolIdPattern.exec(prompt)) !== null) {
        toolIds.push(match[1]);
      }

      // Remove all TOOL placeholders from the prompt
      prompt = prompt.replace(toolIdPattern, '');

      if (prompt.includes('{{INPUT_CONTENT}}') && floatingInput) {
        prompt = prompt.replace('{{INPUT_CONTENT}}', floatingInputValue);
        setFloatingInputValue('');
      }

      prompt = prompt.replace('{{CONTENT}}', selectedText);
      prompt = prompt.replace('{{SELECTED_CONTENT}}', selectedContent);

      setContent(prompt);
      setResponseContent('');
      setResponseDone(false);

      try {
        const [res, controller] = await chatCompletion(localStorage.token, {
          model: model,
          messages: [
            ...messages,
            {
              role: 'user',
              content: prompt
            }
          ].map((message) => ({
            role: message.role,
            content: message.content
          })),
          ...(toolIds.length > 0 ? { tool_ids: toolIds } : {}),
          stream: true
        });

        controllerRef.current = controller;

        if (res && res.ok) {
          const reader = res.body!.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter((line) => line.trim() !== '');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                if (line.startsWith('data: [DONE]')) {
                  setResponseDone(true);
                  autoScroll();
                  continue;
                } else {
                  try {
                    const data = JSON.parse(line.slice(6));
                    if (data.choices && data.choices[0]?.delta?.content) {
                      setResponseContent((prev) => 
                        (prev || '') + data.choices[0].delta.content
                      );
                      autoScroll();
                    }
                  } catch (e) {
                    console.error('Error parsing stream data:', e);
                  }
                }
              }
            }
          }
        } else {
          toast.error(t('An error occurred while fetching the explanation'));
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          console.error('Error in action handler:', e);
          toast.error(t('An error occurred'));
        }
      }
    };

    const addHandler = () => {
      if (onAdd && responseContent) {
        onAdd({
          modelId: model!,
          parentId: messageId,
          messages: [
            {
              role: 'user',
              content: content
            },
            {
              role: 'assistant',
              content: responseContent
            }
          ]
        });
      }
    };

    const closeHandler = () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
      }

      setSelectedAction(null);
      setSelectedText('');
      setResponseContent(null);
      setResponseDone(false);
      setFloatingInput(false);
      setFloatingInputValue('');
    };

    useImperativeHandle(ref, () => ({
      closeHandler
    }));

    useEffect(() => {
      return () => {
        if (controllerRef.current) {
          controllerRef.current.abort();
        }
      };
    }, []);

    return (
      <div
        id={`floating-buttons-${id}`}
        className="absolute rounded-lg mt-1 text-xs z-[9999]"
        style={{ display: 'none' }}
      >
        {responseContent === null ? (
          !floatingInput ? (
            <div className="flex flex-row gap-0.5 shrink-0 p-1 bg-white dark:bg-gray-850 text-medium rounded-lg shadow-xl">
              {effectiveActions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    className="px-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-sm flex items-center gap-1 min-w-fit"
                    onClick={async () => {
                      const selection = window.getSelection();
                      setSelectedText(selection?.toString() || '');
                      setSelectedAction(action);

                      if (action.prompt.includes('{{INPUT_CONTENT}}')) {
                        setFloatingInput(true);
                        setFloatingInputValue('');

                        setTimeout(() => {
                          const input = document.getElementById('floating-message-input');
                          if (input) {
                            input.focus();
                          }
                        }, 0);
                      } else {
                        actionHandler(action.id);
                      }
                    }}
                  >
                    {Icon && <Icon className="size-3 shrink-0" />}
                    <div className="shrink-0">{action.label}</div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-1 flex dark:text-gray-100 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-850 w-72 rounded-full shadow-xl">
              <input
                type="text"
                id="floating-message-input"
                className="ml-5 bg-transparent outline-none w-full flex-1 text-sm"
                placeholder={t('Ask a question')}
                value={floatingInputValue}
                onChange={(e) => setFloatingInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && selectedAction) {
                    actionHandler(selectedAction.id);
                  }
                }}
              />

              <div className="ml-1 mr-2">
                <button
                  className={`${
                    floatingInputValue !== ''
                      ? 'bg-black text-white hover:bg-gray-900 dark:bg-white dark:text-black dark:hover:bg-gray-100'
                      : 'text-white bg-gray-200 dark:text-gray-900 dark:bg-gray-700 cursor-not-allowed'
                  } transition rounded-full p-1.5 m-0.5 self-center`}
                  onClick={() => {
                    if (floatingInputValue !== '' && selectedAction) {
                      actionHandler(selectedAction.id);
                    }
                  }}
                  disabled={floatingInputValue === ''}
                >
                  <Send className="size-4" />
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="bg-white dark:bg-gray-850 dark:text-gray-100 rounded-xl shadow-xl w-80 max-w-full">
            <div className="bg-gray-50/50 dark:bg-gray-800 dark:text-gray-100 text-medium rounded-xl px-3.5 py-3 w-full">
              <div className="font-medium">
                <Markdown content={content} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-850 dark:text-gray-100 text-medium rounded-xl px-3.5 py-3 w-full">
              <div
                ref={responseContainerRef}
                className="max-h-80 overflow-y-auto w-full markdown-prose-xs"
                id="response-container"
              >
                {!responseContent || responseContent.trim() === '' ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : (
                  <Markdown content={responseContent} />
                )}

                {responseDone && (
                  <div className="flex justify-end pt-3 text-sm font-medium">
                    <Button
                      className="px-3.5 py-1.5 text-sm font-medium rounded-full"
                      onClick={addHandler}
                    >
                      {t('Add')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

FloatingButtons.displayName = 'FloatingButtons';

export default FloatingButtons;

