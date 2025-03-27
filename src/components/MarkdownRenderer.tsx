import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypePrism from 'rehype-prism-plus';
import rehypeRaw from 'rehype-raw';
// Import rehype-raw and rehype-prism for syntax highlighting
// Removing rehype-mermaid import as it causes async issues
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

interface CodeComponentProps {
  node: any;
  inline: boolean;
  children: React.ReactNode;
  className?: string;
}

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
  
  // Initialize mermaid with configuration
  React.useEffect(() => {
    console.log('Initializing Mermaid with configuration');
    try {
      mermaid.initialize({
        startOnLoad: false, // We'll manually render diagrams
        theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
        securityLevel: 'loose', // Allows for more flexibility in diagram creation
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        flowchart: { useMaxWidth: true },
        sequence: { useMaxWidth: true },
        gantt: { useMaxWidth: true },
        journey: { useMaxWidth: true },
        er: { useMaxWidth: true },
        logLevel: 1 // Changed to verbose logging to see all messages
      });
      console.log('Mermaid initialized successfully');
    } catch (error) {
      console.error('Error initializing Mermaid:', error);
    }
  }, []);
  
  // Re-initialize mermaid when theme changes
  React.useEffect(() => {
    console.log('Setting up theme change observer for Mermaid');
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && 
            mutation.target === document.documentElement) {
          console.log('Theme changed, re-initializing Mermaid');
          // Re-initialize mermaid with the new theme
          try {
            mermaid.initialize({
              startOnLoad: false,
              theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default'
            });
            console.log('Mermaid re-initialized with new theme');
          } catch (error) {
            console.error('Error re-initializing Mermaid after theme change:', error);
          }
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    console.log('Theme observer set up successfully');
    
    return () => observer.disconnect();
  }, []);

  // Add effect to handle source link hovers
  React.useEffect(() => {
    // Script to handle source link hover interactions
    const handleSourceLinks = () => {
      // Find all source links after rendering
      const sourceLinks = document.querySelectorAll('.source-link');
      
      // Add hover event listeners to handle preview visibility
      sourceLinks.forEach(link => {
        link.addEventListener('mouseenter', () => {
          // Make sure hover effects stay within viewport
          const linkRect = link.getBoundingClientRect();
          if (linkRect.top < 150) {
            // If link is too close to top, adjust the hover position
            link.classList.add('preview-below');
          }
        });
      });
    };
    
    // Run the handler after a short delay to ensure DOM is fully updated
    const timer = setTimeout(() => {
      handleSourceLinks();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [content]); // Re-run when content changes

  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none break-words', className)}>
      <ReactMarkdown
        rehypePlugins={[
          rehypeRaw, 
          [rehypePrism, { ignoreMissing: true }]
          // Removed rehype-mermaid plugin as it causes async issues
        ]}
        components={{
          // Override pre to add styling and copy button
          pre: ({ node, children, ...props }) => {
            const CodeBlock = () => {
              const [isCopied, setIsCopied] = useState(false);

              const handleCopy = () => {
                let codeText = '';

                // Safely check if children is a React element with props
                if (children && typeof children === 'object' && 'props' in children) {
                  // Extract the actual text content from the children
                  if (Array.isArray(children.props.children)) {
                    codeText = children.props.children.map(child => {
                      return typeof child === 'string' ? child : '';
                    }).join('');
                  } else {
                    codeText = String(children.props.children || '');
                  }
                }

                if (typeof codeText === 'string') {
                  navigator.clipboard.writeText(codeText);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2000);
                }
              };

              return (
                <div className="relative group mb-4 overflow-hidden rounded-md border">
                  <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
                    <div className="text-xs text-muted-foreground">
                      {React.isValidElement(children) && children.props.className
                        ? children.props.className.replace(/language-/, '')
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
          // Override code to add styling
          code: ({ node, className, children, inline }: CodeComponentProps) => {
            // Handle Mermaid code blocks
            if (className === 'language-mermaid') {
              const mermaidRef = React.useRef<HTMLDivElement>(null);
              const [diagramId] = React.useState(`mermaid-${Math.random().toString(36).substring(2, 11)}`);
              const [isCopied, setIsCopied] = useState(false);
              
              React.useEffect(() => {
                console.log('Mermaid diagram useEffect triggered', { diagramId });
                if (mermaidRef.current) {
                  console.log('mermaidRef is available');
                  const mermaidCode = String(children).replace(/\n$/, '');
                  console.log('Mermaid code to render:', mermaidCode);
                  try {
                    // First try to parse the diagram to validate it
                    console.log('Parsing mermaid diagram to validate');
                    mermaid.parse(mermaidCode);
                    
                    // Clear previous content
                    mermaidRef.current.innerHTML = '';
                    console.log('Previous content cleared, attempting to render diagram');
                    // Render the diagram
                    console.log('Calling mermaid.render with ID:', diagramId);
                    mermaid.render(diagramId, mermaidCode).then(({ svg, bindFunctions }) => {
                      console.log('Mermaid rendered successfully, svg length:', svg.length);
                      if (mermaidRef.current) {
                        console.log('Inserting SVG into DOM');
                        // Set the SVG content directly
                        mermaidRef.current.innerHTML = svg;
                        // Apply any interactive functions to the diagram
                        if (bindFunctions) bindFunctions(mermaidRef.current);
                        console.log('SVG inserted successfully');
                      } else {
                        console.error('mermaidRef.current no longer available after successful render');
                      }
                    }).catch(error => {
                      console.error('Mermaid rendering error:', error);
                      if (mermaidRef.current) {
                        console.log('Rendering failed, displaying code as fallback');
                        mermaidRef.current.innerHTML = `<pre>${mermaidCode}</pre>`;
                      }
                    });
                  } catch (error) {
                    console.error('Mermaid error during render attempt:', error);
                    if (mermaidRef.current) {
                      console.log('Exception caught, displaying code as fallback');
                      mermaidRef.current.innerHTML = `<pre>${mermaidCode}</pre>`;
                    }
                  }
                } else {
                  console.error('mermaidRef is not available, cannot render diagram');
                }
              }, [children, diagramId]);

              const handleCopyDiagram = () => {
                const mermaidCode = String(children).replace(/\n$/, '');
                navigator.clipboard.writeText(mermaidCode);
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
              };

              React.useEffect(() => {
                console.log('Component mounted with mermaidRef:', mermaidRef.current ? 'available' : 'not available');
                return () => {
                  console.log('Component with mermaid diagram unmounting');
                };
              }, []);

              return (
                <div className="mermaid-diagram-container my-4 overflow-auto rounded-md border bg-muted p-4 relative group">
                  <div ref={mermaidRef} className="mermaid" data-diagram-id={diagramId}>
                    {/* Diagram will be rendered here */}
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 rounded-md opacity-70 hover:opacity-100"
                          onClick={handleCopyDiagram}
                        >
                          {isCopied ?
                            <Check className="h-3.5 w-3.5" /> :
                            <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>{isCopied ? 'Copied!' : 'Copy diagram code'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              );
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

