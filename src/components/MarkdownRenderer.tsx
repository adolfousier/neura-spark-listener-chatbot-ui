import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypePrism from 'rehype-prism-plus';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Copy, Check, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

declare global {
  interface Window {
    mermaidInitialized?: boolean;
    mermaidCache?: Map<string, string>;
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
  window.mermaidCache = new Map();
}

// NUCLEAR OPTION: Render once, cache forever, NEVER re-render
const ImmutableMermaidRenderer = ({ code }: { code: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCopied, setIsCopied] = useState(false);
  const hasRenderedRef = useRef(false);
  const mountedRef = useRef(false);
  
  // Create a stable hash of the code
  const codeHash = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      const char = code.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }, [code]);

  // Render ONCE on mount, cache result, never render again
  useEffect(() => {
    if (hasRenderedRef.current || !containerRef.current || mountedRef.current) {
      return;
    }

    mountedRef.current = true;
    const container = containerRef.current;
    
    const renderOnce = async () => {
      try {
        // Check cache first
        if (window.mermaidCache?.has(codeHash)) {
          container.innerHTML = window.mermaidCache.get(codeHash)!;
          hasRenderedRef.current = true;
          return;
        }

        if (!code?.trim()) {
          container.innerHTML = '<div class="text-red-500 text-center py-4">Empty diagram code</div>';
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
          container.innerHTML = '<div class="text-red-500 text-center py-4">Invalid diagram type</div>';
          return;
        }

        // Render with unique ID
        const uniqueId = `mermaid-${codeHash}-${Date.now()}`;
        await mermaid.parse(cleanCode);
        const result = await mermaid.render(uniqueId, cleanCode);
        
        if (result?.svg) {
          const responsiveSvg = result.svg.replace(
            /<svg([^>]*)>/,
            '<svg$1 width="100%" style="max-width: 100%; height: auto; display: block;">'
          );
          
          const finalHtml = `<div class="w-full flex justify-center" style="pointer-events: none; user-select: none;">${responsiveSvg}</div>`;
          
          // Cache the result
          window.mermaidCache?.set(codeHash, finalHtml);
          
          // Set innerHTML ONCE
          container.innerHTML = finalHtml;
          hasRenderedRef.current = true;
        } else {
          container.innerHTML = '<div class="text-red-500 text-center py-4">Failed to generate diagram</div>';
        }
      } catch (err: any) {
        console.error('Mermaid render error:', err);
        container.innerHTML = `<div class="text-red-500 text-center py-4">${err?.message || 'Render failed'}</div>`;
      }
    };

    renderOnce();
  }, []); // NO DEPENDENCIES - render once only

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownload = () => {
    const svgElement = containerRef.current?.querySelector('svg');
    if (svgElement) {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diagram-${codeHash}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="my-4 w-full rounded-md border bg-background">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <span className="text-xs text-muted-foreground">mermaid diagram</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
            {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      <div className="p-4">
        <div ref={containerRef} className="min-h-[50px]">
          <div className="text-center py-4 text-muted-foreground">Loading diagram...</div>
        </div>
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
              const mermaidCode = extractText(children);
              // Use code hash as key - this ensures each unique diagram gets its own component instance
              const codeHash = mermaidCode.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
              }, 0);
              return <ImmutableMermaidRenderer key={`mermaid-${Math.abs(codeHash)}`} code={mermaidCode} />;
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