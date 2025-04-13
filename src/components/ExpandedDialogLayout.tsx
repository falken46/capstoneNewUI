import React from 'react';
import UserMessage from './UserMessage';
import InputBox from './InputBox';

interface ExpandedDialogLayoutProps {
  messages: string[];
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * 重构后的展开对话布局组件
 * - 使用 Flexbox 实现内容区填充、输入框置底。
 * - 聊天内容可滚动。
 */
const ExpandedDialogLayout: React.FC<ExpandedDialogLayoutProps> = ({
  messages,
  inputValue,
  onInputChange,
  onSubmit
}) => {
  return (
    // 主容器：垂直flex布局，占满父容器高度
    <div className='flex flex-col h-full w-full'>
      
      {/* 聊天内容区域：自动增长以填充空间(flex-1)，最小高度为0，超出时垂直滚动 */}
      <div className="flex-1 min-h-0 overflow-y-auto w-full">
        {/* 内部容器：限制宽度、居中、添加垂直内边距 */}
        <div className="w-4/5 max-w-3xl mx-auto pt-4 pb-2"> 
          {messages.map((msg, index) => (
            <UserMessage key={index} message={msg} />
          ))}
          {/* 可选：添加一个空的div作为底部缓冲，防止最后一条消息紧贴输入框 */}
          {/* <div className="h-4"></div> */}
        </div>
      </div>
      
      {/* 输入框区域：固定在底部，不收缩 */}
      <div className="w-full bg-[#212121] flex-shrink-0">
         {/* 内部容器：限制宽度、居中、添加垂直内边距 */}
         <div className="w-4/5 max-w-3xl mx-auto py-4">
          <InputBox 
            inputValue={inputValue}
            onInputChange={onInputChange}
            onSubmit={onSubmit}
            placeholder="继续输入您的问题..."
            layoutMode="expanded"
            containerClassName="w-full"
          />
        </div>
        {/* --- 诊断代码：用固定高度的 div 替换 InputBox --- */}
        {/* <div className="h-20 bg-red-500 flex items-center justify-center text-white">
          临时输入框占位符
        </div> */}
        {/* --- 诊断代码结束 --- */}
      </div>

    </div>
  );
};

export default ExpandedDialogLayout; 