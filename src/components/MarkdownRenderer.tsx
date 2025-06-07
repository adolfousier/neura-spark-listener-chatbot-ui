import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypePrism from 'rehype-prism-plus';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { Copy, Check, AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

declare global {
  interface Window {
    mermaidInitialized?: boolean;
  }
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

interface CodeComponentProps {
  node?: any;
  inline?: boolean;
  children?: React.ReactNode;
  className?: string;
}

interface PreComponentProps {
  node?: any;
  children?: React.ReactNode;
  [key: string]: any;
}

// Initialize mermaid ONCE at module level
if (typeof mermaid !== 'undefined' && !window.mermaidInitialized) {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    flowchart: { 
      useMaxWidth: false,
      htmlLabels: true,
      curve: 'basis'
    },
    sequence: { 
      useMaxWidth: false,
      wrap: true
    },
    logLevel: 5,
    maxTextSize: 50000,
    maxEdges: 500
  });
  window.mermaidInitialized = true;
}

// SIMPLE Mermaid renderer - ONE useEffect, render once, done
const SafeMermaidRenderer = ({ code, diagramId }: { code: string; diagramId: string }) => {
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const hasRendered = useRef(false);

  // SINGLE useEffect - render once and never again
  useEffect(() => {
    if (hasRendered.current) return;
    hasRendered.current = true;

    const renderMermaid = async () => {
      try {
        if (!code?.trim()) {
          setError('Empty diagram code');
          setIsLoading(false);
          return;
        }

        let cleanCode = code.trim();
        
        // Basic cleanup
        if (!cleanCode.includes('\n') && cleanCode.length > 50) {
          cleanCode = cleanCode
            .replace(/(flowchart\s+\w+|graph\s+\w+)/i, '$1\n')
            .replace(/-->/g, '\n-->')
            .replace(/\n+/g, '\n')
            .trim();
        }

        // Validate
        const firstLine = cleanCode.split('\n')[0].trim().toLowerCase();
        const validStarts = ['flowchart', 'graph', 'sequencediagram', 'classdiagram', 'statediagram', 'erdiagram', 'journey', 'gantt', 'pie'];
        
        if (!validStarts.some(start => firstLine.startsWith(start))) {
          setError(`Invalid diagram type`);
          setIsLoading(false);
          return;
        }

        // Render
        await mermaid.parse(cleanCode);
        const result = await mermaid.render(diagramId, cleanCode);
        
        if (result?.svg) {
          const responsiveSvg = result.svg.replace(
            /<svg([^>]*)>/,
            '<svg$1 width="100%" style="max-width: 100%; height: auto; display: block;">'
          );
          setSvgContent(responsiveSvg);
        } else {
          setError('Failed to generate diagram');
        }
      } catch (err: any) {
        setError(err?.message || 'Render failed');
      } finally {
        setIsLoading(false);
      }
    };

    renderMermaid();
  }, []); // Empty deps - run once only

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagram-${diagramId}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-4 w-full rounded-md border bg-background">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <span className="text-xs text-muted-foreground">mermaid diagram</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
            {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          {svgContent && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      
      <div className="p-4">
        {isLoading && <div className="text-center py-4">Loading...</div>}
        {error && <div className="text-red-500 text-center py-4">{error}</div>}
        {svgContent && (
          <div 
            dangerouslySetInnerHTML={{ __html: svgContent }}
            className="w-full flex justify-center"
          />
        )}
      </div>
    </div>
  );
};

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  if (content.includes('<div class="reasoning-placeholder">')) {
    return (
      <div 
        className={cn('prose prose-sm dark:prose-invert max-w-none break-words', className)}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none break-words', className)}>
      <ReactMarkdown
        rehypePlugins={[[rehypePrism, { ignoreMissing: true }]]}
        components={{
          pre: ({ children, ...props }: PreComponentProps) => (
            <div className="relative group mb-4 overflow-hidden rounded-md border">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
                <div className="text-xs text-muted-foreground">code</div>
              </div>
              <pre className="bg-muted p-4 overflow-x-auto" {...props}>
                {children}
              </pre>
            </div>
          ),
          code: ({ className, children, inline }: CodeComponentProps) => {
            const extractText = (children: React.ReactNode): string => {
              if (typeof children === 'string') return children;
              if (typeof children === 'number') return String(children);
              if (Array.isArray(children)) return children.map(extractText).join('');
              if (React.isValidElement(children)) return extractText(children.props.children);
              return '';
            };

            const isMermaid = className?.includes('language-mermaid');
            
            if (isMermaid && !inline) {
              const diagramId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
              const mermaidCode = extractText(children);
              return <SafeMermaidRenderer code={mermaidCode} diagramId={diagramId} />;
            }
            
            if (inline) {
              return (
                <code className={cn("bg-muted px-1.5 py-0.5 rounded text-sm font-mono", className)}>
                  {children}
                </code>
              );
            }
            
            return (
              <code className={cn('text-sm font-mono', className)}>
                {children}
              </code>
            );
          },
          blockquote: ({ ...props }) => (
            <blockquote className="border-l-4 border-muted pl-4 italic my-4" {...props} />
          ),
          a: ({ ...props }) => (
            <a className="text-primary underline hover:no-underline" {...props} />
          ),
          p: ({ ...props }) => (
            <p className="mb-4 last:mb-0 leading-normal" {...props} />
          ),
          ul: ({ ...props }) => (
            <ul className="mb-4 pl-6 list-disc space-y-2" {...props} />
          ),
          ol: ({ ...props }) => (
            <ol className="mb-4 pl-6 list-decimal space-y-2" {...props} />
          ),
          li: ({ ...props }) => (
            <li className="leading-normal" {...props} />
          ),
          h1: ({ ...props }) => (
            <h1 className="mt-6 mb-4 text-2xl font-bold" {...props} />
          ),
          h2: ({ ...props }) => (
            <h2 className="mt-6 mb-3 text-xl font-bold" {...props} />
          ),
          h3: ({ ...props }) => (
            <h3 className="mt-4 mb-2 text-lg font-bold" {...props} />
          ),
          table: ({ ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full border-collapse" {...props} />
            </div>
          ),
          thead: ({ ...props }) => (
            <thead className="bg-muted/50" {...props} />
          ),
          th: ({ ...props }) => (
            <th className="border px-4 py-2 text-left font-semibold" {...props} />
          ),
          td: ({ ...props }) => (
            <td className="border px-4 py-2" {...props} />
          ),
          hr: ({ ...props }) => (
            <hr className="my-6 border-t border-muted" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}