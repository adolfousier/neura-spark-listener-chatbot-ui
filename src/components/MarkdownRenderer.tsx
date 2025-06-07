import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypePrism from 'rehype-prism-plus';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import { useState } from 'react';
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

// FIXED SafeMermaidRenderer - React-friendly version with SVG download
const SafeMermaidRenderer = ({ code, diagramId }: { code: string; diagramId: string }) => {
  console.log('SafeMermaidRenderer mounted/re-rendered. Code length:', code.length);

  const mermaidRef = React.useRef<HTMLDivElement>(null);
  const renderAttemptedRef = React.useRef(false); // Track if we've already attempted render
  const [isCopied, setIsCopied] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [svgContent, setSvgContent] = useState<string>('');
  const [isRendered, setIsRendered] = useState(false); // Prevent multiple renders

  const handleCopyDiagram = () => {
    try {
      navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  const handleDownloadSVG = () => {
    try {
      if (!svgContent) return;
      
      // Create a blob with the SVG content
      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `mermaid-diagram-${diagramId}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Clean up the URL object
      URL.revokeObjectURL(url);
    } catch (error) {
      console.warn('Failed to download SVG:', error);
    }
  };

  // SAFE rendering function that doesn't directly manipulate DOM
  const attemptMermaidRender = React.useCallback(async () => {
    // Prevent multiple renders - check both state and ref
    if (isRendered || renderAttemptedRef.current) return;
    
    renderAttemptedRef.current = true;
    
    try {
      // Basic validation first
      if (!code || code.trim().length === 0) {
        setRenderError('Empty diagram code');
        setIsLoading(false);
        return;
      }

      // Clean the code safely
      let cleanCode = code.trim();
      
      // Very basic cleanup
      if (!cleanCode.includes('\n') && cleanCode.length > 50) {
        cleanCode = cleanCode
          .replace(/(flowchart\s+\w+|graph\s+\w+)/i, '$1\n')
          .replace(/-->/g, '\n-->')
          .replace(/\n+/g, '\n')
          .trim();
      }

      // Validate diagram type
      const firstLine = cleanCode.split('\n')[0].trim().toLowerCase();
      const validStarts = ['flowchart', 'graph', 'sequencediagram', 'classdiagram', 'statediagram', 'erdiagram', 'journey', 'gantt', 'pie'];
      
      if (!validStarts.some(start => firstLine.startsWith(start))) {
        setRenderError(`Invalid diagram type. Must start with: ${validStarts.join(', ')}`);
        setIsLoading(false);
        return;
      }

      // SAFE mermaid operations
      try {
        // Check if mermaid is available
        if (!mermaid) {
          throw new Error('Mermaid library not available');
        }

        // Parse validation
        await mermaid.parse(cleanCode);

        // Render to SVG string (don't inject into DOM directly)
        const result = await mermaid.render(diagramId, cleanCode);
        
        if (result?.svg) {
          // Ensure the SVG is responsive and full-width
          let responsiveSvg = result.svg;
          
          // Remove fixed width/height attributes and add responsive styling
          responsiveSvg = responsiveSvg.replace(
            /<svg([^>]*)>/,
            '<svg$1 width="100%" style="max-width: 100%; height: auto; display: block;">'
          );
          
          // Store SVG content in state instead of injecting directly
          setSvgContent(responsiveSvg);
          setIsRendered(true); // Mark as rendered to prevent re-renders
          setIsLoading(false);
          console.log('Mermaid diagram rendered successfully');
        } else {
          throw new Error('Failed to generate diagram SVG');
        }

      } catch (mermaidError: any) {
        console.warn('Mermaid error (safely caught):', mermaidError);
        setRenderError(mermaidError?.message || 'Unknown error');
        setIsLoading(false);
      }

    } catch (outerError: any) {
      console.warn('Outer rendering error (safely caught):', outerError);
      setRenderError('Failed to process diagram');
      setIsLoading(false);
    }
  }, [code, diagramId, isRendered]);

  React.useEffect(() => {
        console.log('SafeMermaidRenderer useEffect triggered.');
        // Only render if not already rendered AND not already attempted
        if (!isRendered && !renderError && !renderAttemptedRef.current) {
      // Check if there's already rendered content in the DOM (for old conversations)
      const existingMermaid = mermaidRef.current?.querySelector('svg');
      if (existingMermaid) {
        // Already has content, mark as rendered and don't re-render
        setIsRendered(true);
        setIsLoading(false);
        setSvgContent(existingMermaid.outerHTML);
        renderAttemptedRef.current = true;
        return;
      }
      
      // Render with a slight delay to avoid conflicts
      const timeoutId = setTimeout(() => {
        attemptMermaidRender().catch(err => {
          console.warn('Async render error (safely caught):', err);
          setRenderError('Async rendering failed');
          setIsLoading(false);
        });
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, []); // COMPLETELY EMPTY dependency array - render only once on mount

  return (
    <div className="mermaid-diagram-container my-4 w-full overflow-hidden rounded-md border bg-background relative group">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>mermaid diagram</span>
          {renderError && <AlertTriangle className="h-3 w-3 text-red-500" />}
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-md opacity-70 hover:opacity-100"
                  onClick={handleCopyDiagram}
                >
                  {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{isCopied ? 'Copied!' : 'Copy diagram code'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {svgContent && !renderError && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-md opacity-70 hover:opacity-100"
                    onClick={handleDownloadSVG}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Download SVG</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
      
      <div className="p-4 w-full">
        <div 
          ref={mermaidRef} 
          className="mermaid w-full min-h-[100px] flex items-center justify-center overflow-x-auto"
          data-diagram-id={diagramId}
        >
          {isLoading && !renderError && (
            <div className="text-muted-foreground">Rendering diagram...</div>
          )}
          {svgContent && !renderError && (
            <div 
              dangerouslySetInnerHTML={{ __html: svgContent }}
              className="w-full flex justify-center"
              style={{ 
                maxWidth: '100%',
                overflow: 'visible'
              }}
            />
          )}
        </div>
      </div>
      
      {renderError && (
        <div className="mx-4 mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded text-sm">
          <div className="font-medium text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Diagram Error
          </div>
          <div className="text-red-600 dark:text-red-300 mb-2">
            {renderError}
          </div>
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-red-500 hover:text-red-700">
              Show raw diagram code
            </summary>
            <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs overflow-x-auto border border-red-200 dark:border-red-700 max-h-32">
              {code}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  // Check if content contains HTML placeholder
  const isPlaceholder = content.includes('<div class="reasoning-placeholder">');
  
  // If it's a placeholder, render with dangerouslySetInnerHTML
  if (isPlaceholder) {
    return (
      <div 
        className={cn('prose prose-sm dark:prose-invert max-w-none break-words', className)}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }
  
  // SAFE Mermaid initialization - only once with more stable config
  React.useEffect(() => {
    try {
      if (typeof mermaid !== 'undefined' && !window.mermaidInitialized) {
        mermaid.initialize({
          startOnLoad: false,
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          flowchart: { 
            useMaxWidth: false, // Changed to false to prevent resizing
            htmlLabels: true,
            curve: 'basis'
          },
          sequence: { 
            useMaxWidth: false, // Changed to false to prevent resizing
            wrap: true
          },
          gantt: { 
            useMaxWidth: false // Changed to false to prevent resizing
          },
          journey: { 
            useMaxWidth: false // Changed to false to prevent resizing
          },
          er: { 
            useMaxWidth: false // Changed to false to prevent resizing
          },
          logLevel: 5, // Suppress most logs
          maxTextSize: 50000,
          maxEdges: 500
        });
        window.mermaidInitialized = true; // Global flag to prevent re-initialization
      }
    } catch (error) {
      console.warn('Mermaid initialization failed (safely ignored):', error);
    }
  }, []); // Empty dependency array to run only once
  
  // SAFE theme change handling - more stable with longer debounce
  React.useEffect(() => {
    try {
      let timeoutId: NodeJS.Timeout;
      
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'class' && 
              mutation.target === document.documentElement) {
            
            // Longer debounce to prevent excessive theme changes
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              try {
                if (typeof mermaid !== 'undefined') {
                  // Only update theme, don't reinitialize everything
                  const isDark = document.documentElement.classList.contains('dark');
                  mermaid.initialize({
                    theme: isDark ? 'dark' : 'default'
                  });
                }
              } catch (error) {
                console.warn('Mermaid theme change failed (safely ignored):', error);
              }
            }, 1000); // Increased to 1 second debounce
          }
        });
      });
      
      observer.observe(document.documentElement, { attributes: true });
      return () => {
        observer.disconnect();
        clearTimeout(timeoutId);
      };
    } catch (error) {
      console.warn('Theme observer setup failed (safely ignored):', error);
    }
  }, []); // Empty dependency array

  // SAFE source link handling
  React.useEffect(() => {
    try {
      const handleSourceLinks = () => {
        const sourceLinks = document.querySelectorAll('.source-link');
        sourceLinks.forEach(link => {
          link.addEventListener('mouseenter', () => {
            const linkRect = link.getBoundingClientRect();
            if (linkRect.top < 150) {
              link.classList.add('preview-below');
            }
          });
        });
      };
      
      const timer = setTimeout(handleSourceLinks, 100);
      return () => clearTimeout(timer);
    } catch (error) {
      console.warn('Source link handling failed (safely ignored):', error);
    }
  }, [content]);

  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none break-words', className)}>
      <ReactMarkdown
        rehypePlugins={[
          [rehypePrism, { ignoreMissing: true }]
        ]}
        components={{
          // Override pre to add styling and copy button
          pre: ({ node, children, ...props }: PreComponentProps) => {
            const CodeBlock = () => {
              const [isCopied, setIsCopied] = useState(false);

              const handleCopy = () => {
                try {
                  let codeText = '';

                  if (children && React.isValidElement(children)) {
                    const childElement = children as React.ReactElement<{ children?: React.ReactNode; className?: string }>;
                    if (Array.isArray(childElement.props.children)) {
                      codeText = childElement.props.children.map((child: any) => {
                        return typeof child === 'string' ? child : '';
                      }).join('');
                    } else {
                      codeText = String(childElement.props.children || '');
                    }
                  }

                  if (typeof codeText === 'string') {
                    navigator.clipboard.writeText(codeText);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }
                } catch (error) {
                  console.warn('Copy failed (safely ignored):', error);
                }
              };

              return (
                <div className="relative group mb-4 overflow-hidden rounded-md border">
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
                    <div className="text-xs text-muted-foreground">
                      {React.isValidElement(children) && 
                       (children as React.ReactElement<{ className?: string }>).props.className
                        ? (children as React.ReactElement<{ className?: string }>).props.className.replace(/language-/, '')
                        : 'code'}
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-md"
                            onClick={handleCopy}
                          >
                            {isCopied ?
                              <Check className="h-3.5 w-3.5" /> :
                              <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p>{isCopied ? 'Copied!' : 'Copy code'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <pre className="bg-muted p-4 overflow-x-auto" {...props}>
                    {children}
                  </pre>
                </div>
              );
            };

            return <CodeBlock />;
          },
          // ULTRA-SAFE code component
          code: ({ node, className, children, inline }: CodeComponentProps) => {
            // Function to safely extract text from React children
            const extractTextFromChildren = (children: React.ReactNode): string => {
              try {
                if (typeof children === 'string') {
                  return children;
                }
                if (typeof children === 'number') {
                  return String(children);
                }
                if (Array.isArray(children)) {
                  return children.map(extractTextFromChildren).join('');
                }
                if (React.isValidElement(children)) {
                  return extractTextFromChildren(children.props.children);
                }
                if (children && typeof children === 'object' && 'props' in children) {
                  return extractTextFromChildren((children as any).props.children);
                }
                return '';
              } catch (error) {
                console.warn('Text extraction failed (safely ignored):', error);
                return '';
              }
            };

            // Check if this is a mermaid block
            const isMermaid = className === 'language-mermaid' || 
                            className?.includes('language-mermaid') ||
                            (className && /^language-mermaid(\s|$)/.test(className));
            
            // Handle Mermaid code blocks with MAXIMUM safety
            if (isMermaid && !inline) {
              const diagramId = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
              const mermaidCode = extractTextFromChildren(children);
              
              // Use our ultra-safe mermaid renderer
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
          // Style blockquotes
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-muted pl-4 italic my-4" {...props} />
          ),
          // Style links
          a: ({ node, ...props }) => (
            <a className="text-primary underline hover:no-underline" {...props} />
          ),
          // Ensure paragraphs have proper spacing and no unnecessary line breaks
          p: ({ node, ...props }) => (
            <p className="mb-4 last:mb-0 leading-normal" {...props} />
          ),
          // Ensure lists have proper spacing
          ul: ({ node, ...props }) => (
            <ul className="mb-4 pl-6 list-disc space-y-2" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="mb-4 pl-6 list-decimal space-y-2" {...props} />
          ),
          // Ensure list items have proper spacing
          li: ({ node, ...props }) => (
            <li className="leading-normal" {...props} />
          ),
          // Ensure headings have proper spacing
          h1: ({ node, ...props }) => (
            <h1 className="mt-6 mb-4 text-2xl font-bold" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="mt-6 mb-3 text-xl font-bold" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="mt-4 mb-2 text-lg font-bold" {...props} />
          ),
          // Add proper table styling
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table className="w-full border-collapse" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-muted/50" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="border px-4 py-2 text-left font-semibold" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border px-4 py-2" {...props} />
          ),
          // Add proper horizontal rule styling
          hr: ({ node, ...props }) => (
            <hr className="my-6 border-t border-muted" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}