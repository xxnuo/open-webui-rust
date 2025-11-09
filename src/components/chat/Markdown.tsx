import { useEffect, useRef, useState } from 'react';
import { marked } from '@/lib/utils/markdown';
import DOMPurify from 'dompurify';
import 'highlight.js/styles/github-dark.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import CodeBlock from './CodeBlock';
import ReactDOM from 'react-dom/client';

interface MarkdownProps {
  content: string;
  className?: string;
  id?: string;
  editCodeBlock?: boolean;
  onCodeSave?: (code: string) => void;
}

export default function Markdown({ 
  content, 
  className = '', 
  id = '',
  editCodeBlock = true,
  onCodeSave
}: MarkdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [codeBlockRoots, setCodeBlockRoots] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up existing React roots
    codeBlockRoots.forEach(root => {
      try {
        root.unmount();
      } catch (e) {
        // Ignore unmount errors
      }
    });
    const newRoots = new Map();

    // Parse markdown to HTML
    const rawHtml = marked.parse(content, {
      breaks: true,
      gfm: true
    }) as string;

    // Sanitize HTML
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling']
    });

    // Set HTML content
    containerRef.current.innerHTML = cleanHtml;

    // Replace code blocks with React CodeBlock components
    const preBlocks = containerRef.current.querySelectorAll('pre');
    preBlocks.forEach((pre, idx) => {
      const codeElement = pre.querySelector('code');
      if (!codeElement) return;

      // Extract language from class (e.g., "language-python")
      const languageClass = Array.from(codeElement.classList).find(cls => 
        cls.startsWith('language-')
      );
      const language = languageClass ? languageClass.replace('language-', '') : '';
      const codeText = codeElement.textContent || '';

      // Skip if it's a math block
      if (codeText.startsWith('$$') && codeText.endsWith('$$')) {
        return;
      }

      // Create a container for the React component
      const container = document.createElement('div');
      container.className = 'code-block-container';
      pre.replaceWith(container);

      // Render the CodeBlock component
      try {
        const root = ReactDOM.createRoot(container);
        root.render(
          <CodeBlock
            language={language}
            code={codeText}
            collapsible={true}
            editable={editCodeBlock}
            onSave={onCodeSave}
            id={`${id}-${idx}`}
          />
        );
        newRoots.set(`${id}-${idx}`, root);
      } catch (e) {
        console.error('Error rendering CodeBlock:', e);
      }
    });

    setCodeBlockRoots(newRoots);

    // Highlight inline code (not in pre blocks)
    const inlineCodeBlocks = containerRef.current.querySelectorAll('p code, li code, td code');
    inlineCodeBlocks.forEach((block) => {
      const text = block.textContent || '';
      
      // Check if it's inline math
      if (text.startsWith('$') && text.endsWith('$') && text.length > 2) {
        const math = text.slice(1, -1);
        try {
          const html = katex.renderToString(math, {
            throwOnError: false,
            displayMode: false
          });
          block.innerHTML = html;
          block.classList.add('katex-inline');
        } catch (e) {
          console.error('KaTeX inline error:', e);
        }
      }
    });

    // Block math: $$...$$
    const blockMath = containerRef.current.querySelectorAll('pre');
    blockMath.forEach((element) => {
      const text = element.textContent || '';
      if (text.startsWith('$$') && text.endsWith('$$') && text.length > 4) {
        const math = text.slice(2, -2);
        try {
          const html = katex.renderToString(math, {
            throwOnError: false,
            displayMode: true
          });
          element.innerHTML = html;
          element.classList.add('katex-block');
        } catch (e) {
          console.error('KaTeX block error:', e);
        }
      }
    });

    // Handle task list items
    const taskItems = containerRef.current.querySelectorAll('li input[type="checkbox"]');
    taskItems.forEach((checkbox) => {
      (checkbox as HTMLInputElement).disabled = true;
    });

    // Cleanup function
    return () => {
      newRoots.forEach(root => {
        try {
          root.unmount();
        } catch (e) {
          // Ignore unmount errors
        }
      });
    };
  }, [content, id, editCodeBlock, onCodeSave]);

  return (
    <div
      ref={containerRef}
      className={`markdown-content prose prose-sm max-w-none dark:prose-invert ${className}`}
    />
  );
}
