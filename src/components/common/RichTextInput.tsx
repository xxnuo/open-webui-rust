import { useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Image from '@tiptap/extension-image';
import FileHandler from '@tiptap/extension-file-handler';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Mention from '@tiptap/extension-mention';
import CharacterCount from '@tiptap/extension-character-count';
import { createLowlight } from 'lowlight';
import { marked, turndownService } from '@/lib/utils/markdown';

// Create lowlight instance
const lowlight = createLowlight();

interface RichTextInputProps {
  value?: string;
  onChange?: (value: string, html: string, json: Record<string, unknown>) => void;
  onKeyDown?: (event: React.KeyboardEvent) => boolean;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  richText?: boolean;
  messageInput?: boolean;
  shiftEnter?: boolean;
  onFileDrop?: (files: File[], pos: number) => void;
  onFilePaste?: (files: File[], htmlContent?: string) => void;
  suggestions?: Record<string, unknown>;
  autocomplete?: boolean;
  generateAutoCompletion?: (text: string) => Promise<string | null>;
}

export interface RichTextInputHandle {
  focus: () => void;
  setText: (text: string) => void;
  insertContent: (content: string) => void;
  setContent: (content: string) => void;
  replaceVariables: (variables: Record<string, any>) => void;
  getWordAtDocPos: () => string;
  replaceCommandWithText: (text: string) => void;
}

const RichTextInput = forwardRef<RichTextInputHandle, RichTextInputProps>(({
  value = '',
  onChange,
  onKeyDown,
  placeholder = 'Type here...',
  className = 'input-prose',
  editable = true,
  richText = true,
  messageInput = false,
  shiftEnter = false,
  onFileDrop,
  onFilePaste,
  suggestions
}, ref) => {
  const [mdValue, setMdValue] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // Disable default code block to use lowlight version
      }),
      Placeholder.configure({
        placeholder: placeholder,
        showOnlyWhenEditable: false
      }),
      CharacterCount,
      ...(richText ? [
        CodeBlockLowlight.configure({
          lowlight,
          defaultLanguage: 'javascript'
        }),
        Highlight,
        Typography,
        Table.configure({
          resizable: true
        }),
        TableRow,
        TableCell,
        TableHeader,
        TaskList,
        TaskItem.configure({
          nested: true
        }),
        Image
      ] : []),
      ...(onFileDrop || onFilePaste ? [
        FileHandler.configure({
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
          onDrop: (currentEditor, files, pos) => {
            if (onFileDrop) {
              onFileDrop(files, pos);
            } else {
              files.forEach((file) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                  currentEditor
                    .chain()
                    .insertContentAt(pos, {
                      type: 'image',
                      attrs: {
                        src: reader.result
                      }
                    })
                    .focus()
                    .run();
                };
              });
            }
          },
          onPaste: (currentEditor, files, htmlContent) => {
            if (onFilePaste) {
              onFilePaste(files, htmlContent);
            } else {
              if (htmlContent) {
                console.log(htmlContent);
                return false;
              }
              files.forEach((file) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => {
                  currentEditor
                    .chain()
                    .insertContentAt(currentEditor.state.selection.anchor, {
                      type: 'image',
                      attrs: {
                        src: reader.result
                      }
                    })
                    .focus()
                    .run();
                };
              });
            }
          }
        })
      ] : []),
      ...(suggestions ? [
        Mention.configure({
          HTMLAttributes: { class: 'mention' },
          suggestion: suggestions
        })
      ] : [])
    ],
    content: '',
    editable: editable,
    autofocus: messageInput,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const json = editor.getJSON();
      const md = turndownService
        .turndown(
          html
            .replace(/<p><\/p>/g, '<br/>')
            .replace(/ {2,}/g, (m) => m.replace(/ /g, '\u00a0'))
        )
        .replace(/\u00a0/g, ' ');

      setMdValue(md);

      if (onChange) {
        onChange(md, html, json);
      }
    },
    editorProps: {
      attributes: {
        class: `${className} prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none w-full`
      },
      handlePaste: (view, event) => {
        // Force plain-text pasting when richText === false
        if (!richText) {
          event.preventDefault();
          const { state, dispatch } = view;
          const plainText = (event.clipboardData?.getData('text/plain') ?? '').replace(/\r\n/g, '\n');
          const lines = plainText.split('\n');
          
          // Insert text with hard breaks
          let transaction = state.tr;
          lines.forEach((line, index) => {
            if (index > 0) {
              transaction = transaction.insertText('\n');
            }
            if (line.length > 0) {
              transaction = transaction.insertText(line);
            }
          });
          
          dispatch(transaction);
          return true;
        }
        return false;
      },
      handleDOMEvents: {
        keydown: (view, event) => {
          if (onKeyDown && onKeyDown(event as React.KeyboardEvent)) {
            return true;
          }

          if (messageInput) {
            // Handle Enter key for message input
            if (event.key === 'Enter') {
              const isCtrlPressed = event.ctrlKey || event.metaKey;
              const { state } = view;

              if (event.shiftKey && !isCtrlPressed) {
                // Shift+Enter for new line
                return false;
              } else {
                // Check if in code block or list
                const { $head } = state.selection;
                let currentNode = $head;
                let isInCodeBlock = false;
                let isInList = false;
                let isInHeading = false;

                while (currentNode) {
                  const nodeName = currentNode.parent.type.name;
                  if (nodeName === 'codeBlock') isInCodeBlock = true;
                  if (['listItem', 'bulletList', 'orderedList', 'taskList'].includes(nodeName)) isInList = true;
                  if (nodeName === 'heading') isInHeading = true;
                  if (!currentNode.depth) break;
                  currentNode = state.doc.resolve(currentNode.before());
                }

                if (isInCodeBlock || isInList || isInHeading) {
                  return false;
                }
              }
            }

            // Handle shift + Enter for hard break
            if (shiftEnter && event.key === 'Enter' && event.shiftKey && !event.ctrlKey && !event.metaKey) {
              editor?.commands.setHardBreak();
              view.dispatch(view.state.tr.scrollIntoView());
              event.preventDefault();
              return true;
            }
          }
          return false;
        }
      }
    }
  });

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      editor?.view?.focus();
      editor?.view?.dispatch(editor.view.state.tr.scrollIntoView());
    },
    setText: (text: string) => {
      if (!editor) return;
      text = text.replaceAll('\n\n', '\n');
      editor.commands.clearContent();

      const { state, view } = editor;
      const { schema, tr } = state;

      if (text.includes('\n')) {
        const lines = text.split('\n');
        const nodes = lines.map((line) =>
          schema.nodes.paragraph.create({}, line ? schema.text(line) : undefined)
        );
        const fragment = state.schema.nodes.doc.type.create(null, nodes).content;
        view.dispatch(tr.replaceSelectionWith(state.schema.nodes.doc.type.create(null, nodes), false));
      } else if (text === '') {
        editor.commands.clearContent();
      } else {
        const paragraph = schema.nodes.paragraph.create({}, schema.text(text));
        view.dispatch(tr.replaceSelectionWith(paragraph, false));
      }
    },
    insertContent: (content: string) => {
      if (!editor) return;
      const htmlContent = marked.parse(content);
      editor.commands.insertContent(htmlContent as string);
    },
    setContent: (content: string) => {
      editor?.commands.setContent(content);
    },
    replaceVariables: (variables: Record<string, unknown>) => {
      if (!editor) return;
      const { state, view } = editor;
      const { doc } = state;
      let tr = state.tr;
      const replacements: Array<{ from: number; to: number; text: string }> = [];

      doc.descendants((node, pos) => {
        if (node.isText && node.text) {
          const text = node.text;
          const replacedText = text.replace(/{{\s*([^|}]+)(?:\|[^}]*)?\s*}}/g, (match, varName) => {
            const trimmedVarName = varName.trim();
            return variables.hasOwnProperty(trimmedVarName)
              ? String(variables[trimmedVarName])
              : match;
          });

          if (replacedText !== text) {
            replacements.push({
              from: pos,
              to: pos + text.length,
              text: replacedText
            });
          }
        }
      });

      replacements.reverse().forEach(({ from, to, text }) => {
        tr = tr.replaceWith(from, to, text !== '' ? state.schema.text(text) : []);
      });

      if (replacements.length > 0) {
        view.dispatch(tr);
      }
    },
    getWordAtDocPos: () => {
      if (!editor) return '';
      const { state } = editor.view;
      const pos = state.selection.from;
      const doc = state.doc;
      const resolvedPos = doc.resolve(pos);
      const textBlock = resolvedPos.parent;
      const text = textBlock.textContent;
      const offset = resolvedPos.parentOffset;

      let wordStart = offset,
        wordEnd = offset;
      while (wordStart > 0 && !/\s/.test(text[wordStart - 1])) wordStart--;
      while (wordEnd < text.length && !/\s/.test(text[wordEnd])) wordEnd++;

      const word = text.slice(wordStart, wordEnd);
      return word;
    },
    replaceCommandWithText: async (text: string) => {
      if (!editor) return;
      const { state, dispatch } = editor.view;
      const { selection } = state;
      const pos = selection.from;

      const resolvedPos = state.doc.resolve(pos);
      const textBlock = resolvedPos.parent;
      const paraStart = resolvedPos.start();
      const textContent = textBlock.textContent;
      const offset = resolvedPos.parentOffset;

      let wordStart = offset,
        wordEnd = offset;
      while (wordStart > 0 && !/\s/.test(textContent[wordStart - 1])) wordStart--;
      while (wordEnd < textContent.length && !/\s/.test(textContent[wordEnd])) wordEnd++;

      const start = paraStart + wordStart;
      const end = paraStart + wordEnd;

      let tr = state.tr;

      if (text.includes('\n')) {
        const lines = text.split('\n');
        const nodes = lines.map(
          (line, index) =>
            index === 0
              ? state.schema.text(line ? line : '')
              : state.schema.nodes.paragraph.create({}, line ? state.schema.text(line) : undefined)
        );

        tr = tr.replaceWith(start, end, nodes);
        let lastPos = start;
        for (let i = 0; i < nodes.length; i++) {
          lastPos += nodes[i].nodeSize;
        }
        tr = tr.setSelection(state.selection.constructor.near(tr.doc.resolve(lastPos)) as any);
      } else {
        tr = tr.replaceWith(start, end, text !== '' ? state.schema.text(text) : []);
        tr = tr.setSelection(state.selection.constructor.near(tr.doc.resolve(start + text.length)) as any);
      }

      dispatch(tr);
    }
  }));

  // Sync value prop to editor content
  useEffect(() => {
    if (editor && value !== undefined && value !== mdValue) {
      if (value === '') {
        editor.commands.clearContent();
      } else {
        const htmlContent = marked.parse(value.replaceAll('\n<br/>', '<br/>'), { breaks: false });
        editor.commands.setContent(htmlContent as string);
      }
    }
  }, [value, editor, mdValue]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setOptions({ editable });
    }
  }, [editable, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`relative w-full min-w-full h-full min-h-fit ${!editable ? 'cursor-not-allowed' : ''}`}>
      <EditorContent editor={editor} />
    </div>
  );
});

RichTextInput.displayName = 'RichTextInput';

export default RichTextInput;

