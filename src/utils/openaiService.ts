/**
 * OpenAI API 服务
 * 用于与OpenAI API进行通信
 */

// 定义消息接口
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// 定义响应接口
export interface ChatResponse {
  message: string;
  error?: string;
}

class OpenAIService {
  private apiKey: string | null = null;

  /**
   * 设置API密钥
   */
  setApiKey(key: string) {
    this.apiKey = key;
  }

  /**
   * 获取API密钥
   */
  getApiKey(): string | null {
    return this.apiKey;
  }

  /**
   * 发送聊天请求到OpenAI API
   */
  async sendChatRequest(messages: ChatMessage[]): Promise<ChatResponse> {
    if (!this.apiKey) {
      return {
        message: '',
        error: '请先设置OpenAI API密钥'
      };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages,
          temperature: 0.7,
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || '调用OpenAI API时出错');
      }

      return {
        message: data.choices[0].message.content
      };
    } catch (error) {
      console.error('OpenAI API调用失败:', error);
      return {
        message: '',
        error: error instanceof Error ? error.message : '调用OpenAI API时出错'
      };
    }
  }
}

// 创建单例实例
const openaiService = new OpenAIService();
export default openaiService; 