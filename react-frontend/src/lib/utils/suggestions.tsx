import { ReactRenderer } from '@tiptap/react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import { type SuggestionOptions, type SuggestionProps } from '@tiptap/suggestion';
import MentionList from '@/components/common/MentionList';

interface Model {
  id: string;
  name: string;
}

interface Tool {
  id: string;
  name: string;
}

interface KeyDownProps {
  event: KeyboardEvent;
}

interface MentionListRef {
  onKeyDown?: (event: KeyboardEvent) => boolean;
}

export function createModelSuggestions(models: Model[]): Partial<SuggestionOptions> {
  return {
    char: '@',
    items: ({ query }: { query: string }) => {
      return models
        .filter((model) =>
          model.name.toLowerCase().includes(query.toLowerCase()) ||
          model.id.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 10)
        .map((model) => ({
          id: model.id,
          name: model.name,
          label: model.name
        }));
    },
    render: () => {
      let component: ReactRenderer | null = null;
      let popup: TippyInstance[] | null = null;

      return {
        onStart: (props: SuggestionProps) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          });
        },

        onUpdate(props: SuggestionProps) {
          component?.updateProps(props);

          if (!props.clientRect) {
            return;
          }

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        },

        onKeyDown(props: KeyDownProps) {
          if (props.event.key === 'Escape') {
            popup?.[0]?.hide();
            return true;
          }

          return (component?.ref as MentionListRef)?.onKeyDown?.(props.event);
        },

        onExit() {
          popup?.[0]?.destroy();
          component?.destroy();
        },
      };
    },
  };
}

export function createToolSuggestions(tools: Tool[]): Partial<SuggestionOptions> {
  return {
    char: '#',
    items: ({ query }: { query: string }) => {
      return tools
        .filter((tool) =>
          tool.name.toLowerCase().includes(query.toLowerCase()) ||
          tool.id.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 10)
        .map((tool) => ({
          id: tool.id,
          name: tool.name,
          label: tool.name
        }));
    },
    render: () => {
      let component: ReactRenderer | null = null;
      let popup: TippyInstance[] | null = null;

      return {
        onStart: (props: SuggestionProps) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          });
        },

        onUpdate(props: SuggestionProps) {
          component?.updateProps(props);

          if (!props.clientRect) {
            return;
          }

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          });
        },

        onKeyDown(props: KeyDownProps) {
          if (props.event.key === 'Escape') {
            popup?.[0]?.hide();
            return true;
          }

          return (component?.ref as MentionListRef)?.onKeyDown?.(props.event);
        },

        onExit() {
          popup?.[0]?.destroy();
          component?.destroy();
        },
      };
    },
  };
}
