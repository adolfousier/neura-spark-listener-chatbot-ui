import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypePrism from 'rehype-prism-plus';
import rehypeRaw from 'rehype-raw';
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
  return (
    <div className={cn('prose prose-sm dark:prose-invert max-w-none break-words', className)}>
      <ReactMarkdown
        rehypePlugins={[rehypeRaw, [rehypePrism, { ignoreMissing: true }]]}
        components={{
          // Override pre to add styling and copy button
          pre: ({ node, children, ...props }) => {
            const CodeBlock = () => {
              const [isCopied, setIsCopied] = useState(false);

              const handleCopy = () => {
                let codeText = '';

                // Safely check if children is a React element with props
                if (children && typeof children === 'object' && 'props' in children) {
                  codeText = children.props.children?.toString() || '';
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

