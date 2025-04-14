import React from 'react';
import { Message } from '../services/chatService';

/**
 * 用户消息组件
 * 用于显示用户发送的消息
 */
const UserMessage: React.FC<{ message: Message }> = ({ message }) => {
  return (
    <div className="flex justify-end mb-8">
      <div dir="auto" className="message-bubble rounded-3xl prose dark:prose-invert break-words text-primary min-h-7 prose-p:opacity-95 prose-strong:opacity-100 bg-foreground border border-input-border max-w-[90%] sm:max-w-[80%] px-4 py-2.5 rounded-br-lg text-left">
        <span className="whitespace-pre-wrap">{message.content}</span>
      </div>
    </div>
  );
};

export default UserMessage; 