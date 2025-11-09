import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, Copy, Check, Play } from 'lucide-react';
import { toast } from 'sonner';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { executeCode } from '@/lib/apis/utils';
import { useAppStore } from '@/store';
import CodeEditor from './CodeEditor';

interface CodeBlockProps {
  language: string;
  code: string;
  collapsible?: boolean;
  editable?: boolean;
  onSave?: (code: string) => void;
  className?: string;
  id: string;
}

export default function CodeBlock({
  language,
  code: initialCode,
  collapsible = true,
  editable = false,
  onSave,
  className = '',
  id = ''
}: CodeBlockProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [code, setCode] = useState(initialCode);
  const [stdout, setStdout] = useState<string | null>(null);
  const [stderr, setStderr] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const codeRef = useRef<HTMLElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const user = useAppStore(state => state.user);
  const token = user?.token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  useEffect(() => {
    if (codeRef.current && preRef.current && !collapsed && !editable) {
      // Use hljs.highlight to match Svelte exactly
      try {
        const highlighted = language 
          ? hljs.highlight(code, { language: language, ignoreIllegals: true })
          : hljs.highlightAuto(code);
        
        codeRef.current.innerHTML = highlighted.value;

        // Add line numbers
        const lines = code.split('\n');
        const lineNumbersDiv = document.createElement('div');
        lineNumbersDiv.className = 'line-numbers-rows';
        lineNumbersDiv.style.cssText = `
          position: absolute;
          pointer-events: none;
          top: 1rem;
          left: 0;
          width: 3em;
          font-size: 100%;
          text-align: right;
          padding-right: 0.8em;
          user-select: none;
          counter-reset: linenumber;
        `;

        lines.forEach((_, idx) => {
          const lineDiv = document.createElement('div');
          lineDiv.textContent = String(idx + 1);
          lineDiv.style.cssText = `
            display: block;
            counter-increment: linenumber;
            color: #999;
            line-height: 1.5;
            font-family: monospace;
          `;
          lineNumbersDiv.appendChild(lineDiv);
        });

        // Remove old line numbers if they exist
        const oldLineNumbers = preRef.current.querySelector('.line-numbers-rows');
        if (oldLineNumbers) {
          oldLineNumbers.remove();
        }

        preRef.current.appendChild(lineNumbersDiv);
      } catch (e) {
        console.error('Error highlighting code:', e);
        codeRef.current.textContent = code;
      }
    }
  }, [code, collapsed, editable, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(code);
      setSaved(true);
      toast.success('Code saved');
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleExecute = async () => {
    if (!['python', 'py'].includes(language.toLowerCase())) {
      toast.error('Code execution only supports Python');
      return;
    }

    if (!token) {
      toast.error('Please log in to execute code');
      return;
    }

    setExecuting(true);
    setStdout(null);
    setStderr(null);
    setResult(null);
    setFiles([]);

    try {
      const response = await executeCode(token, code);
      
      if (response.stdout) {
        setStdout(response.stdout);
      }
      if (response.stderr) {
        setStderr(response.stderr);
      }
      if (response.result) {
        setResult(response.result);
      }
      if (response.files) {
        setFiles(response.files);
      }

      toast.success('Code executed successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to execute code');
      setStderr(error.message || 'Execution failed');
    } finally {
      setExecuting(false);
    }
  };

  const toggleCollapse = () => {
    setCollapsed(!collapsed);
  };

  const lineCount = code.split('\n').length;

  // Check if it's Python code
  const isPython = ['python', 'py'].includes(language.toLowerCase()) || 
                   (language === '' && /^(import |from |def |class |print\()/m.test(code));

  return (
    <div className={`relative flex flex-col rounded-3xl border border-gray-200 dark:border-gray-800 my-2 ${className}`}>
      {/* Language label */}
      <div className="absolute left-0 top-0 py-2.5 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">
        {language || 'plaintext'}
      </div>

      {/* Action buttons */}
      <div className="sticky top-0 left-0 right-0 py-2 pr-3 flex items-center justify-end w-full z-10 text-xs">
        <div className="flex items-center gap-0.5">
          {/* Collapse/Expand button */}
          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapse}
              className="h-7 px-2 gap-1 bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-900 rounded-md"
            >
              {collapsed ? (
                <>
                  <ChevronDown className="h-3 w-3" />
                  <span>Expand</span>
                </>
              ) : (
                <>
                  <ChevronUp className="h-3 w-3" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
          )}

          {/* Run button for Python */}
          {isPython && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExecute}
              disabled={executing}
              className="h-7 px-2 gap-1 bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-900 rounded-md"
            >
              <Play className="h-3 w-3" />
              <span>{executing ? 'Running' : 'Run'}</span>
            </Button>
          )}

          {/* Save button */}
          {editable && onSave && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className="h-7 px-2 bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-900 rounded-md"
            >
              <span>{saved ? 'Saved' : 'Save'}</span>
            </Button>
          )}

          {/* Copy button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2 bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-900 rounded-md"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                <span>Copy</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Code content */}
      <div className={`language-${language} rounded-t-3xl -mt-9 overflow-hidden ${
        executing || stdout || stderr || result ? '' : 'rounded-b-3xl'
      }`}>
        <div className="pt-8 bg-white dark:bg-black"></div>

        {!collapsed && (
          <>
            {editable ? (
              <CodeEditor
                value={code}
                id={id}
                lang={language}
                onChange={(value) => setCode(value)}
                onSave={handleSave}
              />
            ) : (
              <pre 
                ref={preRef}
                className="hljs p-4 overflow-x-auto m-0 relative" 
                style={{ 
                  borderTopLeftRadius: 0, 
                  borderTopRightRadius: 0,
                  paddingLeft: '3.5rem',
                  ...(executing || stdout || stderr || result ? {
                    borderBottomLeftRadius: 0,
                    borderBottomRightRadius: 0
                  } : {})
                }}
              >
                <code
                  ref={codeRef}
                  className={`language-${language} rounded-t-none whitespace-pre text-sm block`}
                  style={{ lineHeight: '1.5' }}
                >
                  {code}
                </code>
              </pre>
            )}
          </>
        )}

        {collapsed && (
          <div className="bg-white dark:bg-black dark:text-white rounded-b-3xl pt-0.5 pb-3 px-4 flex flex-col gap-2 text-xs">
            <span className="text-gray-500 italic">
              {lineCount} hidden {lineCount === 1 ? 'line' : 'lines'}
            </span>
          </div>
        )}
      </div>

      {/* Execution results */}
      {!collapsed && (executing || stdout || stderr || result || files.length > 0) && (
        <div className="bg-gray-50 dark:bg-black dark:text-white rounded-b-3xl py-4 px-4 flex flex-col gap-2">
          {executing && (
            <div>
              <div className="text-gray-500 text-xs mb-1">STDOUT/STDERR</div>
              <div className="text-sm">Running...</div>
            </div>
          )}

          {stdout && (
            <div>
              <div className="text-gray-500 text-xs mb-1">STDOUT</div>
              <pre className="text-sm whitespace-pre-wrap font-mono">{stdout}</pre>
            </div>
          )}

          {stderr && (
            <div>
              <div className="text-red-500 text-xs mb-1">STDERR</div>
              <pre className="text-sm whitespace-pre-wrap font-mono text-red-500">{stderr}</pre>
            </div>
          )}

          {result && (
            <div>
              <div className="text-gray-500 text-xs mb-1">RESULT</div>
              <pre className="text-sm whitespace-pre-wrap font-mono">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}

          {files.length > 0 && (
            <div>
              <div className="text-gray-500 text-xs mb-1">FILES</div>
              <div className="flex flex-col gap-2">
                {files.map((file, idx) => (
                  <a
                    key={idx}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline"
                  >
                    {file.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
