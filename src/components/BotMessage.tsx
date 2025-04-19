import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'katex/dist/katex.min.css';
import { Message } from '../services/chatService';
import { CopyOutlined, CheckOutlined, ExpandOutlined } from '@ant-design/icons';

// 自定义代码高亮主题
const customTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    padding: 20,
    margin: 0,
    borderRadius: 0,
    background: '#171717',
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: '#171717',
  }
};

// 定义消息状态类型
export type MessageStatus = 'loading' | 'streaming' | 'complete';

// 为代码组件定义类型
interface CodeProps {
  node?: any;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}

// BotMessage 组件的属性
interface BotMessageProps {
  message: Message;
  status: MessageStatus;
  className?: string;
  onCanvasModeToggle?: (code?: string, language?: string) => void; // 更新参数类型
}

// 代码块头部组件
const CodeHeader: React.FC<{
  language: string;
  code: string;
  onCanvasModeToggle?: (code?: string, language?: string) => void; // 更新参数类型
}> = ({ language, code, onCanvasModeToggle }) => {
  const [copied, setCopied] = useState(false);
  
  // 格式化语言名称
  const formatLanguage = (lang: string) => {
    const langMap: Record<string, string> = {
      'js': 'JavaScript',
      'ts': 'TypeScript',
      'jsx': 'React JSX',
      'tsx': 'React TSX',
      'py': 'Python',
      'rb': 'Ruby',
      'go': 'Go',
      'java': 'Java',
      'c': 'C',
      'cpp': 'C++',
      'cs': 'C#',
      'php': 'PHP',
      'rust': 'Rust',
      'swift': 'Swift',
      'kotlin': 'Kotlin',
      'sh': 'Shell',
      'bash': 'Bash',
      'sql': 'SQL',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'json': 'JSON',
      'yaml': 'YAML',
      'yml': 'YAML',
      'md': 'Markdown',
      'text': 'Text',
    };
    
    return langMap[lang.toLowerCase()] || lang.toUpperCase();
  };
  
  // 复制代码到剪贴板
  const copyToClipboard = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };
  
  return (
    <div className="flex justify-between items-center px-4 py-2 bg-[#2F2F2F] border-b border-[#171717]">
      <div className="text-xs text-gray-400 font-mono">
        {formatLanguage(language)}
      </div>
      <div className="flex items-center space-x-2">
        {/* 新增: 进入Canvas模式按钮 - 只在代码块内显示 */}
        {onCanvasModeToggle && (
          <button
            onClick={() => onCanvasModeToggle(code, language)} // 传递当前代码块和语言信息
            className="text-gray-400 hover:text-white transition-colors flex items-center"
            title="在画布模式中查看此代码片段"
            aria-label="在画布模式中查看此代码片段"
          >
            <div className="flex items-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-1">
                <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 3V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-xs">画布</span>
            </div>
          </button>
        )}
        
        <button 
          onClick={copyToClipboard}
          className="text-gray-400 hover:text-white transition-colors"
          title="复制代码"
          aria-label="复制代码"
        >
          {copied ? (
            <CheckOutlined style={{ fontSize: '16px' }} />
          ) : (
            <CopyOutlined style={{ fontSize: '16px' }} />
          )}
        </button>
      </div>
    </div>
  );
};

