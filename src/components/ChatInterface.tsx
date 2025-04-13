import React, { useState, useRef, useEffect } from 'react';
import Header from './Header';
import CompactDialogLayout from './CompactDialogLayout';
import Sidebar from './Sidebar';
import FadeContent from './FadeContent';
import AnimatedContent from './AnimatedContent';
import BotMessage from './BotMessage';
import UserMessage from './UserMessage';
import ApiKeyDialog from './ApiKeyDialog';
import openaiService, { ChatMessage } from '../utils/openaiService';
import ExpandedDialogLayout from './ExpandedDialogLayout';

/**
 * 聊天界面组件
 * 背景颜色：#212121
 * 包含居中显示的文本和输入文本框
 */
const ChatInterface: React.FC = () => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<string[]>([]);
  const [apiChatHistory, setChatApiHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [displayMessages, setDisplayMessages] = useState<string[]>([]);
  // 添加一个状态来跟踪当前布局模式
  const [layoutMode, setLayoutMode] = useState<'compact' | 'expanded'>('compact');
  // 添加侧边栏状态
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // 添加动画状态
  const [showPage, setShowPage] = useState(false);
  // 添加背景颜色状态
  const [bgColor, setBgColor] = useState('#000000');
  // 添加淡出动画状态
  const [isFadingOut, setIsFadingOut] = useState(false);
  // 动画持续时间
  const [animationDuration, setAnimationDuration] = useState(800);
  // 添加模型选择状态
  const [selectedModel, setSelectedModel] = useState('GPT-4');
  // OpenAI API密钥对话框状态
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  // 添加加载状态
  const [isLoading, setIsLoading] = useState(false);

  // 处理API调用
  const callOpenAI = async (userMessage: string) => {
    // 只有当选择了OpenAI Test模型时才调用API
    if (selectedModel !== 'OpenAI Test') {
      return;
    }

    // 检查是否设置了API密钥
    if (!openaiService.getApiKey()) {
      setShowApiKeyDialog(true);
      return;
    }

    // 准备发送给API的消息
    const messages: ChatMessage[] = [
      { role: 'system', content: '你是一个有用的AI助手。' },
      ...apiChatHistory.map(msg => ({ role: msg.role, content: msg.content })),
      { role: 'user', content: userMessage }
    ];

    setIsLoading(true);

    try {
      // 调用OpenAI API
      const response = await openaiService.sendChatRequest(messages);
      
      if (response.error) {
        // 处理错误
        setChatApiHistory([
          ...apiChatHistory,
          { role: 'user', content: userMessage },
          { role: 'assistant', content: `错误: ${response.error}` }
        ]);
        
        setDisplayMessages([
          ...displayMessages, 
          userMessage,
          `错误: ${response.error}`
        ]);
      } else {
        // 处理成功响应
        setChatApiHistory([
          ...apiChatHistory,
          { role: 'user', content: userMessage },
          { role: 'assistant', content: response.message }
        ]);
        
        setDisplayMessages([
          ...displayMessages, 
          userMessage,
          response.message
        ]);
      }
    } catch (error) {
      console.error('API调用失败:', error);
      setChatApiHistory([
        ...apiChatHistory,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: '抱歉，发生了错误，请稍后再试。' }
      ]);
      
      setDisplayMessages([
        ...displayMessages, 
        userMessage,
        '抱歉，发生了错误，请稍后再试。'
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      if (selectedModel === 'OpenAI Test') {
        // 使用API
        setChatApiHistory([...apiChatHistory, { role: 'user', content: message }]);
        setDisplayMessages([...displayMessages, message]);
        
        // 调用OpenAI API
        callOpenAI(message);
      } else {
        // 原始模式：仅添加用户消息到聊天历史
        setChatHistory([...chatHistory, message]);
      }
      
      setMessage('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  // 从紧凑布局的输入框提交
  const handleCompactSubmit = (inputValue: string) => {
    if (inputValue.trim()) {
      if (selectedModel === 'OpenAI Test') {
        // 使用API
        setChatApiHistory([...apiChatHistory, { role: 'user', content: inputValue }]);
        setDisplayMessages([...displayMessages, inputValue]);
        
        // 调用OpenAI API
        callOpenAI(inputValue);
      } else {
        // 原始模式：仅添加用户消息到聊天历史
        setChatHistory([...chatHistory, inputValue]);
      }
      
      // 提交后切换到展开布局
      setLayoutMode('expanded');
    }
  };
  
  // 处理API密钥保存
  const handleSaveApiKey = (apiKey: string) => {
    openaiService.setApiKey(apiKey);
    // 如果有挂起的消息，立即处理
    if (apiChatHistory.length > 0 && selectedModel === 'OpenAI Test') {
      const lastUserMessage = apiChatHistory[apiChatHistory.length - 1];
      if (lastUserMessage.role === 'user') {
        callOpenAI(lastUserMessage.content);
      }
    }
  };
  
  // 处理新建按钮点击，切换回紧凑布局
  const handleNewChat = () => {
    // 切换回紧凑布局
    setLayoutMode('compact');
    // 清空消息和聊天历史
    setMessage('');
    setChatHistory([]);
    setChatApiHistory([]);
    setDisplayMessages([]);
  };

  // 处理侧边栏按钮点击
  const handleSidebarToggle = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // 处理模型选择
  const handleModelSelect = (model: string) => {
    setSelectedModel(model);
    if (model === 'OpenAI Test' && !openaiService.getApiKey()) {
      setShowApiKeyDialog(true);
    }
  };

  // 确保布局模式与聊天历史状态保持同步
  useEffect(() => {
    // 对于标准模式
    if (selectedModel !== 'OpenAI Test') {
      if (chatHistory.length > 0 && layoutMode === 'compact') {
        setLayoutMode('expanded');
      } else if (chatHistory.length === 0 && layoutMode === 'expanded') {
        setLayoutMode('compact');
      }
    } 
    // 对于API模式
    else {
      if (displayMessages.length > 0 && layoutMode === 'compact') {
        setLayoutMode('expanded');
      } else if (displayMessages.length === 0 && layoutMode === 'expanded') {
        setLayoutMode('compact');
      }
    }
  }, [chatHistory, apiChatHistory, displayMessages, layoutMode, selectedModel]);

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

  // 初始动画后更改持续时间
  useEffect(() => {
    let durationTimer: number | undefined;
    if (showPage) {
      // 在初始800ms动画完成后设置计时器来更改持续时间
      durationTimer = window.setTimeout(() => {
        setAnimationDuration(300);
      }, 850); // 略长于初始持续时间(800ms)
    }
    return () => clearTimeout(durationTimer);
  }, [showPage]);

  // 自定义ExpandedDialogLayout内容，用于OpenAI Test模式
  const customApiDialogContent = (
    <div className='flex flex-col h-full w-full'>
      <div className="flex-1 min-h-0 overflow-y-auto w-full">
        <div className="w-4/5 max-w-3xl mx-auto pt-4 pb-2"> 
          {displayMessages.map((msg, index) => {
            const isUser = index % 2 === 0;
            return isUser ? (
              <UserMessage key={index} message={msg} />
            ) : (
              <BotMessage key={index} message={msg} />
            );
          })}
          {isLoading && (
            <div className="flex mb-4 ml-8">
              <div className="message-bubble rounded-3xl prose dark:prose-invert break-words text-primary min-h-7 prose-p:opacity-95 prose-strong:opacity-100 bg-[#252525] border border-input-border max-w-[100%] sm:max-w-[90%] px-4 py-2.5 rounded-bl-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-100"></div>
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse delay-200"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="w-full bg-[#212121] flex-shrink-0">
        <div className="w-4/5 max-w-3xl mx-auto py-4">
          <form onSubmit={handleSubmit} className="w-full">
            <div className="relative w-full">
              <textarea
                value={message}
                onChange={handleInputChange}
                placeholder="继续输入您的问题..."
                className="w-full bg-[#303030] border border-gray-700 rounded-xl px-4 py-2 pl-4 pr-10 text-white resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !message.trim()}
                className={`absolute right-3 bottom-3 p-1 rounded-lg ${
                  isLoading || !message.trim() ? 'text-gray-600 cursor-not-allowed' : 'text-white hover:bg-[#424242]'
                }`}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div 
      style={{ 
        backgroundColor: bgColor,
        transition: 'background-color 1000ms ease-in-out' 
      }} 
      className="h-screen w-full flex"
    >
      {/* API密钥对话框 */}
      <ApiKeyDialog
        isOpen={showApiKeyDialog}
        onClose={() => setShowApiKeyDialog(false)}
        onSave={handleSaveApiKey}
        currentApiKey={openaiService.getApiKey()}
      />
      
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
            onModelSelect={handleModelSelect}
          />
        </FadeContent>
        
        {/* 聊天内容区域 - 为不同模式分别应用动画 */}
        <div className="flex-1 overflow-y-auto relative min-h-0"> 
          {/* 包裹 Compact Layout */}
          <AnimatedContent 
            show={showPage && layoutMode === 'compact'}
            direction="down" 
            distance={100} 
            duration={animationDuration}
            className="h-full w-full" 
          >
            <CompactDialogLayout onSubmit={handleCompactSubmit} />
          </AnimatedContent>

          {/* 根据模型类型选择不同的扩展布局 */}
          {selectedModel === 'OpenAI Test' ? (
            <AnimatedContent 
              show={layoutMode === 'expanded'} 
              direction="down"
              distance={100} 
              duration={animationDuration}
              delay={100}
              className="h-full w-full" 
            >
              {customApiDialogContent}
            </AnimatedContent>
          ) : (
            <AnimatedContent 
              show={layoutMode === 'expanded'} 
              direction="down"
              distance={100} 
              duration={animationDuration}
              delay={100}
              className="h-full w-full" 
            >
              <ExpandedDialogLayout 
                messages={chatHistory}
                inputValue={message}
                onInputChange={handleInputChange}
                onSubmit={handleSubmit}
              />
            </AnimatedContent>
          )}
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