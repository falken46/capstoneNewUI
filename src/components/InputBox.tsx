import React, { useRef, useEffect } from 'react';

interface InputBoxProps {
  inputValue: string;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder?: string;
  layoutMode: 'compact' | 'expanded';
  containerClassName?: string;
  isLoading?: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}

/**
 * 重构后的 InputBox 组件
 * - 移除了所有内置的布局切换动画 (FLIP, initial style, transitions)。
 * - 保留核心功能：根据 layoutMode 应用不同的样式，自适应高度。
 */
const InputBox: React.FC<InputBoxProps> = ({
  inputValue,
  onInputChange,
  onSubmit,
  placeholder = '您想了解什么？',
  layoutMode,
  containerClassName = '',
  isLoading = false,
  textareaRef: externalTextareaRef
}) => {
  const hasContent = inputValue.trim().length > 0;
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  // 使用传入的ref或内部ref
  const textareaRef = externalTextareaRef || internalTextareaRef;

  // 自动调整textarea高度的函数
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // 先将高度设为auto以获取准确的scrollHeight
      textarea.style.height = 'auto';
      
      // 计算新高度，但不超过最大高度
      const maxHeight = layoutMode === 'compact' ? 300 : 200;
      const newHeight = Math.min(textarea.scrollHeight, maxHeight);
      
      // 设置新高度
      textarea.style.height = `${newHeight}px`;
      
      // 当内容超过最大高度时，确保可以滚动
      if (textarea.scrollHeight > maxHeight) {
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.overflowY = 'hidden';
      }
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (hasContent && !isLoading) {
        onSubmit(e as unknown as React.FormEvent);
      }
    }
  };

  // 监听输入内容变化，调整高度
  useEffect(() => {
    adjustTextareaHeight();
  }, [inputValue, layoutMode]);

  // 获取容器类名
  const getContainerClassName = () => {
    return containerClassName;
  };

  // 获取查询栏类名
  const getQueryBarClassName = () => {
    // 基础样式 (保留 transition)
    const baseClass = 'query-bar group bg-[#2a2a2a] relative w-full ring-1 ring-[#494A4C] ring-inset overflow-hidden hover:ring-[#6e6e6e] hover:bg-[#333333] focus-within:ring-1 focus-within:ring-[#6e6e6e] hover:focus-within:ring-[#6e6e6e] px-2 @[480px]/input:px-3 rounded-3xl transition-shadow duration-300 ease-in-out';
    // 总是需要底部内边距来容纳按钮
    const paddingClass = 'pb-12'; 
    // 紧凑模式下限制最大宽度 (可选，如果需要)
    const widthClass = layoutMode === 'compact' ? 'max-w-full' : ''; 
    // 移除 focusGlowClass，因为焦点样式由 CSS 控制
    // const focusGlowClass = 'focus-within:shadow-[0_0_10px_3px_rgba(255,215,0,0.4)]';
    return `${baseClass} ${paddingClass} ${widthClass}`;
  };

  // 获取textarea高度和内边距
  const getTextareaStyle = () => {
    const baseStyle = {
      resize: "none" as const,
      overflow: "auto" as const  // 从 "hidden" 改为 "auto" 允许滚动
    };
    
    if (layoutMode === 'expanded') {
      // 展开模式样式
      return {
        ...baseStyle,
        minHeight: "30px", // 较小最小高度
        maxHeight: "200px",
      };
    } else {
      // 紧凑模式样式
      return {
        ...baseStyle,
        minHeight: "44px", // 较大最小高度
        maxHeight: "300px" // 从120px增加到200px
      };
    }
  };

  // 获取textarea内容的类名
  const getTextareaClassName = () => {
    // 基础样式
    const baseClass = "w-full px-2 @[480px]/input:px-3 bg-transparent focus:outline-none text-white align-bottom my-0";
    // 根据模式调整垂直内边距
    const paddingClass = layoutMode === 'expanded' ? 'pt-4 pb-4' : 'pt-5 pb-5'; 
    return `${baseClass} ${paddingClass}`;
  };

  return (
    <div className={getContainerClassName()}>
      <form onSubmit={(e) => {
        e.preventDefault();
        if (!isLoading && hasContent) {
          onSubmit(e);
        }
      }} className="w-full text-base flex flex-col gap-2 items-center justify-center relative z-10">
        <div className="flex flex-row gap-2 justify-center w-full relative">
          <div className={getQueryBarClassName()}>
            <div className="relative z-10">
              <span className={`absolute px-2 @[480px]/input:px-3 py-5 text-[#6e6e6e] pointer-events-none ${inputValue ? 'hidden' : 'block'}`}>
                {placeholder}
              </span>
              <textarea 
                ref={textareaRef}
                dir="auto" 
                aria-label="输入您的问题"
                className={getTextareaClassName()}
                style={getTextareaStyle()} 
                spellCheck="false"
                value={inputValue}
                onChange={(e) => {
                  onInputChange(e);
                  // adjustTextareaHeight(); // useEffect 会处理
                }}
                onKeyDown={handleKeyDown}
                placeholder=""
                disabled={isLoading}
              ></textarea>
            </div>
            
            <div className="flex gap-1.5 absolute inset-x-0 bottom-0 border-2 border-transparent max-w-full p-2">
              {/* 左侧按钮区域 */}
              <div className="flex items-center gap-2">
                {/* 附件按钮 */}
                <button 
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium leading-[normal] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-default h-9 rounded-full py-2 relative px-2 bg-[#373737] border w-9 aspect-square border-[#494A4C] hover:border-[#6e6e6e] text-[#e0e0e0] hover:text-white hover:bg-[#5a5a5a]"
                  type="button" 
                  aria-label="附件" 
                  tabIndex={0}
                  disabled={isLoading}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-[2] text-[#e0e0e0]">
                    <path d="M10 9V15C10 16.1046 10.8954 17 12 17V17C13.1046 17 14 16.1046 14 15V7C14 4.79086 12.2091 3 10 3V3C7.79086 3 6 4.79086 6 7V15C6 18.3137 8.68629 21 12 21V21C15.3137 21 18 18.3137 18 15V8" stroke="currentColor"></path>
                  </svg>
                </button>

                {/* DeepDebug 按钮 */}
                <div className="flex border rounded-full items-center max-h-[36px] box-border relative overflow-hidden hover:border-[#6e6e6e] bg-[#373737] border-[#494A4C]">
                  <button 
                    className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium leading-[normal] cursor-pointer focus-visible:outline-none focus-visible:ring-1 disabled:opacity-50 disabled:cursor-default text-[#e0e0e0] h-9 rounded-full px-3.5 py-2 group focus-visible:ring-transparent box-border relative overflow-hidden bg-transparent hover:bg-[#5a5a5a] focus-visible:bg-[#5a5a5a] hover:text-white"
                    type="button" 
                    tabIndex={0} 
                    aria-pressed="true" 
                    aria-label="DeepDebug"
                    disabled={isLoading}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-[2] group-hover:text-white text-[#e0e0e0] flex-shrink-0">
                        <path fillRule="evenodd" clipRule="evenodd" d="M12.47 15.652a1 1 0 0 1 1.378.318l2.5 4a1 1 0 1 1-1.696 1.06l-2.5-4a1 1 0 0 1 .318-1.378Z" fill="currentColor"></path>
                        <path fillRule="evenodd" clipRule="evenodd" d="M11.53 15.652a1 1 0 0 1 .318 1.378l-2.5 4a1 1 0 0 1-1.696-1.06l2.5-4a1 1 0 0 1 1.378-.318ZM17.824 4.346a.5.5 0 0 0-.63-.321l-.951.309a1 1 0 0 0-.642 1.26l1.545 4.755a1 1 0 0 0 1.26.642l.95-.309a.5.5 0 0 0 .322-.63l-1.854-5.706Zm-1.248-2.223a2.5 2.5 0 0 1 3.15 1.605l1.854 5.706a2.5 2.5 0 0 1-1.605 3.15l-.951.31a2.992 2.992 0 0 1-2.443-.265l-2.02.569a1 1 0 1 1-.541-1.926l1.212-.34-1.353-4.163L5 10.46a1 1 0 0 0-.567 1.233l.381 1.171a1 1 0 0 0 1.222.654l3.127-.88a1 1 0 1 1 .541 1.926l-3.127.88a3 3 0 0 1-3.665-1.961l-.38-1.172a3 3 0 0 1 1.7-3.697l9.374-3.897a3 3 0 0 1 2.02-2.285l.95-.31Z" fill="currentColor"></path>
                        <path fillRule="evenodd" clipRule="evenodd" d="M12 12.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3ZM8.5 14a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z" fill="currentColor"></path>
                      </svg>
                      <span className="inline-block align-middle -mt-0.5">DeepDebug</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* 提交按钮 */}
              <div className="ml-auto flex flex-row items-end gap-1">
                <button 
                  className={`inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium leading-[normal] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-9 rounded-full py-2 relative px-2 w-9 aspect-square ${
                    hasContent && !isLoading
                      ? 'bg-white border-white text-[#373737] hover:scale-110 hover:shadow-md cursor-pointer' 
                      : 'bg-[#373737] border-[#373737] text-white opacity-100 cursor-default pointer-events-none'
                  }`}
                  type="submit" 
                  aria-label="提交" 
                  disabled={!hasContent || isLoading}
                >
                  {isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`stroke-[2] ${hasContent ? 'text-black' : 'text-white'}`}>
                      <path d="M5 11L12 4M12 4L19 11M12 4V21" stroke="currentColor"></path>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default InputBox; 