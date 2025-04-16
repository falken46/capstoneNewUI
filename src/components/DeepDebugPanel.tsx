import React, { useRef, useState, useEffect } from 'react';
import { Message, sendDebugWorkflow } from '../services/chatService';
import BotMessage from './BotMessage';

// 工作流步骤接口
interface WorkflowStep {
  id: string;
  title: string;
  content: string;
  status: 'in_progress' | 'completed' | 'error';
}

// 工作流状态接口
interface WorkflowStatus {
  status: 'idle' | 'running' | 'completed' | 'error';
  error?: string;
}

// DeepDebugPanel props接口
interface DeepDebugPanelProps {
  className?: string;
  id?: string;
  sessionId?: string;
  query?: string;
  modelType?: string;
  modelName?: string;
  savedResults?: {
    steps: Array<{
      id: string;
      title: string;
      content: string;
      status: 'in_progress' | 'completed' | 'error';
    }>;
    fullCodeStep?: {
      id: string;
      title: string;
      content: string;
      status: 'in_progress' | 'completed' | 'error';
    } | null;
    elapsedTime: string;
    status: 'idle' | 'running' | 'completed' | 'error';
    error?: string;
    query: string;
  };
}

// 高亮样式
const highlightStyles = `
  .highlight-step\:bg-surface-hover {
    transition: background-color 0.3s ease;
  }
  .highlight-step\:bg-surface-hover:target {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;


const DeepDebugPanel: React.FC<DeepDebugPanelProps> = ({ 
  className = '',
  id,
  sessionId,
  query,
  modelType,
  modelName,
  savedResults
}) => {
  // 状态管理
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>(
    savedResults ? { status: savedResults.status, error: savedResults.error } : { status: 'idle' }
  );
  const [elapsedTimeString, setElapsedTimeString] = useState<string>(savedResults?.elapsedTime || '00:00');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [filteredWorkflowSteps, setFilteredWorkflowSteps] = useState<WorkflowStep[]>(
    savedResults?.steps || []
  );
  const [fullCodeStep, setFullCodeStep] = useState<WorkflowStep | null>(
    savedResults?.fullCodeStep || null
  );
  const [statusLabel, setStatusLabel] = useState<string>(
    savedResults?.status === 'completed' ? 'DeepDebug' : 
    savedResults?.status === 'error' ? 'Error' : 'Debugging'
  );
  
  // refs
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isScrollingRef = useRef<boolean>(false);
  const resultsLoadedRef = useRef<boolean>(!!savedResults);
  
  // 记录初始化日志
  useEffect(() => {
    if (savedResults) {
      console.log("DeepDebugPanel初始化从保存的结果:", 
        id, 
        "步骤数:", savedResults.steps?.length,
        "状态:", savedResults.status
      );
    } else {
      console.log("DeepDebugPanel初始化为新面板:", id);
    }
  }, [id, savedResults]);

  // 设置标题，如果提供了query，则显示其信息
  useEffect(() => {
    if (workflowStatus.status === 'completed') {
      setStatusLabel('DeepDebug');
    } else if (workflowStatus.status === 'error') {
      setStatusLabel('Error');
    } else {
      setStatusLabel('Debugging');
    }
  }, [workflowStatus.status]);

  // 定时器，用于计算经过的时间
  useEffect(() => {
    // 如果有保存的结果，不需要启动计时器
    if (resultsLoadedRef.current) return;
    
    // 只有在运行状态下才更新计时器
    if (workflowStatus.status === 'running' && startTime) {
      timerRef.current = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
        const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
        setElapsedTimeString(`${minutes}:${seconds}`);
      }, 1000);
      
      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [workflowStatus.status, startTime]);
  
  // 启动调试工作流
  useEffect(() => {
    // 如果有保存的结果，不需要启动工作流
    if (resultsLoadedRef.current) return;
    
    if (query && workflowStatus.status === 'idle') {
      startDebugWorkflow(query);
    }
  }, [query, workflowStatus.status]);

  // 添加自动滚动到底部的逻辑
  useEffect(() => {
    // 如果已经在滚动中，则不执行新的滚动
    if (isScrollingRef.current || !contentContainerRef.current || filteredWorkflowSteps.length === 0) return;
    
    // 设置滚动锁
    isScrollingRef.current = true;
    
    // 执行滚动
    contentContainerRef.current.scrollTo({
      top: contentContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
    
    // 滚动完成后释放锁
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 500); // 给滚动动画足够的时间完成
  }, [filteredWorkflowSteps]);

  // 更新或添加步骤的工具函数
  const updateOrAddStep = (stepId: string, content: string = '', status: WorkflowStep['status'] = 'in_progress') => {
    
    // 特殊处理full_code步骤
    if (stepId === 'Full Code') {
      setFullCodeStep(prev => {
        if (!prev) {
          return {
            id: stepId,
            title: stepId,
            content: content,
            status: status
          };
        }
        return { ...prev, content, status };
      });
      return;
    }
    
    // 处理普通步骤
    setFilteredWorkflowSteps(prev => {
      // 检查步骤是否已存在
      const existingStepIndex = prev.findIndex(step => step.id === stepId);
      
      if (existingStepIndex >= 0) {
        // 更新现有步骤
        return prev.map((step, index) => 
          index === existingStepIndex ? { ...step, content, status } : step
        );
      } else {
        // 添加新步骤
        return [...prev, {
          id: stepId,
          title: stepId,
          content,
          status
        }];
      }
    });
  };

  // 启动调试工作流函数
  const startDebugWorkflow = (content: string) => {
    // 重置状态
    setWorkflowStatus({ status: 'running' });
    setFilteredWorkflowSteps([]);
    setFullCodeStep(null);
    setStartTime(Date.now());
    
    // 调用后端API
    sendDebugWorkflow(
      content,
      modelType,
      modelName,
      // 步骤开始回调
      (event) => {
        console.log("步骤开始事件:", event);
        // 提取基础步骤ID并添加新步骤
        updateOrAddStep(event, '', 'in_progress');
      },
      // 步骤进度回调
      (event, content) => {
        console.log("步骤进度事件:", event, "内容长度:", content?.length);
        // 提取基础步骤ID并更新步骤内容
        updateOrAddStep(event, content, 'in_progress');
      },
      // 步骤完成回调
      (event, content) => {
        console.log("步骤完成事件:", event, "内容长度:", content?.length);
        // 提取基础步骤ID并更新步骤为完成状态
        updateOrAddStep(event, content, 'completed');
      },
      // 步骤错误回调
      (event, error) => {
        console.log("步骤错误事件:", event, "错误:", error);
        // 提取基础步骤ID并更新步骤为错误状态
        updateOrAddStep(event, error, 'error');
      },
      // 完成回调
      () => {
        setWorkflowStatus({ status: 'completed' });
        
        // 清除定时器
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // 使用setTimeout确保状态已更新后再发送事件
        setTimeout(() => {
          // 通过最新的状态引用获取当前值
          setFilteredWorkflowSteps(currentSteps => {
            // 获取最新的全代码步骤
            setFullCodeStep(currentFullCodeStep => {
              // 在获取最新状态后立即发送事件
              const event = new CustomEvent('deepdebug-workflow-complete', {
                detail: { 
                  sessionId: sessionId,
                  status: 'completed',
                  results: {
                    steps: currentSteps, // 使用最新的步骤
                    fullCodeStep: currentFullCodeStep, // 使用最新的全代码步骤
                    elapsedTime: elapsedTimeString,
                    status: 'completed',
                    query: query || ''
                  }
                }
              });
              window.dispatchEvent(event);
              console.log("发送工作流完成事件:", {
                sessionId,
                steps: currentSteps.length,
                fullCodeStep: !!currentFullCodeStep,
                elapsedTime: elapsedTimeString
              });
              
              // 返回原始状态，不做修改
              return currentFullCodeStep;
            });
            
            // 返回原始状态，不做修改
            return currentSteps;
          });
        }, 100); // 给React足够的时间更新状态
      },
      // 错误回调
      (error) => {
        setWorkflowStatus({ 
          status: 'error',
          error: typeof error === 'string' ? error : '调试过程中发生错误'
        });
        
        // 清除定时器
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // 使用setTimeout确保状态已更新后再发送事件
        setTimeout(() => {
          // 通过最新的状态引用获取当前值
          setFilteredWorkflowSteps(currentSteps => {
            // 获取最新的全代码步骤
            setFullCodeStep(currentFullCodeStep => {
              // 在获取最新状态后立即发送事件
              const event = new CustomEvent('deepdebug-workflow-complete', {
                detail: { 
                  sessionId: sessionId,
                  status: 'error',
                  results: {
                    steps: currentSteps, // 使用最新的步骤
                    fullCodeStep: currentFullCodeStep, // 使用最新的全代码步骤
                    elapsedTime: elapsedTimeString,
                    status: 'error',
                    error: typeof error === 'string' ? error : '调试过程中发生错误',
                    query: query || ''
                  }
                }
              });
              window.dispatchEvent(event);
              console.log("发送工作流错误事件:", {
                sessionId,
                steps: currentSteps.length,
                fullCodeStep: !!currentFullCodeStep,
                error: typeof error === 'string' ? error : '调试过程中发生错误'
              });
              
              // 返回原始状态，不做修改
              return currentFullCodeStep;
            });
            
            // 返回原始状态，不做修改
            return currentSteps;
          });
        }, 100); // 给React足够的时间更新状态
      }
    );
  };
  
  // 处理步骤点击
  const handleStepClick = (stepId: string) => {
    // 滚动到相应内容
    const targetElement = document.getElementById(`step-${stepId}`);
    if (targetElement && contentContainerRef.current) {
      contentContainerRef.current.scrollTo({
        top: targetElement.offsetTop - 20,
        behavior: 'smooth'
      });
      
      // 添加高亮效果
      targetElement.classList.add('highlight-step:bg-surface-hover');
      
      // 移除高亮效果
      setTimeout(() => {
        targetElement.classList.remove('highlight-step:bg-surface-hover');
      }, 2000);
    }
  };
  
  // 处理滚动按钮点击
  const handleScrollButtonClick = () => {
    if (contentContainerRef.current) {
      if (contentContainerRef.current.scrollTop > 0) {
        // 如果已经滚动，则返回顶部
        contentContainerRef.current.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      } else {
        // 如果在顶部，则滚动到底部
        contentContainerRef.current.scrollTo({
          top: contentContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  };
  
  return (
    <>
      <div className={`relative border border-border-l1 bg-surface-base rounded-2xl overflow-clip transition-[height_1000ms,width_1000ms] mb-4 @md/mainview:-mx-4 h-[500px] ${className}`}>
        <div className="absolute text-secondary w-full h-full overflow-y-clip flex">
          {/* 左侧菜单栏 */}
          <div className="relative flex flex-col w-2/5 h-full overflow-hidden bg-[#1a1a1a] opacity-80">
            {/* 标题栏 */}
            <div className="pt-4 pb-2 relative overflow-visible">
              <div className="flex flex-col items-start gap-0 text-base space-x-1 transition-padding z-30 duration-200 focus:outline-none focus-within:outline-none transition-none">
                <div className="flex h-full gap-1 w-full items-center justify-start text-primary px-4">
                  <div className="flex items-center gap-1 overflow-hidden">
                    <span className="text-lg text-nowrap font-medium whitespace-nowrap">
                      {statusLabel}
                    </span>
                    {workflowStatus.status === 'running' && (
                      <div className="ml-2 flex-shrink-0 flex items-center space-x-1 h-5">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-dot-bounce-1"></div>
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-dot-bounce-2"></div>
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-dot-bounce-3"></div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex w-full items-center justify-center text-nowrap mt-3">
                  <span className="text-secondary font-medium">{elapsedTimeString}</span>
                </div>
              </div>
              <div className="absolute left-0 top-[100%] w-full h-5 bg-gradient-to-b z-40 from-surface-base"></div>
            </div>
            
            {/* 菜单项列表 */}
            <div className="w-full h-full overflow-y-auto overflow-x-hidden scrollbar-gutter-stable no-scrollbar">
              <div className="relative">
                <div className="relative z-20 flex flex-col px-4 w-full">
                  {/* 渲染步骤列表 */}
                  {filteredWorkflowSteps.length > 0 ? (
                    filteredWorkflowSteps.map((step, index) => (
                      <div 
                        key={step.id}
                        data-scrollid={`menuitem_${step.id}`} 
                        className="w-full pt-3 pb-3"
                        onClick={() => handleStepClick(step.id)}
                      >
                        <div className={`flex items-center gap-2 group/header cursor-pointer hover:opacity-100 hover:bg-[#3D3D3D] rounded-md p-1 transition-colors duration-200`}>
                          <div className="flex items-center bg-surface-base" style={{ opacity: 1, transform: 'none' }}>
                            {step.status === 'in_progress' ? (
                              <svg className="animate-spin text-primary size-[22px] flex-shrink-0" height="1.2em" width="1.2em" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : step.status === 'error' ? (
                              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" className="text-red-500 size-[22px] flex-shrink-0" height="1.2em" width="1.2em" xmlns="http://www.w3.org/2000/svg">
                                <path d="M11.953 2C6.465 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.493 2 11.953 2zM12 20c-4.411 0-8-3.589-8-8s3.567-8 7.953-8C16.391 4 20 7.589 20 12s-3.589 8-8 8z"></path>
                                <path d="M11 7h2v7h-2zm0 8h2v2h-2z"></path>
                              </svg>
                            ) : (
                              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 256 256" className="text-primary size-[22px] flex-shrink-0" height="1.2em" width="1.2em" xmlns="http://www.w3.org/2000/svg">
                                <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z"></path>
                              </svg>
                            )}
                          </div>
                          <div className="flex items-center text-white">
                            <div className="text-sm text-primary font-medium max-w-full leading-6">
                              {step.title}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="w-full pt-3 pb-3 opacity-60">
                      <div className="flex items-start gap-2">
                        <div className="flex items-center bg-surface-base">
                          <svg className="animate-spin text-primary size-[22px] flex-shrink-0" height="1.2em" width="1.2em" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                        <div className="flex items-center text-white">
                          <div className="text-sm text-primary font-medium max-w-full leading-6">
                            初始化中...
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* 右侧内容区 - 修改为显示所有步骤内容的连续对话框 */}
          <div className="gap-3 relative min-h-full w-full h-full">
            <div className="absolute w-full transition-colors overflow-hidden group/trace h-full">
              <div className="w-full h-full overflow-hidden relative flex flex-col items-start border-l border-border-l1 bg-surface-l1">
                <div 
                  ref={contentContainerRef}
                  className="w-full h-full overflow-y-auto overflow-x-hidden scrollbar-gutter-stable no-scrollbar"
                >
                  <div className="flex flex-col pb-5 pt-2">
                    {/* 如果有错误，显示错误信息 */}
                    {workflowStatus.status === 'error' && workflowStatus.error && (
                      <div className="flex flex-col gap-1 mt-1 px-6 pt-5">
                        <div className="text-md text-red-500 font-medium">
                          分析出错
                        </div>
                        <div className="text-sm text-red-400 mt-2 bg-red-900/20 p-3 rounded-md">
                          {workflowStatus.error}
                        </div>
                      </div>
                    )}
                    
                    {/* 渲染所有步骤内容 - 使用BotMessage组件显示所有步骤的内容 */}
                    {filteredWorkflowSteps.length > 0 ? (
                      filteredWorkflowSteps.map((step) => {
                        // 将步骤内容转换为消息格式
                        let content = step.content;
                        
                        // 如果内容包含HTML标签但不是Markdown代码块，尝试简单转换
                        if (content.includes('<') && content.includes('>') && !content.includes('```')) {
                          // 保留一些基本的Markdown风格，避免转换过程中丢失格式
                          content = content
                            // 保留代码块和语法高亮
                            .replace(/<pre><code(?: class="language-([^"]+)")?>([^<]+)<\/code><\/pre>/g, '```$1\n$2\n```')
                            // 列表项
                            .replace(/<li>([^<]+)<\/li>/g, '- $1\n')
                            // 段落
                            .replace(/<p>([^<]+)<\/p>/g, '$1\n\n')
                            // 标题
                            .replace(/<h(\d)>([^<]+)<\/h\1>/g, (_, level, text) => '#'.repeat(parseInt(level)) + ' ' + text + '\n\n')
                            // 粗体
                            .replace(/<strong>([^<]+)<\/strong>/g, '**$1**')
                            // 斜体
                            .replace(/<em>([^<]+)<\/em>/g, '*$1*')
                            // 代码
                            .replace(/<code>([^<]+)<\/code>/g, '`$1`')
                            // 链接
                            .replace(/<a href="([^"]+)">([^<]+)<\/a>/g, '[$2]($1)')
                            // 移除其他HTML标签但保留内容
                            .replace(/<[^>]+>/g, '');
                        }
                        
                        const message: Message = {
                          role: 'assistant',
                          content: content
                        };
                        
                        return (
                          <div 
                            key={step.id} 
                            id={`step-${step.id}`} 
                            data-scrollid={step.id}
                            data-step-id={step.id}
                            data-step-container={step.id}
                            className="pt-4 px-6 mb-2 transition-all duration-300 highlight-step:bg-surface-hover"
                          >
                            <div className="mb-2 text-base font-medium text-primary pb-1 flex items-center">
                              <span className="text-primary text-lg mr-2">
                                {step.title}
                              </span>
                              {step.status === 'in_progress' && (
                                <div className="ml-2 flex-shrink-0 flex items-center space-x-1 h-5">
                                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-dot-bounce-1"></div>
                                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-dot-bounce-2"></div>
                                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-dot-bounce-3"></div>
                                </div>
                              )}
                            </div>
                            <BotMessage 
                              message={message}
                              status={step.status === 'in_progress' ? 'streaming' : 'complete'}
                              className="bg-surface-l1 border-none p-0 m-0"
                              data-step-id={step.id}
                            />
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex flex-col gap-1 mt-1 px-6 pt-5">
                        <div className="text-md text-primary font-medium">
                          初始化中...
                        </div>
                        <div className="text-sm text-secondary mt-2">
                          DeepDebug 准备就绪...
                        </div>
                        <div className="flex items-center justify-center py-10">
                          {/* 空内容 */}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 添加自定义高亮效果的样式 */}
                <style>{highlightStyles}</style>
              </div>
            </div>
            
            {/* 顶部下拉按钮 */}
            <div className="absolute flex justify-center w-full h-0 pr-4 mx-auto -top-3">
              <div className="h-0 flex items-end justify-end w-full max-w-[51rem] px-2 z-40">
                <button 
                  onClick={handleScrollButtonClick}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium leading-[normal] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-default transition-colors duration-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:-mx-0.5 border border-border-l2 text-fg-secondary hover:text-fg-primary hover:bg-button-ghost-hover rounded-full bg-input backdrop-blur-sm size-8" 
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down -mb-0.5">
                    <path d="m6 9 6 6 6-6"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Full Code 展示 - 面板下方显示 */}
      {fullCodeStep && (
        <div className="mt-8">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center">
              <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" className="text-primary size-[22px] flex-shrink-0 mr-2" height="1.2em" width="1.2em" xmlns="http://www.w3.org/2000/svg">
                <path d="M8.293 6.293 2.586 12l5.707 5.707 1.414-1.414L5.414 12l4.293-4.293zm7.414 11.414L21.414 12l-5.707-5.707-1.414 1.414L18.586 12l-4.293 4.293z"></path>
              </svg>
              <span className="text-lg font-medium text-primary">完整代码</span>
            </div>
            <button 
              onClick={() => {
                alert('打开代码编辑器');
                // 在这里添加打开编辑器的逻辑
              }}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium leading-[normal] cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-default transition-colors duration-100 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:-mx-0.5 border border-gray-400 text-fg-secondary hover:text-fg-primary hover:bg-gray-400/50 rounded-md bg-surface-base px-3 py-1.5" 
              type="button"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-external-link mr-1">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              在编辑器中打开
            </button>
          </div>
          <BotMessage
            message={{
              role: 'assistant',
              content: fullCodeStep.content
            }}
            status={fullCodeStep.status === 'in_progress' ? 'streaming' : 'complete'}
            className="rounded-2xl p-0 mb-4"
          />
        </div>
      )}
    </>
  );
};

export default DeepDebugPanel; 