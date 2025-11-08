import { useEffect, useRef } from 'react';
import { marked } from '@/lib/utils/markdown';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MarkdownProps {
  content: string;
  className?: string;
}

export default function Markdown({ content, className = '' }: MarkdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

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

    // Highlight code blocks
    const codeBlocks = containerRef.current.querySelectorAll('pre code');
    codeBlocks.forEach((block) => {
      hljs.highlightElement(block as HTMLElement);
    });

    // Render KaTeX math
    // Inline math: $...$
    const inlineMath = containerRef.current.querySelectorAll('code');
    inlineMath.forEach((element) => {
      const text = element.textContent || '';
      if (text.startsWith('$') && text.endsWith('$') && text.length > 2) {
        const math = text.slice(1, -1);
        try {
          const html = katex.renderToString(math, {
            throwOnError: false,
            displayMode: false
          });
          element.innerHTML = html;
          element.classList.add('katex-inline');
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

    // Add copy buttons to code blocks
    const preBlocks = containerRef.current.querySelectorAll('pre');
    preBlocks.forEach((pre) => {
      if (!pre.querySelector('button.copy-button')) {
        const button = document.createElement('button');
        button.className = 'copy-button absolute top-2 right-2 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity';
        button.textContent = 'Copy';
        button.onclick = async () => {
          const code = pre.querySelector('code');
          if (code) {
            await navigator.clipboard.writeText(code.textContent || '');
            button.textContent = 'Copied!';
            setTimeout(() => {
              button.textContent = 'Copy';
            }, 2000);
          }
        };
        pre.style.position = 'relative';
        pre.classList.add('group');
        pre.appendChild(button);
      }
    });

    // Handle task list items
    const taskItems = containerRef.current.querySelectorAll('li[data-type="taskItem"]');
    taskItems.forEach((item) => {
      const checked = item.getAttribute('data-checked') === 'true';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = checked;
      checkbox.className = 'mr-2';
      checkbox.disabled = true;
      item.prepend(checkbox);
    });

  }, [content]);

  return (
    <div
      ref={containerRef}
      className={`markdown-content prose prose-sm max-w-none dark:prose-invert ${className}`}
    />
  );
}
