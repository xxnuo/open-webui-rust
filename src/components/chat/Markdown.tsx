import { useEffect, useRef, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { marked } from '@/lib/utils/markdown';
import DOMPurify from 'dompurify';
import 'highlight.js/styles/github-dark.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import CodeBlock from './CodeBlock';

interface MarkdownProps {
  content: string;
  className?: string;
  id?: string;
  editCodeBlock?: boolean;
  onCodeSave?: (code: string) => void;
}

interface CodeBlockData {
  id: string;
  language: string;
  code: string;
  container: HTMLElement;
}

export default function Markdown({ 
  content, 
  className = '', 
  id = '',
  editCodeBlock = true,
  onCodeSave
}: MarkdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [codeBlocks, setCodeBlocks] = useState<CodeBlockData[]>([]);

  // Parse markdown to HTML (memoized to prevent unnecessary re-parsing)
  const processedHtml = useMemo(() => {
    const rawHtml = marked.parse(content, {
      breaks: true,
      gfm: true
    }) as string;

    return DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling']
    });
  }, [content]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Set HTML content
    containerRef.current.innerHTML = processedHtml;

    // Process code blocks - create containers for React portals
    const preBlocks = containerRef.current.querySelectorAll('pre');
    const newCodeBlocks: CodeBlockData[] = [];
    
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

      // Create a container for the CodeBlock portal
      const container = document.createElement('div');
      container.className = 'code-block-container';
      pre.replaceWith(container);
      
      newCodeBlocks.push({
        id: `${id}-${idx}`,
        language,
        code: codeText,
        container
      });
    });

    setCodeBlocks(newCodeBlocks);

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
  }, [processedHtml, id]);

  return (
    <>
      <div
        ref={containerRef}
        className={`markdown-content prose prose-sm max-w-none dark:prose-invert ${className}`}
      />
      {/* Use React portals to render CodeBlock components into their containers */}
      {codeBlocks.map((block) =>
        createPortal(
          <CodeBlock
            language={block.language}
            code={block.code}
            collapsible={true}
            editable={editCodeBlock}
            onSave={onCodeSave}
            id={block.id}
          />,
          block.container,
          block.id
        )
      )}
    </>
  );
}
