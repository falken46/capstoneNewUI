import React, { CSSProperties } from 'react';

export interface ButtonData {
  id: number | string;
  text: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

interface ScrollingButtonsProps {
  buttonsData: ButtonData[];
  scrollSpeed?: number; // 以秒为单位的滚动周期
  className?: string;
  disabled?: boolean; // 添加禁用属性
}

/**
 * 无限滚动按钮组件
 * 实现向左缓慢滚动的按钮组，当鼠标悬停时暂停
 */
const ScrollingButtons: React.FC<ScrollingButtonsProps> = ({ 
  buttonsData, 
  scrollSpeed = 30, 
  className = "",
  disabled = false
}) => {
  // 定义内联样式
  const scrollContainerStyles: CSSProperties = {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
    // 添加左右虚化效果的蒙版
    maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent 100%)',
    WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent 100%)',
    // 控制显示长度
    maxWidth: '80%',
    margin: '0 auto'
  };
  
  const scrollContentStyles: CSSProperties = {
    display: 'flex',
    flexWrap: 'nowrap',
    gap: '8px',
    padding: '8px 0',
    width: 'max-content',
    animation: `scrollLeftInfinite ${scrollSpeed}s linear infinite`,
    opacity: disabled ? 0.5 : 1,
    pointerEvents: disabled ? 'none' : 'auto'
  };

  const handleButtonClick = (button: ButtonData) => {
    if (!disabled && button.onClick) {
      button.onClick();
    }
  };

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      {/* 添加关键帧动画到头部 */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes scrollLeftInfinite {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
          .scroll-content:hover {
            animation-play-state: paused;
          }
        `
      }} />
      
      {/* 滚动动画轨道 */}
      <div style={scrollContainerStyles}>
        <div className="scroll-content" style={scrollContentStyles}>
          {/* 第一组按钮 */}
          {buttonsData.map((button) => (
            <div 
              key={`btn-${button.id}`} 
              role="button" 
              className={`flex items-center text-[#e0e0e0] text-sm font-medium rounded-2xl px-3 py-2 border border-[#494A4C] ${
                disabled ? 'cursor-not-allowed' : 'hover:border-[#6e6e6e] hover:bg-[#5a5a5a] hover:text-white cursor-pointer'
              } transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring`}
              tabIndex={disabled ? -1 : 0}
              onClick={() => handleButtonClick(button)}
              aria-disabled={disabled}
            >
              {button.icon}
              <p className="overflow-hidden whitespace-nowrap text-ellipsis">{button.text}</p>
            </div>
          ))}
          
          {/* 复制的按钮组以实现无缝滚动 */}
          {buttonsData.map((button) => (
            <div 
              key={`btn-clone-${button.id}`} 
              role="button" 
              className={`flex items-center text-[#e0e0e0] text-sm font-medium rounded-2xl px-3 py-2 border border-[#494A4C] ${
                disabled ? 'cursor-not-allowed' : 'hover:border-[#6e6e6e] hover:bg-[#5a5a5a] hover:text-white cursor-pointer'
              } transition-all focus:outline-none focus-visible:ring-1 focus-visible:ring-ring`}
              tabIndex={disabled ? -1 : 0}
              onClick={() => handleButtonClick(button)}
              aria-disabled={disabled}
            >
              {button.icon}
              <p className="overflow-hidden whitespace-nowrap text-ellipsis">{button.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScrollingButtons; 