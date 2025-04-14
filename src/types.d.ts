declare module 'react-markdown' {
  import React from 'react';
  
  export interface ReactMarkdownOptions {
    children: string;
    remarkPlugins?: any[];
    rehypePlugins?: any[];
    components?: Record<string, React.ComponentType<any>>;
  }
  
  const ReactMarkdown: React.FC<ReactMarkdownOptions>;
  
  export default ReactMarkdown;
}

declare module 'remark-math' {
  const remarkMath: any;
  export default remarkMath;
}

declare module 'rehype-katex' {
  const rehypeKatex: any;
  export default rehypeKatex;
} 