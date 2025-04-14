import React, { useEffect, useRef, useCallback } from 'react';
import UserMessage from './UserMessage';
import BotMessage from './BotMessage';
import InputBox from './InputBox';
import { Message } from '../services/chatService';
import { MessageStatus } from './BotMessage';

interface ExpandedDialogLayoutProps {
  messages: Message[];
  botResponseStatus: MessageStatus;
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
  botResponseStatus,
  inputValue,
  onInputChange,
  onSubmit
}) => {
  // 机器人是否正在回复
  const isLoading = botResponseStatus === 'loading' || botResponseStatus === 'streaming';
  // 引用聊天内容区域
  const chatContainerRef = useRef<HTMLDivElement>(null);
  // 跟踪上一次消息长度，只在消息数量变化或最后一条消息内容变化时滚动
  const lastMessageRef = useRef<{content: string, count: number}>({content: '', count: 0});
  // 跟踪是否正在滚动中，避免重复滚动
  const isScrollingRef = useRef<boolean>(false);
  // 跟踪防抖计时器
  const scrollTimerRef = useRef<number | null>(null);
  
  // 防抖滚动函数
  const smoothScrollToBottom = useCallback(() => {
    if (isScrollingRef.current || !chatContainerRef.current) return;
    
    isScrollingRef.current = true;
    
    // 清除之前的计时器
    if (scrollTimerRef.current) {
      window.clearTimeout(scrollTimerRef.current);
    }
    
    // 设置新的计时器，延迟滚动，减少频繁滚动
    scrollTimerRef.current = window.setTimeout(() => {
      if (chatContainerRef.current) {
        // 强制滚动到底部
        const scrollHeight = chatContainerRef.current.scrollHeight;
        chatContainerRef.current.scrollTop = scrollHeight;
        
        // 再尝试使用平滑滚动（为了兼容性）
        try {
          chatContainerRef.current.scrollTo({
            top: scrollHeight,
            behavior: 'smooth'
          });
        } catch (error) {
          console.error('平滑滚动失败:', error);
        }
        
        // 重置滚动状态
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 300); // 滚动完成后重置状态
      }
    }, 10); // 缩短防抖时间，更快响应变化
  }, []);
  
  // 强制滚动到底部的函数（不使用平滑效果，立即滚动）
  const forceScrollToBottom = useCallback(() => {
    if (!chatContainerRef.current) return;
    
    const scrollHeight = chatContainerRef.current.scrollHeight;
    chatContainerRef.current.scrollTop = scrollHeight;
  }, []);
  
  // 消息列表变化时根据条件滚动到底部
  useEffect(() => {
    // 获取当前消息信息
    const currentMsgCount = messages.length;
    const lastMessage = messages[currentMsgCount - 1];
    const lastContent = lastMessage?.content || '';
    
    // 检查是否需要滚动
    // 1. 消息数量变化时总是滚动
    // 2. 最后一条是机器人消息且内容变化时滚动
    // 3. 最后一条是用户消息且是新添加的消息时滚动
    const shouldScroll = 
      currentMsgCount !== lastMessageRef.current.count || // 消息数量变化
      (lastMessage?.role === 'assistant' && lastContent !== lastMessageRef.current.content) || // 最后是机器人消息且内容变化
      (lastMessage?.role === 'user' && currentMsgCount > lastMessageRef.current.count); // 新添加了用户消息
    
    // 更新引用的值
    lastMessageRef.current = {
      content: lastContent,
      count: currentMsgCount
    };
    
    if (shouldScroll) {
      smoothScrollToBottom();
    }
  }, [messages, smoothScrollToBottom]);
  
  // 组件初次渲染和内容更新后执行滚动
  useEffect(() => {
    // 初始化滚动位置
    forceScrollToBottom();
    
    // 使用MutationObserver监视消息变化
    if (chatContainerRef.current) {
      const observer = new MutationObserver(() => {
        forceScrollToBottom();
      });
      
      observer.observe(chatContainerRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
      
      return () => observer.disconnect();
    }
  }, [forceScrollToBottom]);
  
  // 机器人状态变化时也触发滚动（比如从loading变为streaming）
  useEffect(() => {
    if (messages.length > 0) {
      // 无论状态如何变化，都尝试滚动
      smoothScrollToBottom();
      
      // 对于流式响应，设置定期滚动
      if (botResponseStatus === 'streaming') {
        const intervalId = setInterval(forceScrollToBottom, 500);
        return () => clearInterval(intervalId);
      }
    }
  }, [botResponseStatus, messages.length, smoothScrollToBottom, forceScrollToBottom]);
  
  // 当用户提交新消息时触发滚动
  const handleSubmitWithScroll = (e: React.FormEvent) => {
    onSubmit(e);
    // 立即滚动一次
    forceScrollToBottom();
    // 延迟再滚动一次，确保消息已添加到DOM
    setTimeout(() => {
      smoothScrollToBottom();
    }, 100);
  };
  
  // 组件卸载时清理计时器
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) {
        window.clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);
  
  return (
    // 主容器：垂直flex布局，占满父容器高度
    <div className='flex flex-col h-full w-full'>
      
      {/* 聊天内容区域：自动增长以填充空间(flex-1)，最小高度为0，超出时垂直滚动 */}
      <div 
        ref={chatContainerRef} 
        className="flex-1 min-h-0 overflow-y-auto w-full will-change-scroll scroll-smooth"
        onScroll={() => {
          // 用户手动滚动时阻止自动滚动干扰
          if (chatContainerRef.current) {
            const isAtBottom = chatContainerRef.current.scrollHeight - chatContainerRef.current.scrollTop - chatContainerRef.current.clientHeight < 50;
            isScrollingRef.current = !isAtBottom;
          }
        }}
      >
        {/* 内部容器：限制宽度、居中、添加垂直内边距 */}
        <div className="max-w-3xl mx-auto pt-4 pb-2"> 
          <div className="w-[95%] mx-auto">
            {messages.map((msg, index) => (
              msg.role === 'user' ? (
                <UserMessage key={`user-${index}`} message={msg} />
              ) : (
                <BotMessage 
                  key={`bot-${index}`} 
                  message={msg} 
                  status={index === messages.length - 1 && msg.role === 'assistant' ? botResponseStatus : 'complete'} 
                />
              )
            ))}
            {/* 添加一个空的div作为底部缓冲，防止最后一条消息紧贴输入框 */}
            <div className="h-4"></div>
          </div>
        </div>
      </div>
      
      {/* 输入框区域：固定在底部，不收缩 */}
      <div className="w-full bg-[#212121] flex-shrink-0">
         {/* 内部容器：限制宽度、居中、添加垂直内边距 */}
         <div className="max-w-3xl mx-auto py-4">
          <InputBox 
            inputValue={inputValue}
            onInputChange={onInputChange}
            onSubmit={handleSubmitWithScroll}
            placeholder="继续输入您的问题..."
            layoutMode="expanded"
            containerClassName="w-full"
            isLoading={isLoading}
          />
        </div>
      </div>

    </div>
  );
};

export default ExpandedDialogLayout; 