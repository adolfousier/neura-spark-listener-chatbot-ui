
// Type declaration for window.mermaid (add to types/global.d.ts or top of file)
declare global {
  interface Window {
    mermaid?: typeof import('mermaid');
    mermaidInitialized?: boolean;
  }
}