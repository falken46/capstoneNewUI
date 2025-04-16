import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import Header, { ModelOption } from './Header';
import CompactDialogLayout from './CompactDialogLayout';
import ExpandedDialogLayout from './ExpandedDialogLayout';
import Sidebar from './Sidebar';
import FadeContent from './FadeContent';
import AnimatedContent from './AnimatedContent';
import { Message, sendChatMessage, saveChatHistory, getChatDetail } from '../services/chatService';
import { MessageStatus } from './BotMessage';
import DeepDebugPanel from './DeepDebugPanel';

/**
 * 聊天界面组件
 * 背景颜色：#212121
 * 包含居中显示的文本和输入文本框
 */
const ChatInterface: React.FC = () => {
  const { chatId } = useParams<{ chatId?: string }>();
  const navigate = useNavigate();
  
  const [inputMessage, setInputMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [botResponseStatus, setBotResponseStatus] = useState<MessageStatus>('complete');
  // 添加一个状态来跟踪当前布局模式
  const [layoutMode, setLayoutMode] = useState<'compact' | 'expanded'>('compact');
  // 添加对InputBox容器元素的引用
  const inputBoxRef = useRef<HTMLDivElement>(null);
  // 添加侧边栏状态
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    localStorage.getItem('sidebarOpen') === 'true' ? true : false
  );
  // 添加动画状态
  const [showPage, setShowPage] = useState(false);
  // 添加淡入动画状态
  const [isFadingIn, setIsFadingIn] = useState(true);
  // 添加淡出动画状态
  const [isFadingOut, setIsFadingOut] = useState(false);
  // Add state for dynamic animation duration
  const [animationDuration, setAnimationDuration] = useState(800);
  // 添加当前选择的模型状态
  const [selectedModel, setSelectedModel] = useState<ModelOption>({
    name: 'qwen2.5-coder',
    type: 'ollama',
    displayName: 'Qwen 2.5 Coder'
  });
  // 添加DeepDebug状态
  const [deepDebugActive, setDeepDebugActive] = useState(false);
  // 添加最后一条发送的用户消息
  const [lastUserMessage, setLastUserMessage] = useState('');
  // 添加当前活跃的DeepDebug会话ID
  const [activeDeepDebugId, setActiveDeepDebugId] = useState<string>('');
  // 添加DeepDebug处理状态
  const [isDeepDebugging, setIsDeepDebugging] = useState(false);
  // 添加当前会话ID状态，如果来自URL则使用URL的ID，否则生成新的UUID
  const [currentChatId, setCurrentChatId] = useState<string>(chatId || uuidv4());
  // 添加加载状态
  const [isLoading, setIsLoading] = useState(false);
  // 添加聊天列表刷新标志
  const [shouldRefreshChatList, setShouldRefreshChatList] = useState(0);

  // 刷新聊天列表的方法
  const triggerChatListRefresh = () => {
    setShouldRefreshChatList(prev => prev + 1);
  };

  // 检查机器人是否正在回复或者DeepDebug是否在处理中
  const isLoadingResponse = botResponseStatus === 'loading' || botResponseStatus === 'streaming' || isDeepDebugging;

  // 处理模型变更
  const handleModelChange = (model: ModelOption) => {
    setSelectedModel(model);
  };

  // 处理DeepDebug状态变更
  const handleDeepDebugActiveChange = (isActive: boolean) => {
    setDeepDebugActive(isActive);
  };

  // 从URL加载聊天记录
  useEffect(() => {
    if (chatId) {
      setCurrentChatId(chatId);
      loadChatDetail(chatId);
    } else if (!currentChatId) {
      // 如果没有从URL获取chatId，且当前也没有chatId，则生成一个新的
      setCurrentChatId(uuidv4());
    }
  }, [chatId]);

  // 加载特定聊天记录的详情
  const loadChatDetail = async (id: string) => {
    setIsLoading(true);
    try {
      const chatDetail = await getChatDetail(id);
      setChatHistory(chatDetail.messages || []);
      setLayoutMode('expanded');
    } catch (error) {
      console.error('获取聊天记录详情失败:', error);
      setChatHistory([]);
      // 如果加载失败，可以选择重定向到新聊天页面
      navigate('/chat');
    } finally {
      setIsLoading(false);
    }
  };

  // 选择聊天记录
  const handleSelectChat = (id: string) => {
    // 导航到特定聊天记录的URL
    navigate(`/chat/${id}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputMessage.trim() && !isLoadingResponse) {
      sendMessage(inputMessage);
      setInputMessage('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
  };

  // 从紧凑布局的输入框提交
  const handleCompactSubmit = (inputValue: string) => {
    if (inputValue.trim() && !isLoadingResponse) {
      sendMessage(inputValue);
      // 提交后切换到展开布局
      setLayoutMode('expanded');
    }
  };
  
  // 更新DeepDebug结果的函数
  const updateDeepDebugResults = useCallback((sessionId: string, results: any) => {
    console.log("更新DeepDebug结果:", sessionId, "步骤数:", results.steps?.length);
    
    setChatHistory(prev => {
      const newHistory = [...prev];
      // 找到匹配的DeepDebug消息
      const index = newHistory.findIndex(
        msg => msg.isDeepDebug && msg.content.includes(sessionId)
      );
      
      if (index !== -1) {
        console.log("找到匹配的DeepDebug消息:", index);
        // 更新消息，添加结果
        newHistory[index] = {
          ...newHistory[index],
          deepDebugResults: results
        };
        
        // 保存更新后的聊天记录
        try {
          saveChatHistory(newHistory, currentChatId).then(response => {
            // 如果以前没有URL路径，则更新URL（但不需要更新currentChatId，因为已经有了）
            if (!chatId) {
              navigate(`/chat/${currentChatId}`, { replace: true });
            }
            console.log("保存聊天记录成功:", response);
            // 刷新聊天列表
            triggerChatListRefresh();
          });
        } catch (error) {
          console.error("保存聊天记录失败:", error);
        }
      } else {
        console.warn("未找到匹配的DeepDebug消息，sessionId:", sessionId);
      }
      
      return newHistory;
    });
  }, [currentChatId, navigate, chatId]);

  // 监听工作流状态的变化
  useEffect(() => {
    // 监听来自DeepDebugPanel的工作流完成事件
    const handleWorkflowComplete = (event: CustomEvent) => {
      console.log("收到工作流完成事件:", event.detail);
      
      if (event.detail?.sessionId === activeDeepDebugId) {
        // DeepDebug工作流完成，重置处理状态
        setIsDeepDebugging(false);
        
        // 直接使用事件中的结果数据
        if (event.detail?.results) {
          console.log("工作流结果包含步骤数:", event.detail.results.steps?.length);
          updateDeepDebugResults(activeDeepDebugId, event.detail.results);
        } else {
          console.warn("工作流结果中没有steps数据");
        }
      } else {
        console.log("会话ID不匹配，忽略事件", event.detail?.sessionId, activeDeepDebugId);
      }
    };

    // 注册事件监听器
    window.addEventListener('deepdebug-workflow-complete', handleWorkflowComplete as EventListener);
    
    // 组件卸载时移除事件监听器
    return () => {
      window.removeEventListener('deepdebug-workflow-complete', handleWorkflowComplete as EventListener);
    };
  }, [activeDeepDebugId, updateDeepDebugResults]);

  // 发送消息并获取机器人回复
  const sendMessage = async (messageText: string) => {
    // 保存当前用户消息
    setLastUserMessage(messageText);
    
    // 创建并添加用户消息
    const userMessage: Message = {
      role: 'user',
      content: messageText
    };
    
    // 更新聊天历史
    const updatedHistory = [...chatHistory, userMessage];
    setChatHistory(updatedHistory);
    
    // 如果DeepDebug模式激活，添加DeepDebug回复而不是调用常规机器人回复
    if (deepDebugActive) {
      // 设置DeepDebug处理状态为true，禁用输入框
      setIsDeepDebugging(true);
      
      // 生成一个唯一的会话ID
      const sessionId = `deep-debug-${Date.now()}`;
      setActiveDeepDebugId(sessionId);
      
      // 添加一个特殊的DeepDebug消息
      const deepDebugMessage: Message = {
        role: 'assistant',
        content: `<DeepDebugPanel id="deepdebug-${sessionId}" sessionId="${sessionId}" query="${messageText}" />`,
        isDeepDebug: true
      };
      
      // 更新聊天历史
      const newHistory = [...updatedHistory, deepDebugMessage];
      setChatHistory(newHistory);
      
      // 保存聊天记录
      try {
        const response = await saveChatHistory(newHistory, currentChatId);
        // 如果以前没有URL路径，则更新URL（但不需要更新currentChatId，因为已经有了）
        if (!chatId) {
          navigate(`/chat/${currentChatId}`, { replace: true });
        }
        // 刷新聊天列表
        triggerChatListRefresh();
      } catch (error) {
        console.error("保存聊天记录失败:", error);
      }
      
      // 不再继续执行正常的机器人回复流程
      return;
    }
    
    // 以下是常规机器人回复的流程
    
    // 添加机器人消息（初始为加载状态）
    const botMessage: Message = {
      role: 'assistant',
      content: ''
    };
    
    setChatHistory([...updatedHistory, botMessage]);
    setBotResponseStatus('loading');
    
    try {
      // 向后端API发送请求，并传递选定的模型信息
      await sendChatMessage(
        [...updatedHistory],
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
          
          // 即使出错也保存聊天记录
          try {
            setChatHistory(prev => {
              saveChatHistory(prev, currentChatId).then(response => {
                // 如果以前没有URL路径，则更新URL（但不需要更新currentChatId，因为已经有了）
                if (!chatId) {
                  navigate(`/chat/${currentChatId}`, { replace: true });
                }
                // 刷新聊天列表
                triggerChatListRefresh();
              });
              return prev;
            });
          } catch (saveError) {
            console.error("保存聊天记录失败:", saveError);
          }
        },
        () => {
          // 完成时更新状态
          setBotResponseStatus('complete');
          
          // 机器人回复完成后保存聊天记录
          setChatHistory(prev => {
            // 保存聊天记录
            try {
              saveChatHistory(prev, currentChatId).then(response => {
                // 如果以前没有URL路径，则更新URL（但不需要更新currentChatId，因为已经有了）
                if (!chatId) {
                  navigate(`/chat/${currentChatId}`, { replace: true });
                }
                console.log("保存聊天记录成功:", response);
                // 刷新聊天列表
                triggerChatListRefresh();
              });
            } catch (error) {
              console.error("保存聊天记录失败:", error);
            }
            return prev;
          });
        }
      );
    } catch (error) {
      console.error("发送消息出错:", error);
      setBotResponseStatus('complete');
    }
  };
  
  // 处理新建按钮点击，切换回紧凑布局
  const handleNewChat = () => {
    // 切换回紧凑布局
    setLayoutMode('compact');
    // 清空消息和聊天历史
    setInputMessage('');
    setChatHistory([]);
    // 重置DeepDebug处理状态
    setIsDeepDebugging(false);
    // 生成新的UUID作为聊天ID
    setCurrentChatId(uuidv4());
    // 导航到新聊天URL
    navigate('/chat');
  };

  // 处理侧边栏按钮点击
  const handleSidebarToggle = () => {
    const newState = !isSidebarOpen;
    setIsSidebarOpen(newState);
    localStorage.setItem('sidebarOpen', newState.toString());
  };

  // 确保布局模式与聊天历史状态保持同步
  useEffect(() => {
    if (chatHistory.length > 0 && layoutMode === 'compact') {
      setLayoutMode('expanded');
    } else if (chatHistory.length === 0 && layoutMode === 'expanded' && !chatId) {
      setLayoutMode('compact');
    }
  }, [chatHistory, layoutMode, chatId]);

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

  // 页面加载时显示动画
  useEffect(() => {
    // 短暂延迟以确保组件已挂载
    const timer = setTimeout(() => {
      setShowPage(true);
      // 淡入完成后设置状态
      setTimeout(() => {
        setIsFadingIn(false);
      }, 50);
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
      className="h-screen w-full flex bg-[#212121]"
    >
      {/* 添加侧边栏组件 */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onSidebarToggle={handleSidebarToggle}
        onNewChat={handleNewChat}
        currentChatId={currentChatId}
        onSelectChat={handleSelectChat}
        shouldRefreshChatList={shouldRefreshChatList}
        triggerChatListRefresh={triggerChatListRefresh}
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
        
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-white">加载中...</div>
          </div>
        ) : (
          /* 聊天内容区域 - 为不同模式分别应用动画 */
          <div className="flex-1 overflow-y-auto relative min-h-0"> 
            {/* 包裹 Compact Layout */}
            <AnimatedContent 
              show={showPage && layoutMode === 'compact'}
              direction="down" 
              distance={100} 
              duration={animationDuration} // Use state for duration
              className="h-full w-full" 
            >
              <CompactDialogLayout 
                onSubmit={handleCompactSubmit} 
                isLoading={isLoadingResponse}
                deepDebugActive={deepDebugActive}
                onDeepDebugActiveChange={handleDeepDebugActiveChange}
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
                onSubmit={handleSubmit}
                onInputChange={handleInputChange}
                inputValue={inputMessage}
                isLoading={isLoadingResponse}
                deepDebugActive={deepDebugActive}
                onDeepDebugActiveChange={handleDeepDebugActiveChange}
                botResponseStatus={botResponseStatus}
                activeDeepDebugId={activeDeepDebugId}
                modelType={selectedModel.type}
                modelName={selectedModel.name}
              />
            </AnimatedContent>
          </div>
        )}
      </div>
      
      {/* 全局遮罩层 - 包含淡入和淡出效果 */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-1000 pointer-events-none z-100 ${
          isFadingOut ? 'opacity-100' : isFadingIn ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};

export default ChatInterface; 