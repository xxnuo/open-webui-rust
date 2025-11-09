import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const VariableExtension = Extension.create({
  name: 'variableExtension',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('variableHighlight'),
        state: {
          init(_, { doc }) {
            return findVariables(doc);
          },
          apply(transaction, oldState) {
            return transaction.docChanged ? findVariables(transaction.doc) : oldState;
          }
        },
        props: {
          decorations(state) {
            return this.getState(state);
          }
        }
      })
    ];
  }
});

function findVariables(doc: any): DecorationSet {
  const decorations: Decoration[] = [];
  const variableRegex = /\{\{([^}]+)\}\}/g;

  doc.descendants((node: any, pos: number) => {
    if (node.isText && node.text) {
      let match;
      while ((match = variableRegex.exec(node.text)) !== null) {
        const from = pos + match.index;
        const to = from + match[0].length;
        decorations.push(
          Decoration.inline(from, to, {
            class: 'variable-highlight px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          })
        );
      }
    }
  });

  return DecorationSet.create(doc, decorations);
}

export default VariableExtension;

