import { ReactRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { SuggestionProps, SuggestionKeyDownProps } from '@tiptap/suggestion';

interface SuggestionRendererOptions {
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

export function getSuggestionRenderer(options: SuggestionRendererOptions) {
  return () => {
    let component: ReactRenderer | null = null;
    let popup: TippyInstance | null = null;

    return {
      onStart: (props: SuggestionProps) => {
        if (!props.clientRect) {
          return;
        }

        component = new ReactRenderer(options.component, {
          props: {
            ...options.props,
            ...props,
            char: props.text,
            query: props.query?.text || ''
          },
          editor: props.editor
        });

        // Create dummy reference element for positioning
        const referenceEl = document.createElement('div');
        referenceEl.style.position = 'fixed';
        referenceEl.style.left = '0';
        referenceEl.style.top = '0';
        referenceEl.style.width = '0';
        referenceEl.style.height = '0';
        document.body.appendChild(referenceEl);

        popup = tippy(referenceEl, {
          getReferenceClientRect: props.clientRect as any,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
          theme: 'transparent',
          maxWidth: 'none',
          offset: [0, 8],
          popperOptions: {
            strategy: 'fixed',
            modifiers: [
              {
                name: 'flip',
                options: {
                  fallbackPlacements: ['top-start', 'top-end', 'bottom-end']
                }
              },
              {
                name: 'preventOverflow',
                options: {
                  boundary: 'viewport',
                  padding: 8
                }
              }
            ]
          }
        });
      },

      onUpdate(props: SuggestionProps) {
        component?.updateProps({
          ...options.props,
          ...props,
          query: props.query?.text || ''
        });

        if (props.clientRect && popup) {
          popup.setProps({
            getReferenceClientRect: props.clientRect as any
          });
        }
      },

      onKeyDown(props: SuggestionKeyDownProps) {
        if (props.event.key === 'Escape') {
          popup?.hide();
          return true;
        }

        // Forward keyboard events to the component
        const ref = (component as any)?.ref;
        if (ref && typeof ref.onKeyDown === 'function') {
          return ref.onKeyDown(props.event);
        }

        return false;
      },

      onExit() {
        popup?.destroy();
        component?.destroy();
        popup = null;
        component = null;
      }
    };
  };
}

export default getSuggestionRenderer;

