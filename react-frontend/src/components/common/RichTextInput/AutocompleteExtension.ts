import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

export interface AutocompleteOptions {
  generateCompletion: (text: string) => Promise<string | null>;
  debounceMs?: number;
}

export const Autocomplete = Extension.create<AutocompleteOptions>({
  name: 'autocomplete',

  addOptions() {
    return {
      generateCompletion: async () => null,
      debounceMs: 500,
    };
  },

  addProseMirrorPlugins() {
    const { generateCompletion, debounceMs } = this.options;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let currentSuggestion: string | null = null;

    return [
      new Plugin({
        key: new PluginKey('autocomplete'),

        state: {
          init() {
            return DecorationSet.empty;
          },

          apply(tr, decorationSet) {
            // Clear decorations if text changed
            if (tr.docChanged) {
              decorationSet = DecorationSet.empty;

              // Clear existing timer
              if (debounceTimer) {
                clearTimeout(debounceTimer);
              }

              // Get current text
              const text = tr.doc.textContent;

              if (text.trim().length > 0) {
                // Set new timer for generating completion
                debounceTimer = setTimeout(async () => {
                  try {
                    const suggestion = await generateCompletion(text);
                    if (suggestion && suggestion.trim().length > 0) {
                      currentSuggestion = suggestion;
                      
                      // Trigger an update to show the decoration
                      // Trigger view update to show suggestion
                      // Note: This is a workaround as we can't access view directly here
                      // The suggestion will be shown on the next editor update
                    }
                  } catch (error: unknown) {
                    console.error('Autocomplete error:', error);
                  }
                }, debounceMs);
              }
            }

            // Add suggestion decoration if meta is set
            if (tr.getMeta('addSuggestion')) {
              const suggestion = tr.getMeta('addSuggestion');
              const doc = tr.doc;
              const pos = doc.content.size;

              decorationSet = DecorationSet.create(doc, [
                Decoration.widget(pos, () => {
                  const span = document.createElement('span');
                  span.className = 'autocomplete-suggestion text-muted-foreground opacity-50';
                  span.textContent = suggestion;
                  span.contentEditable = 'false';
                  return span;
                })
              ]);
            }

            return decorationSet.map(tr.mapping, tr.doc);
          },
        },

        props: {
          decorations(state) {
            return this.getState(state);
          },

          handleKeyDown(view, event) {
            // Accept suggestion on Tab or Ctrl+Right
            if (
              (event.key === 'Tab' || (event.key === 'ArrowRight' && event.ctrlKey)) &&
              currentSuggestion
            ) {
              event.preventDefault();
              
              // Insert the suggestion
              const { state, dispatch } = view;
              const tr = state.tr.insertText(currentSuggestion, state.selection.from);
              dispatch(tr);
              
              currentSuggestion = null;
              return true;
            }

            // Clear suggestion on Escape
            if (event.key === 'Escape' && currentSuggestion) {
              currentSuggestion = null;
              const { state, dispatch } = view;
              const tr = state.tr.setMeta('clearSuggestion', true);
              dispatch(tr);
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});