// 代码块组件
const CodeBlock: React.FC<{
  language: string;
  children: string;
  onCanvasModeToggle?: (code?: string, language?: string) => void; // 更新参数类型
}> = ({ language, children, onCanvasModeToggle }) => {
  return (
    <div className="rounded-md overflow-hidden border border-[#2F2F2F] -mx-6 -my-4">
      <CodeHeader language={language} code={children} onCanvasModeToggle={onCanvasModeToggle} />
      <SyntaxHighlighter
        style={customTheme}
        language={language}
        PreTag="div"
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
};

// Markdown渲染器组件
const MarkdownRenderer: React.FC<{
  content: string;
  isStreaming?: boolean;
  onCanvasModeToggle?: (code?: string, language?: string) => void; // 更新参数类型
}> = ({ content, isStreaming = false, onCanvasModeToggle }) => {
  // 定义代码渲染函数
  const renderCode = ({ node, inline, className, children, ...props }: CodeProps) => {
    // 获取代码内容，转为字符串便于判断
    const codeContent = String(children).replace(/\n$/, '');
    
    // 增强内联判断: 检查是否标记为内联或者是否位于<pre>标签之外
    // React Markdown将代码块的代码标记为非内联，但有时候判断可能不准确
    const isReallyInline = inline === true || 
      // 检查代码内容是否有换行符，如果没有，内容又很短，很可能是内联代码
      (codeContent.indexOf('\n') === -1 && codeContent.length < 80 && 
       // 确保不是由```包裹的单行代码块 
       !(className && /language-/.test(className)));
    
    if (!isReallyInline) {
      // 处理作为代码块的代码
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'text'; // 如果没有指定语言，则默认使用'text'
      return <CodeBlock language={language} onCanvasModeToggle={onCanvasModeToggle}>{codeContent}</CodeBlock>;
    }
    
    // 对于内联代码，使用普通的<code>标签
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  };
  
  const markdownComponents = {
    code: renderCode,
    // 添加pre标签渲染函数，给予默认padding
    pre: ({node, children, ...props}: {node?: any, children?: React.ReactNode}) => (
      <pre className="py-4 px-6" {...props}>
        {children}
      </pre>
    ),
    table: ({ children, ...props }: { children?: React.ReactNode }) => (
      <div className="overflow-x-auto rounded-lg">
        <table className="min-w-full border border-[#3A3A3A] rounded-lg overflow-clip" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }: { children?: React.ReactNode }) => (
      <thead className="bg-[#2F2F2F]" {...props}>
        {children}
      </thead>
    ),
    tbody: ({ children, ...props }: { children?: React.ReactNode }) => (
      <tbody className="" {...props}>
        {children}
      </tbody>
    ),
    tr: ({ children, ...props }: { children?: React.ReactNode }) => (
      <tr className="border border-[#3A3A3A] last:border-0 transition-colors duration-200 ease-in-out hover:bg-[#333333]" {...props}>
        {children}
      </tr>
    ),
    th: ({ children, ...props }: { children?: React.ReactNode }) => (
      <th className="px-5 py-4 text-left text-xs font-medium text-gray-200 uppercase tracking-wider" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }: { children?: React.ReactNode }) => (
      <td className="px-5 py-4 text-sm text-gray-300" {...props}>
        {children}
      </td>
    )
  };
  
  if (isStreaming) {
    return (
      <div className="text-transparent bg-clip-text animate-shine" style={{
        backgroundImage: 'linear-gradient(120deg, rgba(255, 255, 255, 0.4) 40%, rgba(255, 255, 255, 1) 50%, rgba(255, 255, 255, 0.4) 60%)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        animationDuration: '3s',
      }}>
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[rehypeKatex]}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }
  
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex]}
      components={markdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
};

// 加载中指示器组件
const LoadingIndicator: React.FC = () => (
  <div className="flex items-center space-x-1 h-6">
    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-dot-bounce-1"></div>
    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-dot-bounce-2"></div>
    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-dot-bounce-3"></div>
  </div>
);

// 主组件
const BotMessage: React.FC<BotMessageProps> = ({ message, status, className = '', onCanvasModeToggle }) => {
  const [displayedMessage, setDisplayedMessage] = useState<string>('');
  const prevContentRef = useRef<string>('');
  const messageContent = message.content || '';
  
  // 处理流式消息更新
  useEffect(() => {
    if (status === 'streaming' && prevContentRef.current !== messageContent) {
      setDisplayedMessage(messageContent);
      prevContentRef.current = messageContent;
    }
  }, [messageContent, status]);
  
  // 显示加载状态
  if (status === 'loading') {
    return (
      <div className={`flex justify-start mb-4 ${className}`}>
        <LoadingIndicator />
      </div>
    );
  }
  
  // 根据状态确定要显示的内容
  const contentToDisplay = status === 'streaming' ? displayedMessage : messageContent;
  const isStreaming = status === 'streaming';
  
  return (
    <div className={`mb-10 ${className}`}>
      <div className="prose prose-invert w-full text-white break-words text-left prose-p:text-left prose-headings:text-left prose-ul:text-left prose-ol:text-left prose-p:w-full prose-pre:w-full max-w-none">
        <MarkdownRenderer content={contentToDisplay} isStreaming={isStreaming} onCanvasModeToggle={onCanvasModeToggle} />
      </div>
    </div>
  );
};

export default BotMessage; 