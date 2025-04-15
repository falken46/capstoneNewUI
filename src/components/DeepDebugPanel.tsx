import React, { useEffect, useMemo, useRef } from 'react';
import { useDeepDebug } from '../contexts/DeepDebugContext';
import BotMessage from './BotMessage';
import { Message } from '../services/chatService';

interface DeepDebugPanelProps {
  className?: string;
}

/**
 * DeepDebug分析面板组件
 * 展示AI的思考和分析过程
 */
const DeepDebugPanel: React.FC<DeepDebugPanelProps> = ({ className = '' }) => {
  // 使用Context获取工作流数据
  const { 
    workflowSteps, 
    workflowStatus,
    isDeepDebugEnabled
  } = useDeepDebug();
  
  // 引用右侧内容区的滚动容器
  const contentContainerRef = useRef<HTMLDivElement>(null);
  
  // 滚动锁，防止滚动冲突
  const isScrollingRef = useRef<boolean>(false);
  
  // 本地计时器状态
  const [localElapsedTime, setLocalElapsedTime] = React.useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 本地计时器逻辑
  useEffect(() => {
    // 当工作流状态为运行中时，启动计时器
    if (workflowStatus.status === 'running') {
      // 初始化本地计时器
      setLocalElapsedTime(workflowStatus.elapsedTime || 0);
      
      // 每秒递增计时
      timerRef.current = setInterval(() => {
        setLocalElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      // 如果不是运行状态，清除计时器
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    // 组件卸载时清除计时器
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [workflowStatus.status, workflowStatus.elapsedTime]);
  
  // 重新计算为时间字符串，优先使用本地计时器时间
  const elapsedTimeString = useMemo(() => {
    // 使用本地计时器的值
    return `${localElapsedTime}s`;
  }, [localElapsedTime]);
  
  // 过滤掉标题为 "full code" 的步骤
  const filteredWorkflowSteps = useMemo(() => {
    return workflowSteps.filter(step => step.title?.toLowerCase() !== 'full code');
  }, [workflowSteps]);
  
  // 查找 full code 步骤
  const fullCodeStep = useMemo(() => {
    return workflowSteps.find(step => step.title?.toLowerCase() === 'full code');
  }, [workflowSteps]);
  
  // 状态变化时更新日志
  useEffect(() => {
    console.log('DeepDebugPanel状态更新:', { 
      isDeepDebugEnabled,
      workflowStepsCount: workflowSteps.length,
      workflowStatus: {
        status: workflowStatus.status,
        progress: workflowStatus.progress,
        elapsedTime: workflowStatus.elapsedTime,
        sourceCount: workflowStatus.sourceCount
      }
    });
  }, [isDeepDebugEnabled, workflowStatus]);
  
  // 当工作流步骤更新时记录日志
  useEffect(() => {
    if (filteredWorkflowSteps.length > 0) {
      console.log(`工作流步骤更新: 当前共${filteredWorkflowSteps.length}个步骤`);
      filteredWorkflowSteps.forEach((step, index) => {
        console.log(`步骤 ${index+1}: ${step.id} - ${step.title} (${step.status})`);
      });
    }
  }, [filteredWorkflowSteps]);
  
  // 当步骤更新时，滚动到底部
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
  
  // 添加自定义高亮效果的样式
  const highlightStyles = `
    @keyframes highlight {
      0% { background-color: rgba(255, 255, 255, 0.05); }
      50% { background-color: rgba(255, 255, 255, 0.1); }
      100% { background-color: transparent; }
    }
    
    .highlight-step {
      animation: highlight 2s ease-out;
      position: relative;
    }
    
    .highlight-step::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      border-left: 3px solid rgba(255, 255, 255, 0.3);
      pointer-events: none;
      animation: border-fade 2s ease-out;
    }
    
    @keyframes border-fade {
      0% { border-left-color: rgba(255, 255, 255, 0.5); }
      100% { border-left-color: transparent; }
    }
  `;
  
  // 处理步骤点击 - 滚动到右侧对应位置并添加视觉反馈
  const handleStepClick = (stepId: string) => {
    console.log('点击步骤:', stepId);
    
    // 使用querySelectorAll找到所有匹配的元素 - 以防有多个相同ID的面板
    const stepElements = document.querySelectorAll(`[data-step-id="${stepId}"]`);
    const containerElements = document.querySelectorAll(`[data-step-container="${stepId}"]`);
    
    if (stepElements.length > 0 && contentContainerRef.current) {
      // 获取第一个元素用于滚动
      const firstElement = stepElements[0] as HTMLElement;
      
      // 设置滚动锁，防止自动滚动干扰
      isScrollingRef.current = true;
      
      // 使用scrollTo以便更精确控制滚动位置
      contentContainerRef.current.scrollTo({
        top: firstElement.offsetTop - 20, // 添加一些顶部边距
        behavior: 'smooth'
      });
      
      // 对所有匹配元素应用高亮效果
      const allElements = [...Array.from(stepElements), ...Array.from(containerElements)];
      allElements.forEach(el => {
        // 先移除可能存在的高亮，避免重复叠加动画效果
        el.classList.remove('highlight-step');
        
        // 触发重排，确保动画能够重新开始
        void (el as HTMLElement).offsetWidth;
        
        // 添加高亮效果
        el.classList.add('highlight-step');
        
        // 一段时间后移除高亮
        setTimeout(() => {
          el.classList.remove('highlight-step');
        }, 2000);
      });
      
      // 延迟释放滚动锁，给足够时间完成滚动
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 800); // 比高亮时间短，但比基本滚动时间长
    }
  };
  
  // 获取进度条百分比值
  const progressPercent = useMemo(() => {
    return Math.max(0, Math.min(100, workflowStatus.progress || 0));
  }, [workflowStatus.progress]);
  
  // 获取状态标签文本
  const statusLabel = useMemo(() => {
    switch(workflowStatus.status) {
      case 'completed': return 'DeepDebug';
      case 'error': return 'Error';
      case 'running':
      default: return 'Debugging';
    }
  }, [workflowStatus.status]);
  
  // 处理底部滚动按钮点击
  const handleScrollButtonClick = () => {
    if (!contentContainerRef.current) return;
    
    // 设置滚动锁
    isScrollingRef.current = true;
    
    // 滚动到底部
    contentContainerRef.current.scrollTo({
      top: contentContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
    
    // 滚动完成后释放锁
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 500);
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
                            initalizing...
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
                          content: content,
                          type: 'text'
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
                          initalizing...
                        </div>
                        <div className="text-sm text-secondary mt-2">
                          DeepDebug is ready...
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
        <div className="mb-4">
          <div className="mb-2 flex items-center">
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 24 24" className="text-primary size-[22px] flex-shrink-0 mr-2" height="1.2em" width="1.2em" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.293 6.293 2.586 12l5.707 5.707 1.414-1.414L5.414 12l4.293-4.293zm7.414 11.414L21.414 12l-5.707-5.707-1.414 1.414L18.586 12l-4.293 4.293z"></path>
            </svg>
            <span className="text-lg font-medium text-primary">Full Code</span>
          </div>
          <BotMessage
            message={{
              role: 'assistant',
              content: fullCodeStep.content,
              type: 'text'
            }}
            status="complete"
            className="rounded-2xl p-0"
          />
        </div>
      )}
    </>
  );
};

export default DeepDebugPanel; 