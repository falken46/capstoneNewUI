import React, { useState, useRef, useEffect } from 'react';
import Header, { ModelOption } from './Header';
import CompactDialogLayout from './CompactDialogLayout';
import Sidebar from './Sidebar';
import FadeContent from './FadeContent';
import AnimatedContent from './AnimatedContent';
import { Message, sendChatMessage } from '../services/chatService';
import { MessageStatus } from './BotMessage';
import DeepDebugPanel from './DeepDebugPanel';
import { DeepDebugProvider, useDeepDebug } from '../contexts/DeepDebugContext';
import { sendDebugWorkflow } from '../services/debugService';

// 内部ChatInterface实现组件
const ChatInterfaceImpl: React.FC = () => {
  const [inputMessage, setInputMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [botResponseStatus, setBotResponseStatus] = useState<MessageStatus>('complete');
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
  // 添加当前选择的模型状态
  const [selectedModel, setSelectedModel] = useState<ModelOption>({
    name: 'qwen2.5-coder',
    type: 'ollama',
    displayName: 'Qwen 2.5 Coder'
  });
  
  // 从Context中获取DeepDebug相关状态
  const { 
    isDeepDebugEnabled, 
    updateWorkflowStep, 
    updateWorkflowStatus,
    resetWorkflow,
    processEvent
  } = useDeepDebug();

  // 检查机器人是否正在回复
  const isLoading = botResponseStatus === 'loading' || botResponseStatus === 'streaming';

  // 处理模型变更
  const handleModelChange = (model: ModelOption) => {
    setSelectedModel(model);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && !isLoading) {
      sendMessage(inputMessage);
      setInputMessage('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
  };

  // 从紧凑布局的输入框提交
  const handleCompactSubmit = (inputValue: string) => {
    if (inputValue.trim() && !isLoading) {
      sendMessage(inputValue);
      // 提交后切换到展开布局
      setLayoutMode('expanded');
    }
  };
  
  // 发送消息并获取机器人回复
  const sendMessage = async (messageText: string) => {
    // 创建并添加用户消息
    const userMessage: Message = {
      role: 'user',
      content: messageText,
      type: 'text'
    };
    
    // 更新聊天历史，添加用户消息
    let updatedHistory = [...chatHistory, userMessage];
    setChatHistory(updatedHistory);
    
    // 如果启用了DeepDebug，添加DeepDebug消息到聊天历史
    if (isDeepDebugEnabled) {
      console.log('DeepDebug已启用，添加DeepDebug消息，准备开始工作流', { isDeepDebugEnabled });
      
      const deepDebugMessage: Message = {
        role: 'system',
        content: 'DeepDebug分析中...',
        type: 'deepdebug'
      };
      
      // 向聊天历史添加DeepDebug消息
      updatedHistory = [...updatedHistory, deepDebugMessage];
      setChatHistory(updatedHistory);
      
      // 重置工作流状态
      resetWorkflow();
      
      // 启动DeepDebug工作流
      console.log('开始发送DeepDebug工作流请求');
      try {
        await sendDebugWorkflow(
          messageText,
          selectedModel.type,
          selectedModel.name,
          (step) => {
            // 当收到步骤更新时
            console.log('收到步骤更新:', step);
            updateWorkflowStep(step);
          },
          (status) => {
            // 当收到状态更新时
            console.log('收到状态更新:', status);
            updateWorkflowStatus(status);
          },
          (error) => {
            console.error("DeepDebug工作流错误:", error);
            // 出错时更新工作流状态
            updateWorkflowStatus({
              status: 'error',
              progress: 100,
              error: String(error)
            });
          },
          () => {
            // 完成时更新工作流状态
            console.log('DeepDebug工作流完成');
            updateWorkflowStatus({
              status: 'completed',
              progress: 100
            });
          },
          (event, content) => {
            // 处理任何事件
            console.log(`处理原始事件: ${event}`);
            processEvent(event, content);
          }
        );
        console.log('DeepDebug工作流请求已发送');
      } catch (err) {
        console.error('发送DeepDebug工作流请求失败:', err);
      }
    } else {
      console.log('DeepDebug未启用，跳过DeepDebug流程', { isDeepDebugEnabled });
      
      // 只有在非DeepDebug模式下才执行普通聊天逻辑
      // 添加机器人消息（初始为加载状态）
      const botMessage: Message = {
        role: 'assistant',
        content: '',
        type: 'text'
      };
      
      setChatHistory([...updatedHistory, botMessage]);
      setBotResponseStatus('loading');
      
      try {
        // 向后端API发送请求，并传递选定的模型信息
        await sendChatMessage(
          // 只发送文本类型的消息给API，过滤掉DeepDebug类型
          updatedHistory.filter(msg => msg.type !== 'deepdebug') as Message[],
          selectedModel.type, // 传递模型类型
          selectedModel.name, // 传递模型名称
          (content) => {
            // 当收到流式响应时更新机器人消息内容
            setBotResponseStatus('streaming');
            
            // 更新机器人消息内容
            setChatHistory(prev => {
              const newHistory = [...prev];
              // 更新最后一条机器人消息
              if (newHistory.length > 0 && newHistory[newHistory.length - 1].role === 'assistant') {
                newHistory[newHistory.length - 1].content = content;
              }
              return newHistory;
            });
          },
          (error) => {
            console.error("聊天API错误:", error);
            // 出错时更新最后一条消息
            setChatHistory(prev => {
              const newHistory = [...prev];
              if (newHistory.length > 0 && newHistory[newHistory.length - 1].role === 'assistant') {
                newHistory[newHistory.length - 1].content = `出错了: ${error}`;
              }
              return newHistory;
            });
            setBotResponseStatus('complete');
          },
          () => {
            // 完成时更新状态
            setBotResponseStatus('complete');
          }
        );
      } catch (error) {
        console.error("发送消息出错:", error);
        setBotResponseStatus('complete');
      }
    }
  };
  
  // 处理新建按钮点击，切换回紧凑布局
  const handleNewChat = () => {
    // 切换回紧凑布局
    setLayoutMode('compact');
    // 清空消息和聊天历史
    setInputMessage('');
    setChatHistory([]);
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
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
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
            <CompactDialogLayout 
              onSubmit={handleCompactSubmit} 
              isLoading={isLoading}
            />
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
              botResponseStatus={botResponseStatus} 
              inputValue={inputMessage} 
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

const ChatInterface: React.FC = () => {
  return (
    <DeepDebugProvider>
      <ChatInterfaceImpl />
    </DeepDebugProvider>
  );
};

export default ChatInterface; 