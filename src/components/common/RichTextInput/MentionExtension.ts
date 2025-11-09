import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';

export interface MentionExtensionOptions {
  suggestion: Omit<SuggestionOptions, 'editor'>;
}

export const MentionExtension = Extension.create<MentionExtensionOptions>({
  name: 'mentionExtension',

  addOptions() {
    return {
      suggestion: {
        char: '@',
        pluginKey: new PluginKey('mentionSuggestion'),
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, [
              {
                type: 'text',
                text: `@${props.name || props.id}`
              },
              {
                type: 'text',
                text: ' '
              }
            ])
            .run();
        },
        allow: ({ editor, range }) => {
          return true;
        }
      }
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion
      })
    ];
  }
});

export default MentionExtension;

