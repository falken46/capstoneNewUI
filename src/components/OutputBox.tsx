import React, { useRef, useEffect, useState } from 'react';

interface OutputBoxProps {
  output: string;
  error: string | null;
  isVisible: boolean;
  onClose: () => void;
}

/**
 * 代码输出框组件
 * 显示Python代码执行的结果和错误信息
 */
const OutputBox: React.FC<OutputBoxProps> = ({ output, error, isVisible, onClose }) => {
  const outputRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [contentHeight, setContentHeight] = useState<number | null>(null);

  // 计算内容的实际高度
  useEffect(() => {
    if (isVisible && outputRef.current) {
      const scrollHeight = outputRef.current.scrollHeight;
      setContentHeight(scrollHeight);
    }
  }, [isVisible, output, error]);

  // 当没有内容时不显示
  if (!isVisible) {
    return null;
  }

  // 输出内容
  const content = error ? (
    <div className="text-red-400 font-mono whitespace-pre-wrap text-sm">{error}</div>
  ) : output ? (
    <div className="text-gray-300 font-mono whitespace-pre-wrap text-sm">{output}</div>
  ) : (
    <div className="text-gray-400 text-sm">代码执行完成，无输出</div>
  );

  // 根据内容长度决定是否需要滚动或展开
  const needsExpand = contentHeight !== null && contentHeight > 200;
  const maxHeight = expanded ? '500px' : needsExpand ? '200px' : 'auto';
  const outputStyle = { 
    maxHeight,
    transition: 'max-height 0.3s ease-in-out'
  };

  return (
    <div className="mt-2 rounded-lg border border-gray-700 overflow-hidden transition-all duration-300 ease-in-out animate-slideIn">
      <div className="flex justify-between items-center bg-[#1e1e1e] px-4 py-2 border-b border-gray-700">
        <div className="text-sm font-medium text-gray-300">执行结果</div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="关闭输出"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <div 
        ref={outputRef}
        className="bg-[#1e1e1e] p-4 overflow-auto output-content"
        style={outputStyle}
      >
        {content}
      </div>
      
      {needsExpand && (
        <div className="bg-[#1e1e1e] px-4 py-2 text-xs text-center border-t border-gray-700">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-white transition-colors inline-flex items-center"
          >
            {expanded ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                收起
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                展开全部
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default OutputBox; 