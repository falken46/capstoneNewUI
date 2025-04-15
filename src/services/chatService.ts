/**
 * 聊天服务
 * 提供与后端API通信的接口
 */

// 默认API地址
const API_BASE_URL = 'http://localhost:5002/api';

// 消息类型定义
export interface Message {
  role: string;
  content: string;
  type?: 'text' | 'deepdebug';
}

// 模型信息类型定义
export interface ModelInfo {
  name: string;
  type: string;
  provider: string;
}

// 可用模型类型定义
export interface AvailableModels {
  default: ModelInfo;
  models: {
    [key: string]: ModelInfo[];
  };
}

/**
 * 发送聊天消息
 * @param messages 消息列表
 * @param modelType 模型类型
 * @param modelName 模型名称
 * @param onMessage 接收消息回调
 * @param onError 错误回调
 * @param onFinish 完成回调
 */
export async function sendChatMessage(
  messages: Message[],
  modelType?: string,
  modelName?: string,
  onMessage?: (content: string) => void,
  onError?: (error: any) => void,
  onFinish?: () => void
) {
  try {
    const requestBody: any = {
      messages,
      stream: true
    };

    if (modelType) {
      requestBody.model_type = modelType;
    }

    if (modelName) {
      requestBody.model_name = modelName;
    }

    // 发送POST请求
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (onError) {
        onError(errorData.error || '请求失败');
      }
      return;
    }

    if (!requestBody.stream) {
      const data = await response.json();
      if (onMessage) {
        onMessage(data.content);
      }
      if (onFinish) {
        onFinish();
      }
      return;
    }

    // 流式接收数据
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedContent = ''; // 累积的消息内容

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const eventData = line.slice(6);
            if (eventData === '[DONE]') {
              if (onFinish) {
                onFinish();
              }
              reader.cancel();
              break;
            }

            try {
              const data = JSON.parse(eventData);
              if (data.error) {
                if (onError) {
                  onError(data.error);
                }
                reader.cancel();
                break;
              }

              if (data.content && onMessage) {
                // 累积内容而不是只发送当前块
                accumulatedContent += data.content;
                onMessage(accumulatedContent);
              } else if (data.delta && onMessage) {
                // 兼容OpenAI格式的流式响应
                accumulatedContent += data.delta.content || '';
                onMessage(accumulatedContent);
              }
            } catch (e) {
              console.error('解析SSE数据出错:', e);
            }
          }
        }
      }
    }
  } catch (error) {
    if (onError) {
      onError(error instanceof Error ? error.message : '未知错误');
    }
  }
}

/**
 * 获取可用模型列表
 * @returns Promise<AvailableModels>
 */
export async function getAvailableModels(): Promise<AvailableModels> {
  try {
    const response = await fetch(`${API_BASE_URL}/models`);
    if (!response.ok) {
      throw new Error('获取模型列表失败');
    }
    return await response.json();
  } catch (error) {
    console.error('获取模型列表出错:', error);
    // 返回默认值
    return {
      default: {
        type: 'ollama',
        name: 'qwen2.5-coder',
        provider: 'Ollama'
      },
      models: {
        ollama: [
          { name: 'qwen2.5-coder', type: 'ollama', provider: 'Ollama' }
        ]
      }
    };
  }
}

/**
 * 检查后端健康状态
 * @returns Promise<boolean>
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('健康检查失败:', error);
    return false;
  }
} 