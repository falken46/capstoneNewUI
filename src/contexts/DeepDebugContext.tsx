import React, { createContext, useState, useContext, ReactNode, useRef } from 'react';
import { DebugWorkflowStep, WorkflowStatus } from '../services/debugService';

// 定义上下文的数据结构
interface DeepDebugContextType {
  isDeepDebugEnabled: boolean;
  toggleDeepDebug: (enabled: boolean) => void;
  workflowSteps: DebugWorkflowStep[];
  workflowStatus: WorkflowStatus;
  updateWorkflowStep: (step: DebugWorkflowStep) => void;
  processEvent: (event: string, content: string) => void;
  updateWorkflowStatus: (status: WorkflowStatus) => void;
  resetWorkflow: () => void;
}

// 创建上下文，并设置默认值
const DeepDebugContext = createContext<DeepDebugContextType>({
  isDeepDebugEnabled: false,
  toggleDeepDebug: () => {},
  workflowSteps: [],
  workflowStatus: { status: 'running', progress: 0 },
  updateWorkflowStep: () => {},
  processEvent: () => {},
  updateWorkflowStatus: () => {},
  resetWorkflow: () => {},
});

// 创建Provider组件
interface DeepDebugProviderProps {
  children: ReactNode;
}

export const DeepDebugProvider: React.FC<DeepDebugProviderProps> = ({ children }) => {
  const [isDeepDebugEnabled, setIsDeepDebugEnabled] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState<DebugWorkflowStep[]>([]);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>({ 
    status: 'running', 
    progress: 0,
    elapsedTime: 0,
    sourceCount: 0
  });

  // 使用useRef替代useState，确保更新立即生效
  const eventStepMapRef = useRef<Record<string, string>>({});

  // 美化事件名称的函数
  const formatEventName = (event: string): string => {
    // 将下划线替换为空格，并首字母大写
    return event
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // 规范化事件名称，用于映射
  const normalizeEventName = (event: string): string => {
    // 移除可能的数字后缀和特殊字符，保留核心事件名称
    // 例如：analyzing_problem_1, analyzing_problem_2 都规范为 analyzing_problem
    return event
      .replace(/(_\d+)$/, '') // 移除末尾的_数字
      .replace(/[^\w_]/g, '') // 移除非字母数字下划线字符
      .toLowerCase(); // 转为小写以确保一致性
  };

  const toggleDeepDebug = (enabled: boolean) => {
    console.log(`切换DeepDebug状态: ${isDeepDebugEnabled} -> ${enabled}`);
    // 只改变开关状态，不影响工作流数据
    setIsDeepDebugEnabled(enabled);
    // 移除了所有初始化工作流的逻辑
  };

  // 处理任意事件并转换为工作流步骤
  const processEvent = (event: string, content: string) => {
    console.log(`处理事件: ${event}, 内容长度: ${content.length}, 当前映射条目数: ${Object.keys(eventStepMapRef.current).length}`);
    
    // 如果是完成或错误事件，更新工作流状态
    if (event === 'done') {
      // 将所有步骤标记为已完成
      setWorkflowSteps(prevSteps => 
        prevSteps.map(step => ({
          ...step,
          status: 'completed'
        }))
      );
      
      updateWorkflowStatus({
        status: 'completed',
        progress: 100
      });
      return;
    } else if (event === 'error') {
      updateWorkflowStatus({
        status: 'error',
        progress: 100,
        error: content
      });
      return;
    }
    
    // 规范化事件名称用于映射
    const normalizedEvent = normalizeEventName(event);
    
    // 美化事件名称作为标题
    const title = formatEventName(event);
    
    // 在创建新步骤之前，将所有现有步骤标记为已完成
    if (workflowSteps.length > 0 && !eventStepMapRef.current[normalizedEvent]) {
      setWorkflowSteps(prevSteps => 
        prevSteps.map(step => ({
          ...step,
          status: 'completed'
        }))
      );
    }
    
    // 检查这个事件是否已有对应的步骤，使用规范化后的事件名
    if (eventStepMapRef.current[normalizedEvent]) {
      // 更新现有步骤
      const stepId = eventStepMapRef.current[normalizedEvent];
      console.log(`更新已有步骤: ${normalizedEvent} (原始: ${event}) -> ${stepId}, 现有步骤数: ${workflowSteps.length}`);
      updateWorkflowStep({
        id: stepId,
        title: title,
        content: content,
        status: 'in_progress',  // 总是设为进行中
        timestamp: Date.now()
      });
    } else {
      // 创建新步骤
      const newStepId = `step_${Date.now()}_${normalizedEvent}`;
      console.log(`创建新步骤: ${normalizedEvent} (原始: ${event}) -> ${newStepId}, 现有步骤数: ${workflowSteps.length}, 现有映射: ${JSON.stringify(eventStepMapRef.current)}`);
      
      // 更新事件步骤映射 - 直接修改ref当前值，使用规范化后的事件名
      eventStepMapRef.current[normalizedEvent] = newStepId;
      console.log(`事件映射已更新, 现在共有 ${Object.keys(eventStepMapRef.current).length} 个映射`);
      
      updateWorkflowStep({
        id: newStepId,
        title: title,
        content: content,
        status: 'in_progress',  // 总是设为进行中
        timestamp: Date.now()
      });
    }
  };

  const updateWorkflowStep = (step: DebugWorkflowStep) => {
    console.log(`更新步骤: ${step.id} - ${step.title}`);
    setWorkflowSteps(prevSteps => {
      // 检查步骤是否已存在
      const stepIndex = prevSteps.findIndex(s => s.id === step.id);
      
      if (stepIndex >= 0) {
        // 更新已存在的步骤
        const updatedSteps = [...prevSteps];
        updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], ...step };
        return updatedSteps;
      } else {
        // 添加新步骤
        return [...prevSteps, step];
      }
    });
  };

  const updateWorkflowStatus = (status: WorkflowStatus) => {
    console.log(`更新工作流状态: ${workflowStatus.status} -> ${status.status}, 进度: ${status.progress}%`);
    setWorkflowStatus(prevStatus => ({ ...prevStatus, ...status }));
  };

  const resetWorkflow = () => {
    console.log('重置工作流状态');
    setWorkflowSteps([]);
    eventStepMapRef.current = {}; // 重置事件步骤映射
    setWorkflowStatus({ 
      status: 'running', 
      progress: 0,
      elapsedTime: 0,
      sourceCount: 0
    });
    
    // 在下一个tick检查状态是否已重置
    setTimeout(() => {
      console.log('工作流状态已重置', { 
        步骤数: 0, 
        状态: '运行中',
        进度: 0
      });
    }, 0);
  };

  return (
    <DeepDebugContext.Provider 
      value={{ 
        isDeepDebugEnabled, 
        toggleDeepDebug, 
        workflowSteps, 
        workflowStatus,
        updateWorkflowStep,
        processEvent,
        updateWorkflowStatus,
        resetWorkflow
      }}
    >
      {children}
    </DeepDebugContext.Provider>
  );
};

// 创建自定义Hook，便于在组件中使用
export const useDeepDebug = () => useContext(DeepDebugContext);

export default DeepDebugContext; 