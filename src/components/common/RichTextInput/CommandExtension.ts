import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';

export interface CommandExtensionOptions {
  suggestion: Omit<SuggestionOptions, 'editor'>;
}

export const CommandExtension = Extension.create<CommandExtensionOptions>({
  name: 'commandExtension',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        pluginKey: new PluginKey('commandSuggestion'),
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .insertContentAt(range, props.label)
            .run();
        },
        allow: ({ editor, range }) => {
          // Only allow at start of line or after space
          const $from = editor.state.doc.resolve(range.from);
          const isStartOfLine = $from.parent.textContent.substring(0, $from.parentOffset).trim() === '';
          return isStartOfLine;
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

export default CommandExtension;

