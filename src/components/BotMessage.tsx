import React from 'react';
import CodeBlock from './CodeBlock';

interface BotMessageProps {
  message: string;
}

/**
 * 机器人消息组件
 * 用于显示AI回复的消息
 */
const BotMessage: React.FC<BotMessageProps> = ({ message }) => {
  // 检测是否包含代码块
  const hasPythonCode = message.includes('```python') || 
    (message.includes('```') && 
     (message.includes('def ') || 
      message.includes('import ') || 
      message.includes('print(') ||
      message.includes('for ')));

  // 提取代码块
  const extractCodeAndText = () => {
    if (!hasPythonCode) {
      return [{ type: 'text', content: message }];
    }

    const parts = [];
    let remainingText = message;
    let codeBlockStart = -1;

    // 查找Python代码块
    while ((codeBlockStart = remainingText.indexOf('```')) !== -1) {
      // 添加代码块前的文本
      if (codeBlockStart > 0) {
        parts.push({
          type: 'text',
          content: remainingText.substring(0, codeBlockStart)
        });
      }

      // 找代码块结束位置
      const isPythonBlock = remainingText.substring(codeBlockStart + 3, codeBlockStart + 9) === 'python';
      const codeStart = codeBlockStart + (isPythonBlock ? 9 : 3);
      const codeEnd = remainingText.indexOf('```', codeStart);

      if (codeEnd === -1) {
        // 如果没有结束标记，将剩余部分作为文本
        parts.push({
          type: 'text',
          content: remainingText.substring(codeBlockStart)
        });
        break;
      }

      // 提取代码块内容
      const code = remainingText.substring(codeStart, codeEnd).trim();
      parts.push({
        type: 'code',
        content: code
      });

      // 更新剩余文本
      remainingText = remainingText.substring(codeEnd + 3);
    }

    // 添加最后剩余的文本
    if (remainingText.length > 0) {
      parts.push({
        type: 'text',
        content: remainingText
      });
    }

    return parts;
  };

  const messageParts = extractCodeAndText();

  return (
    <div className="flex mb-4 ml-8">
      <div className="message-bubble rounded-3xl prose dark:prose-invert break-words text-primary min-h-7 prose-p:opacity-95 prose-strong:opacity-100 bg-[#252525] border border-input-border max-w-[100%] sm:max-w-[90%] px-4 py-2.5 rounded-bl-lg">
        {messageParts.map((part, index) => (
          part.type === 'code' ? (
            <CodeBlock key={index} code={part.content} />
          ) : (
            <span key={index} className="whitespace-pre-wrap">{part.content}</span>
          )
        ))}
      </div>
    </div>
  );
};

export default BotMessage; 