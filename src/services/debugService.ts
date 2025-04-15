/**
 * 调试服务
 * 处理DeepDebug工作流功能的请求和响应
 */

// 默认API地址
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5002/api';

// 工作流步骤结构定义
export interface DebugWorkflowStep {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'completed' | 'in_progress';
  timestamp?: number;
}

// 工作流状态结构定义
export interface WorkflowStatus {
  status: 'running' | 'completed' | 'error';
  progress: number;
  elapsedTime?: number;
  sourceCount?: number;
  error?: string;
}

/**
 * 发送工作流调试请求
 * @param content 需要分析的内容
 * @param modelType 模型类型
 * @param modelName 模型名称
 * @param onStepUpdate 步骤更新回调
 * @param onStatusUpdate 状态更新回调
 * @param onError 错误回调
 * @param onFinish 完成回调
 * @param onEvent 事件处理回调 - 新增用于处理原始事件
 */
export async function sendDebugWorkflow(
  content: string,
  modelType: string,
  modelName: string,
  onStepUpdate?: (step: DebugWorkflowStep) => void,
  onStatusUpdate?: (status: WorkflowStatus) => void,
  onError?: (error: any) => void,
  onFinish?: () => void,
  onEvent?: (event: string, content: string) => void // 新增事件处理回调
) {
  console.log('发送工作流调试请求:', { content: content.substring(0, 100) + '...', modelType, modelName });
  
  try {
    const requestBody = {
      content,
      model_type: modelType,
      model_name: modelName,
      stream: true
    };

    // 发送POST请求
    console.log(`正在发送POST请求到 ${API_BASE_URL}/debug/workflow`);
    const response = await fetch(`${API_BASE_URL}/debug/workflow`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('收到响应:', { status: response.status, ok: response.ok });
    
    if (!response.ok) {
      let errorMessage = '请求失败';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        console.error('解析错误响应失败:', e);
      }
      
      console.error('API请求失败:', { status: response.status, error: errorMessage });
      if (onError) {
        onError(errorMessage);
      }
      return;
    }

    // 初始化工作流状态为运行中
    if (onStatusUpdate) {
      onStatusUpdate({
        status: 'running',
        progress: 0,
        elapsedTime: 0,
        sourceCount: 0
      });
    }

    // 流式接收数据
    console.log('准备接收流式数据');
    const reader = response.body?.getReader();
    if (!reader) {
      console.error('无法获取响应流读取器');
      if (onError) {
        onError('无法读取响应流');
      }
      return;
    }
    
    const decoder = new TextDecoder();
    let buffer = '';
    let eventCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('流式读取完成');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const eventData = line.slice(6);
            eventCount++;
            
            try {
              const data = JSON.parse(eventData);
              console.log(`接收到第${eventCount}个事件:`, { event: data.event, data: JSON.stringify(data).substring(0, 100) + '...' });
              
              // 处理任何事件并转换为步骤 (新增)
              if (data.event && onEvent) {
                console.log(`将事件 ${data.event} 传递给上下文处理`);
                onEvent(data.event, data.content || '');
              }
              
              // 处理完成事件
              if (data.event === 'done') {
                console.log('接收到完成事件');
                if (onFinish) {
                  onFinish();
                }
                reader.cancel();
                break;
              }
              
              // 处理错误事件
              if (data.event === 'error') {
                console.error('接收到错误事件:', data.content);
                if (onError) {
                  onError(data.content || '未知错误');
                }
                reader.cancel();
                break;
              }
              
              // 处理步骤更新
              if (data.event === 'step_update' && onStepUpdate && data.step) {
                console.log('步骤更新:', data.step.id, data.step.title);
                // 保证步骤符合我们的格式要求
                const step: DebugWorkflowStep = {
                  id: data.step.id || `step_${Date.now()}`,
                  title: data.step.title || '分析步骤',
                  content: data.step.content || '',
                  status: data.step.status || 'completed',
                  timestamp: data.step.timestamp || Date.now()
                };
                onStepUpdate(step);
              }
              
              // 处理状态更新
              if (data.event === 'status_update' && onStatusUpdate && data.status) {
                console.log('状态更新:', data.status);
                // 保证状态符合我们的格式要求
                const status: WorkflowStatus = {
                  status: data.status.status || 'running',
                  progress: data.status.progress || 0,
                  elapsedTime: data.status.elapsedTime || 0,
                  sourceCount: data.status.sourceCount || 0,
                  error: data.status.error
                };
                onStatusUpdate(status);
              }
            } catch (e) {
              console.error('解析工作流SSE数据出错:', e, '原始数据:', eventData.substring(0, 200));
            }
          } else if (line.trim()) {
            console.warn('收到非data前缀的行:', line);
          }
        }
      }
    } catch (streamError) {
      console.error('流式读取过程中发生错误:', streamError);
      if (onError) {
        onError(streamError instanceof Error ? streamError.message : '读取流数据时出错');
      }
      reader.cancel().catch(e => console.error('取消读取器失败:', e));
    }
    
    // 处理可能的未完成事件
    if (buffer.trim() && buffer.startsWith('data: ')) {
      try {
        const eventData = buffer.slice(6);
        const data = JSON.parse(eventData);
        console.log('处理缓冲区中剩余的事件:', data.event);
        
        // 处理任何事件并转换为步骤 (新增)
        if (data.event && onEvent) {
          console.log(`将缓冲区中剩余的事件 ${data.event} 传递给上下文处理`);
          onEvent(data.event, data.content || '');
        }
        
        if (data.event === 'done' && onFinish) {
          onFinish();
        } else if (data.event === 'error' && onError) {
          onError(data.content || '未知错误');
        } else if (data.event === 'step_update' && onStepUpdate && data.step) {
          // 同样保证格式
          const step: DebugWorkflowStep = {
            id: data.step.id || `step_${Date.now()}`,
            title: data.step.title || '分析步骤',
            content: data.step.content || '',
            status: data.step.status || 'completed',
            timestamp: data.step.timestamp || Date.now()
          };
          onStepUpdate(step);
        } else if (data.event === 'status_update' && onStatusUpdate && data.status) {
          // 同样保证格式
          const status: WorkflowStatus = {
            status: data.status.status || 'running',
            progress: data.status.progress || 0,
            elapsedTime: data.status.elapsedTime || 0,
            sourceCount: data.status.sourceCount || 0,
            error: data.status.error
          };
          onStatusUpdate(status);
        }
      } catch (e) {
        console.warn('处理剩余缓冲区数据出错:', e);
      }
    }
  } catch (error) {
    console.error('发送Debug工作流请求失败:', error);
    if (onError) {
      onError(error instanceof Error ? error.message : '未知错误');
    }
  } finally {
    console.log('工作流请求处理完成');
  }
} 