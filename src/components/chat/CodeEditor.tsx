import { useEffect, useRef } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { acceptCompletion } from '@codemirror/autocomplete';
import { indentUnit, LanguageDescription } from '@codemirror/language';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';

interface CodeEditorProps {
  value: string;
  id: string;
  lang?: string;
  onChange?: (value: string) => void;
  onSave?: () => void;
  className?: string;
}

export default function CodeEditor({
  value,
  id,
  lang = '',
  onChange,
  onSave,
  className = ''
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const editorTheme = useRef(new Compartment());
  const editorLanguage = useRef(new Compartment());

  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const isDarkMode = document.documentElement.classList.contains('dark');

    const extensions = [
      basicSetup,
      keymap.of([
        { key: 'Tab', run: acceptCompletion },
        indentWithTab
      ]),
      indentUnit.of('    '),
      EditorView.updateListener.of((update) => {
        if (update.docChanged && onChange) {
          onChange(update.state.doc.toString());
        }
      }),
      editorTheme.current.of(isDarkMode ? [oneDark] : []),
      editorLanguage.current.of([])
    ];

    viewRef.current = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions
      }),
      parent: editorRef.current
    });

    // Load language if specified
    if (lang) {
      loadLanguage(lang);
    }

    // Dark mode observer
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('dark');
          if (viewRef.current) {
            viewRef.current.dispatch({
              effects: editorTheme.current.reconfigure(isDark ? [oneDark] : [])
            });
          }
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', handleKeyDown);
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (viewRef.current && lang) {
      loadLanguage(lang);
    }
  }, [lang]);

  useEffect(() => {
    if (viewRef.current && value !== viewRef.current.state.doc.toString()) {
      const currentValue = viewRef.current.state.doc.toString();
      const changes = findChanges(currentValue, value);
      if (changes.length > 0) {
        viewRef.current.dispatch({ changes });
      }
    }
  }, [value]);

  const loadLanguage = async (languageName: string) => {
    const language = languages.find((l) => 
      l.name.toLowerCase() === languageName.toLowerCase() ||
      l.alias.includes(languageName.toLowerCase())
    );

    if (language) {
      const loadedLang = await language.load();
      if (viewRef.current && loadedLang) {
        viewRef.current.dispatch({
          effects: editorLanguage.current.reconfigure(loadedLang)
        });
      }
    }
  };

  const findChanges = (oldStr: string, newStr: string) => {
    let start = 0;
    while (start < oldStr.length && start < newStr.length && oldStr[start] === newStr[start]) {
      start++;
    }
    if (oldStr === newStr) return [];

    let endOld = oldStr.length;
    let endNew = newStr.length;
    while (endOld > start && endNew > start && oldStr[endOld - 1] === newStr[endNew - 1]) {
      endOld--;
      endNew--;
    }

    return [
      {
        from: start,
        to: endOld,
        insert: newStr.slice(start, endNew)
      }
    ];
  };

  return (
    <div 
      ref={editorRef} 
      id={`code-editor-${id}`} 
      className={`h-full w-full text-sm ${className}`}
    />
  );
}

