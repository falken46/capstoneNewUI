import React, { useState, useRef, useEffect } from 'react';
import Header from './Header';
import CompactDialogLayout from './CompactDialogLayout';
import ExpandedDialogLayout from './ExpandedDialogLayout';
import Sidebar from './Sidebar';
import FadeContent from './FadeContent';
import AnimatedContent from './AnimatedContent';

/**
 * 聊天界面组件
 * 背景颜色：#212121
 * 包含居中显示的文本和输入文本框
 */
const ChatInterface: React.FC = () => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  // 添加一个状态来跟踪当前布局模式
  const [layoutMode, setLayoutMode] = useState<'compact' | 'expanded'>('compact');
  // 添加对InputBox容器元素的引用
  const inputBoxRef = useRef<HTMLDivElement>(null);
  // 添加侧边栏状态
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // 添加动画状态
  const [showPage, setShowPage] = useState(false);
  // 添加背景颜色状态
  const [bgColor, setBgColor] = useState('#000000');
  // 添加淡出动画状态
  const [isFadingOut, setIsFadingOut] = useState(false);
  // Add state for dynamic animation duration
  const [animationDuration, setAnimationDuration] = useState(800);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      setChatHistory([...chatHistory, message]);
      setMessage('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  // 从紧凑布局的输入框提交
  const handleCompactSubmit = (inputValue: string) => {
    if (inputValue.trim()) {
      setChatHistory([...chatHistory, inputValue]);
      // 提交后切换到展开布局
      setLayoutMode('expanded');
    }
  };
  
  // 处理新建按钮点击，切换回紧凑布局
  const handleNewChat = () => {
    // 切换回紧凑布局
    setLayoutMode('compact');
    // 清空消息和聊天历史
    setMessage('');
    setChatHistory([]);
    // Reset duration to initial load speed if needed, though it might already be 400
    // setAnimationDuration(800); // Optional: reset duration on new chat?
  };

  // 处理侧边栏按钮点击
  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // 确保布局模式与聊天历史状态保持同步
  useEffect(() => {
    if (chatHistory.length > 0 && layoutMode === 'compact') {
      setLayoutMode('expanded');
    } else if (chatHistory.length === 0 && layoutMode === 'expanded') {
      setLayoutMode('compact');
       // Reset duration when going back to compact automatically
       // setAnimationDuration(800); // Optional: reset duration?
    }
  }, [chatHistory, layoutMode]);

  // 处理logo点击，先淡出再跳转
  const handleLogoClick = () => {
    // 开始淡出动画
    setIsFadingOut(true);
    
    // 等待动画完成后再跳转
    setTimeout(() => {
      // 在这里执行跳转操作，例如跳转到首页或其他目标页面
      window.location.href = '/'; // 或者使用React Router的导航
    }, 700); // 与淡出动画持续时间相同
  };

  // 页面加载时显示动画和背景色变化
  useEffect(() => {
    // 短暂延迟以确保组件已挂载
    const timer = setTimeout(() => {
      setShowPage(true);
      // 背景色变化延迟稍长，给用户更好的渐变体验
      setTimeout(() => {
        setBgColor('#212121');
      }, 100);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Effect to change duration after initial load animation
  useEffect(() => {
    let durationTimer: number | undefined;
    if (showPage) {
      // Set timer to change duration after the initial 800ms animation completes
      durationTimer = window.setTimeout(() => {
        setAnimationDuration(300);
      }, 850); // Slightly longer than initial duration (800ms)
    }
    return () => clearTimeout(durationTimer);
  }, [showPage]);

  return (
    <div 
      style={{ 
        backgroundColor: bgColor,
        transition: 'background-color 1000ms ease-in-out' 
      }} 
      className="h-screen w-full flex"
    >
      {/* 添加侧边栏组件 */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onSidebarToggle={handleSidebarToggle}
        onNewChat={handleNewChat}
      />
      
      {/* 主内容区域 */}
      <div className="flex flex-col flex-1 h-full overflow-hidden relative transition-all duration-300">
        {/* 将FadeContent移动到只包裹Header组件 */}
        <FadeContent show={showPage} duration={800}>
          <Header 
            onNewChat={handleNewChat} 
            onSidebarToggle={handleSidebarToggle} 
            isSidebarOpen={isSidebarOpen}
            onLogoClick={handleLogoClick}
          />
        </FadeContent>
        
        {/* 聊天内容区域 - 为不同模式分别应用动画 */}
        <div className="flex-1 overflow-y-auto relative min-h-0"> 
          {/* 包裹 Compact Layout */}
          <AnimatedContent 
            show={showPage && layoutMode === 'compact'}
            direction="down" 
            distance={100} 
            duration={animationDuration} // Use state for duration
            className="h-full w-full" 
          >
            <CompactDialogLayout onSubmit={handleCompactSubmit} />
          </AnimatedContent>

          {/* 包裹 Expanded Layout */}
          <AnimatedContent 
            show={layoutMode === 'expanded'} 
            direction="down" // Enter from top (fade in down)
            distance={100} 
            duration={animationDuration} // Use state for duration
            delay={100} // Delay based on transition duration (400ms)
            className="h-full w-full" 
          >
            <ExpandedDialogLayout 
              messages={chatHistory} 
              inputValue={message} 
              onInputChange={handleInputChange}
              onSubmit={handleSubmit}
            />
          </AnimatedContent>
        </div>
      </div>
      
      {/* 淡出遮罩层 */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-1000 pointer-events-none z-100 ${
          isFadingOut ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};

export default ChatInterface; 