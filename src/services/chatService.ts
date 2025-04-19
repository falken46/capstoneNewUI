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
  isDeepDebug?: boolean;
  deepDebugResults?: {
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

/**
 * 发送调试工作流请求
 * @param content 代码或问题内容
 * @param modelType 模型类型
 * @param modelName 模型名称
 * @param onStepStarted 步骤开始回调
 * @param onStepProgress 步骤进度回调
 * @param onStepCompleted 步骤完成回调
 * @param onStepError 步骤错误回调
 * @param onComplete 整个工作流完成回调
 * @param onError 整个工作流错误回调
 */
export async function sendDebugWorkflow(
  content: string,
  modelType?: string,
  modelName?: string,
  onStepStarted?: (event: string) => void,
  onStepProgress?: (event: string, content: string) => void,
  onStepCompleted?: (event: string, content: string) => void,
  onStepError?: (event: string, error: string) => void,
  onComplete?: () => void,
  onError?: (error: any) => void
) {
  try {
    const requestBody: any = {
      content,
      stream: true
    };

    if (modelType) {
      requestBody.model_type = modelType;
    }

    if (modelName) {
      requestBody.model_name = modelName;
    }

    console.log("发送调试工作流请求:", requestBody);

    // 发送POST请求
    const response = await fetch(`${API_BASE_URL}/debug/workflow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("调试工作流请求失败:", errorData);
      if (onError) {
        onError(errorData.error || '请求失败');
      }
      return;
    }

    console.log("开始接收调试工作流数据...");

    // 流式接收数据
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

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
            
            try {
              const data = JSON.parse(eventData);
              console.log("收到事件数据:", data);
              
              if (data.error) {
                console.error("事件数据包含错误:", data.error);
                if (onStepError && data.event_name) {
                  onStepError(data.event_name, data.error);
                } else if (onError) {
                  onError(data.error);
                }
                continue;
              }

              // 处理不同类型的事件
              const eventType = data.event_name;
              if (!eventType) {
                console.warn("事件数据没有event字段:", data);
                continue;
              }

              const eventStatus = data.status;

              // 确保事件名称在回调中被正确传递
              // 步骤开始事件
              if (eventStatus === "step_started") {
                if (onStepStarted) {
                  onStepStarted(eventType);
                }
              } 
              // 步骤进度事件
              else if (eventStatus === "step_progress") {
                if (onStepProgress) {
                  onStepProgress(eventType, data.content || '');
                }
              } 
              // 步骤完成事件
              else if (eventStatus === "step_completed" || eventStatus === "step_result") {
                if (onStepCompleted) {
                  onStepCompleted(eventType, data.content || '');
                }
              } 
              // 步骤错误事件
              else if (eventStatus === "step_error") {
                if (onStepError) {
                  onStepError(eventType, data.content || '');
                }
              } 
              // 调试完成事件
              else if (eventStatus === "done" || eventStatus === "debug_completed") {
                console.log("调试工作流完成");
                if (onComplete) {
                  onComplete();
                }
                reader.cancel();
                break;
              } 
              // 纯步骤名称事件（没有前缀的事件类型）
              else {
                console.log("处理纯步骤事件:", eventType);
                if (data.content && onStepProgress) {
                  onStepProgress(eventType, data.content);
                }
              }
            } catch (e) {
              console.error('解析SSE数据出错:', e, '原始数据:', eventData);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("调试工作流发生错误:", error);
    if (onError) {
      onError(error instanceof Error ? error.message : '未知错误');
    }
  }
}

/**
 * 保存聊天记录
 * @param messages 聊天消息列表
 * @param chatId 可选的聊天ID
 * @param title 可选的聊天标题
 * @returns Promise<{success: boolean, chat_id: string}>
 */
export async function saveChatHistory(
  messages: Message[],
  chatId?: string,
  title?: string
): Promise<{success: boolean, chat_id: string}> {
  try {
    // 构建请求体
    const requestBody: any = {
      messages
    };

    if (chatId) {
      requestBody.chat_id = chatId;
    }

    if (title) {
      requestBody.title = title;
    }

    // 发送POST请求
    const response = await fetch(`${API_BASE_URL}/save_chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '保存聊天记录失败');
    }

    return await response.json();
  } catch (error) {
    console.error('保存聊天记录出错:', error);
    throw error;
  }
}

/**
 * 获取聊天记录列表
 * @returns Promise<{chats: {id: string, title: string, timestamp: number}[]}>
 */
export async function getChatList(): Promise<{chats: {id: string, title: string, timestamp: number}[]}> {
  try {
    const response = await fetch(`${API_BASE_URL}/chats`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '获取聊天记录列表失败');
    }

    return await response.json();
  } catch (error) {
    console.error('获取聊天记录列表出错:', error);
    return { chats: [] };
  }
}

/**
 * 获取单个聊天记录详情
 * @param chatId 聊天ID
 * @returns Promise<{id: string, title: string, timestamp: number, messages: Message[]}>
 */
export async function getChatDetail(chatId: string): Promise<{id: string, title: string, timestamp: number, messages: Message[]}> {
  try {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '获取聊天记录详情失败');
    }

    return await response.json();
  } catch (error) {
    console.error('获取聊天记录详情出错:', error);
    throw error;
  }
}

/**
 * 删除聊天记录
 * @param chatId 聊天ID
 * @returns Promise<{success: boolean}>
 */
export async function deleteChatHistory(chatId: string): Promise<{success: boolean}> {
  try {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '删除聊天记录失败');
    }

    return await response.json();
  } catch (error) {
    console.error('删除聊天记录出错:', error);
    throw error;
  }
} 