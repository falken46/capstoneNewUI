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

// 添加必要的全局类型定义

// 使用declare作用域确保不与其他模块冲突
declare namespace GlobalTypes {
  // 可能的机器人消息状态
  type MessageStatus = 'loading' | 'streaming' | 'complete';
  
  // 消息类型
  interface Message {
    role: string;
    content: string;
    isDeepDebug?: boolean;
    deepDebugResults?: DeepDebugResults;
  }
  
  // DeepDebug工作流步骤
  interface WorkflowStep {
    id: string;
    title: string;
    content: string;
    status: 'in_progress' | 'completed' | 'error';
  }
  
  // DeepDebug结果
  interface DeepDebugResults {
    steps: WorkflowStep[];
    fullCodeStep?: WorkflowStep | null;
    elapsedTime: string;
    status: 'idle' | 'running' | 'completed' | 'error';
    error?: string;
    query: string;
  }
  
  // 模型选项
  interface ModelOption {
    name: string;
    type: string;
    displayName: string;
  }
  
  // 可用模型列表
  interface AvailableModels {
    default: ModelOption;
    models: {
      [key: string]: ModelOption[];
    };
  }
}

// 导出类型以便在项目中使用
export type MessageStatus = GlobalTypes.MessageStatus;
export type Message = GlobalTypes.Message;
export type WorkflowStep = GlobalTypes.WorkflowStep;
export type DeepDebugResults = GlobalTypes.DeepDebugResults;
export type ModelOption = GlobalTypes.ModelOption;
export type AvailableModels = GlobalTypes.AvailableModels; 