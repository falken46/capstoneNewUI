import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Message } from '../services/chatService';

// 修改全局类型声明，添加自定义属性
declare global {
  interface Window {
    pyodide: any;
    loadPyodide: (config: {indexURL: string}) => Promise<any>;
    pyOutput: (text: string) => void;
    pyError: (text: string) => void;
  }
}

// 自定义代码高亮主题，模拟VSCode深色主题
const vscodeTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    padding: 20,
    margin: 0,
    borderRadius: 0,
    background: '#1e1e1e', // VSCode背景色
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: '#1e1e1e',
  },
  'comment': {
    ...oneDark['comment'],
    color: '#6A9955' // VSCode注释色
  },
  'string': {
    ...oneDark['string'],
    color: '#ce9178' // VSCode字符串色
  },
  'keyword': {
    ...oneDark['keyword'],
    color: '#569cd6' // VSCode关键字色
  },
  'function': {
    ...oneDark['function'],
    color: '#dcdcaa' // VSCode函数色
  },
  'number': {
    ...oneDark['number'],
    color: '#b5cea8' // VSCode数字色
  }
};

interface CanvasModeProps {
  messages: Message[];
  className?: string;
  onCanvasModeToggle?: (code?: string, language?: string) => void;
  selectedCodeSnippet?: { code: string, language: string } | null;
}

// 声明错误类型接口
interface PyodideError extends Error {
  traceback?: string;
}

// 添加示例代码
const pythonExamples = [
  {
    name: '基础示例',
    code: `# 基础Python示例
print("Hello, World!")
for i in range(5):
    print(f"计数: {i}")
`,
  },
  {
    name: '数据分析',
    code: `# 数据分析示例
import numpy as np
import matplotlib.pyplot as plt

# 创建一些示例数据
x = np.linspace(0, 10, 100)
y = np.sin(x)

# 基本统计
print(f"均值: {np.mean(y):.4f}")
print(f"标准差: {np.std(y):.4f}")
print(f"最大值: {np.max(y):.4f}")
print(f"最小值: {np.min(y):.4f}")

# matplotlib绘图会在本地运行，但在web环境中不显示
# 如果在本地环境，可以使用:
# plt.plot(x, y)
# plt.title('正弦曲线')
# plt.show()
`,
  },
  {
    name: '递归示例',
    code: `# 递归函数示例 - 斐波那契数列
def fibonacci(n):
    """计算斐波那契数列的第n个数"""
    if n <= 1:
        return n
    else:
        return fibonacci(n-1) + fibonacci(n-2)

# 测试函数
for i in range(10):
    print(f"fibonacci({i}) = {fibonacci(i)}")
`,
  },
];

/**
 * Canvas模式组件
 * 在右侧展示代码，采用VSCode风格
 */
const CanvasMode: React.FC<CanvasModeProps> = ({ 
  messages, 
  className = '', 
  onCanvasModeToggle,
  selectedCodeSnippet 
}) => {
  const [codeSnippets, setCodeSnippets] = useState<Array<{ code: string, language: string }>>([]);
  const [editableCode, setEditableCode] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [activeSnippetIndex, setActiveSnippetIndex] = useState<number>(0);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  // Python解释器状态
  const [pyodideLoading, setPyodideLoading] = useState<boolean>(false);
  const [pyodideReady, setPyodideReady] = useState<boolean>(false);
  const [pythonOutput, setPythonOutput] = useState<string>('');
  const [executing, setExecuting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // 引用pyodide实例
  const pyodideRef = useRef<any>(null);
  
  // 添加初始化效果
  useEffect(() => {
    // 手动调用一次initPyodide，不等待代码片段检查
    const loadPyodide = async () => {
      console.log("组件加载时尝试初始化Pyodide...");
      
      try {
        setPyodideLoading(true);
        
        // 检查window上是否有loadPyodide函数
        if (typeof window.loadPyodide !== 'function') {
          console.error("找不到window.loadPyodide函数，尝试动态加载脚本");
          
          // 如果没有找到loadPyodide函数，尝试动态加载脚本
          const script = document.createElement('script');
          script.src = "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js";
          script.async = true;
          script.onload = () => {
            console.log("Pyodide脚本加载成功，重新尝试初始化");
            loadPyodide(); // 递归调用自身重新尝试
          };
          script.onerror = (err) => {
            console.error("Pyodide脚本加载失败:", err);
            setError("无法加载Python解释器脚本。请检查网络连接或刷新页面重试。");
            setPyodideLoading(false);
          };
          
          document.body.appendChild(script);
          return;
        }
        
        // 继续正常加载
        if (window.pyodide) {
          console.log("使用已存在的Pyodide实例");
          pyodideRef.current = window.pyodide;
          setPyodideReady(true);
          setPyodideLoading(false);
          return;
        }
        
        console.log("开始初始化新的Pyodide实例...");
        pyodideRef.current = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/"
        });
        
        console.log("Pyodide加载成功!");
        window.pyodide = pyodideRef.current;
        setPyodideReady(true);
        
        // 预加载一些基本包
        try {
          console.log("尝试预加载Python标准库...");
          await pyodideRef.current.loadPackagesFromImports("import sys, io");
          console.log("基本Python包加载完成");
        } catch (packageErr) {
          console.warn("加载Python包时出现警告:", packageErr);
          // 继续执行，因为基本功能仍然可用
        }
      } catch (err: unknown) {
        console.error("Pyodide初始化失败:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`无法初始化Python解释器: ${errorMessage}`);
      } finally {
        setPyodideLoading(false);
      }
    };
    
    // 仅当选中的语言是Python时，才加载Pyodide
    if (selectedLanguage === 'python' || selectedLanguage === 'py') {
      loadPyodide();
    }
  }, [selectedLanguage]); // 依赖选中的语言变化
  
  // 处理选中的代码片段
  useEffect(() => {
    if (selectedCodeSnippet) {
      // 如果有选中的代码片段，仅显示该片段
      setCodeSnippets([selectedCodeSnippet]);
      setEditableCode(selectedCodeSnippet.code);
      setSelectedLanguage(selectedCodeSnippet.language);
    } else {
      // 否则从所有消息中提取代码片段
      const extractedSnippets: Array<{ code: string, language: string }> = [];
      
      messages.forEach(message => {
        if (message.role === 'assistant') {
          // 正则表达式匹配代码块
          const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
          let match;
          
          while ((match = codeBlockRegex.exec(message.content)) !== null) {
            const language = match[1] || 'text';
            const code = match[2];
            
            if (code.trim()) {
              extractedSnippets.push({
                code: code,
                language: language
              });
            }
          }
        }
      });
      
      if (extractedSnippets.length > 0) {
        setCodeSnippets(extractedSnippets);
        setEditableCode(extractedSnippets[0].code);
        setSelectedLanguage(extractedSnippets[0].language);
      }
    }
  }, [messages, selectedCodeSnippet]);
  
  // 运行Python代码的函数
  const runPythonCode = async () => {
    console.log("尝试运行Python代码");
    
    if (!pyodideRef.current) {
      console.log("Python解释器未初始化，尝试初始化...");
      setError("正在尝试加载Python解释器...");
      
      try {
        setPyodideLoading(true);
        
        if (typeof window.loadPyodide !== 'function') {
          setError("浏览器中找不到Python解释器。请刷新页面或检查控制台错误。");
          console.error("window.loadPyodide函数不存在");
          return;
        }
        
        pyodideRef.current = await window.loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.23.4/full/"
        });
        window.pyodide = pyodideRef.current;
        setPyodideReady(true);
        
        console.log("尝试执行时加载了Pyodide");
      } catch (loadErr: unknown) {
        const errorMessage = loadErr instanceof Error ? loadErr.message : String(loadErr);
        setError(`无法加载Python解释器: ${errorMessage}`);
        console.error("尝试执行时加载Pyodide失败:", loadErr);
        setPyodideLoading(false);
        return;
      } finally {
        setPyodideLoading(false);
      }
    }
    
    try {
      setExecuting(true);
      setPythonOutput('');
      setError(null);
      
      console.log("开始执行Python代码...");
      const code = editableCode.trim();
      
      if (!code) {
        setPythonOutput("// 没有代码可执行");
        setExecuting(false);
        return;
      }
      
      console.log("准备执行的代码:", code);
      
      // 修改：在执行前添加输出捕获的Python代码
      // 这会确保即使使用print函数时，输出也能被正确捕获
      const wrappedCode = `
import sys
from pyodide.console import Console
import io

# 创建自定义输出流
captured_stdout = io.StringIO()
captured_stderr = io.StringIO()

# 保存原始输出流
original_stdout = sys.stdout
original_stderr = sys.stderr

# 重定向输出流
sys.stdout = captured_stdout
sys.stderr = captured_stderr

try:
${code.split('\n').map(line => '    ' + line).join('\n')}
finally:
    # 恢复原始输出流
    sys.stdout = original_stdout
    sys.stderr = original_stderr
    
    # 获取捕获的输出
    output = captured_stdout.getvalue()
    errors = captured_stderr.getvalue()
    
    # 清空缓存，防止后续代码执行时出现残余输出
    captured_stdout.close()
    captured_stderr.close()
    
    # 将捕获的输出通过JS接口传递出去
    # 正确导入js对象
    from js import console
    import js
    
    console.log("捕获的Python输出:", output)
    if output:
        js.pyOutput(output)
    if errors:
        js.pyError(errors)
`;

      // 在window对象上注册回调函数，接收Python的输出
      window.pyOutput = (text: string) => {
        console.log("从Python收到的输出:", text);
        setPythonOutput(prev => {
          if (prev) return prev + text;
          return text;
        });
      };
      
      window.pyError = (text: string) => {
        console.log("从Python收到的错误:", text);
        setError(prev => {
          if (prev) return prev + "\n" + text;
          return text;
        });
      };
      
      // 声明全局接口
      if (!window.pyOutput) {
        Object.defineProperty(window, 'pyOutput', {
          value: (text: string) => {
            console.log("从Python收到的输出:", text);
            setPythonOutput(prev => {
              if (prev) return prev + text;
              return text;
            });
          },
          writable: true
        });
      }
      
      if (!window.pyError) {
        Object.defineProperty(window, 'pyError', {
          value: (text: string) => {
            console.log("从Python收到的错误:", text);
            setError(prev => {
              if (prev) return prev + "\n" + text;
              return text;
            });
          },
          writable: true
        });
      }
      
      // 使用旧的stdout捕获机制作为备份
      let outputBuffer = '';
      pyodideRef.current.setStdout({
        write: (text: string) => {
          console.log("Python stdout直接输出:", text);
          outputBuffer += text;
          setPythonOutput(prev => prev + text);
        }
      });
      
      pyodideRef.current.setStderr({
        write: (text: string) => {
          console.log("Python stderr直接输出:", text);
          outputBuffer += `[错误] ${text}`;
          setError(prev => prev ? prev + "\n[错误] " + text : "[错误] " + text);
        }
      });
      
      // 运行Python代码
      console.log("执行包装后的代码");
      const result = await pyodideRef.current.runPythonAsync(wrappedCode);
      console.log("Python代码执行结果:", result);
      
      // 如果有返回值且不是None，显示在输出中
      if (result !== undefined && result !== null && result.toString() !== "undefined" && result.toString() !== "<undefined>" && pyodideRef.current.globals.get("repr")) {
        try {
          const resultStr = pyodideRef.current.globals.get("repr")(result);
          console.log("Python返回值:", resultStr);
          if (resultStr !== "None") {
            setPythonOutput(prev => {
              if (prev) {
                if (!prev.endsWith('\n')) return prev + '\n=> ' + resultStr;
                return prev + '=> ' + resultStr;
              }
              return '=> ' + resultStr;
            });
          }
        } catch (reprErr) {
          console.warn("无法显示返回值:", reprErr);
        }
      }
      
      // 检查是否有任何输出
      setTimeout(() => {
        setPythonOutput(prev => {
          if (!prev || prev.trim() === '') {
            return "// 代码执行成功，但没有输出 (可能缺少print语句)";
          }
          return prev;
        });
      }, 100);
      
    } catch (err: unknown) {
      console.error("Python执行错误:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      // 错误信息处理
      setError(errorMessage);
      
      // 显示Python回溯信息(如果有)
      if (err instanceof Error && 'traceback' in err) {
        const pyError = err as PyodideError;
        if (pyError.traceback) {
          console.error("Python回溯:", pyError.traceback);
          setError(prev => prev + "\n\n" + pyError.traceback);
        }
      }
    } finally {
      setExecuting(false);
    }
  };
  
  // 设置活动代码片段
  const handleSnippetSelect = (index: number) => {
    setActiveSnippetIndex(index);
    if (codeSnippets[index]) {
      setEditableCode(codeSnippets[index].code);
      setSelectedLanguage(codeSnippets[index].language);
    }
  };
  
  // 切换编辑模式
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };
  
  // 在render方法前添加一个新的方法来插入示例代码
  const insertExample = (exampleIndex: number) => {
    if (pythonExamples[exampleIndex]) {
      setEditableCode(pythonExamples[exampleIndex].code);
      setIsEditing(true); // 切换到编辑模式
    }
  };
  
  // 如果没有代码片段，显示提示信息
  if (codeSnippets.length === 0) {
    return (
      <div className={`h-full flex items-center justify-center bg-[#1e1e1e] ${className}`}>
        <div className="text-gray-400 text-center p-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
          </svg>
          <h3 className="text-xl font-semibold mb-2">没有可用的代码</h3>
          <p className="text-sm">对话中尚未发现代码片段。<br />当您收到包含代码的回复时，将在此处显示。</p>
          
          {/* 退出画布模式按钮 */}
          <button 
            onClick={() => onCanvasModeToggle && onCanvasModeToggle()}
            className="mt-6 px-4 py-2 bg-[#2b2b2b] hover:bg-[#3d3d3d] text-white rounded flex items-center mx-auto"
          >
            <svg className="mr-2" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 19H5V5H19V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            退出画布模式
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full overflow-hidden bg-[#1e1e1e] flex flex-col ${className}`}>
      {/* VSCode风格的顶部菜单栏 */}
      <div className="bg-[#252526] py-1 px-4 flex items-center justify-between border-b border-[#1e1e1e]">
        <div className="flex items-center">
          <div className="bg-[#1e1e1e] text-gray-300 py-1 px-3 text-xs rounded-t-md border-t border-l border-r border-[#3c3c3c]">
            {selectedCodeSnippet ? '选中的代码片段' : '代码预览'}
          </div>
          
          {/* 示例代码下拉菜单 - 仅在Python代码时显示 */}
          {(selectedLanguage === 'python' || selectedLanguage === 'py') && (
            <div className="relative ml-4 group">
              <button className="text-gray-300 hover:text-white text-xs py-1 px-3 bg-[#2b2b2b] hover:bg-[#3d3d3d] rounded border border-[#3c3c3c] transition-colors flex items-center">
                插入示例
                <svg className="ml-1" width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <div className="absolute left-0 top-full mt-1 bg-[#252526] border border-[#3c3c3c] rounded overflow-hidden hidden group-hover:block z-10 w-48">
                {pythonExamples.map((example, index) => (
                  <button 
                    key={index}
                    onClick={() => insertExample(index)}
                    className="block w-full text-left text-gray-300 hover:bg-[#3d3d3d] hover:text-white px-4 py-2 text-xs transition-colors"
                  >
                    {example.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Python代码才显示执行按钮 */}
          {(selectedLanguage === 'python' || selectedLanguage === 'py') && (
            <button
              onClick={runPythonCode}
              disabled={pyodideLoading || executing}
              className={`text-gray-300 hover:text-white flex items-center text-xs py-1 px-3 ${pyodideLoading || executing ? 'bg-[#444444] cursor-not-allowed' : 'bg-[#2b5132] hover:bg-[#3c6e44]'} rounded border border-[#3c5c43] transition-colors`}
              title="运行代码"
            >
              {executing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  正在执行...
                </>
              ) : pyodideLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  加载中...
                </>
              ) : (
                <>
                  <svg className="mr-1" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 3l14 9-14 9V3z" fill="currentColor" />
                  </svg>
                  运行
                </>
              )}
            </button>
          )}
          
          {/* 编辑模式切换按钮 */}
          <button
            onClick={toggleEditMode}
            className="text-gray-300 hover:text-white flex items-center text-xs py-1 px-3 bg-[#2b2b2b] hover:bg-[#3d3d3d] rounded border border-[#3c3c3c] transition-colors"
            title={isEditing ? "查看模式" : "编辑模式"}
          >
            <svg className="mr-1" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d={isEditing ? "M12 15V3m0 12l-4-4m4 4l4-4M2 17l.621 2.485A2 2 0 0 0 4.561 21h14.878a2 2 0 0 0 1.94-1.515L22 17" : "M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"}
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            </svg>
            {isEditing ? "查看" : "编辑"}
          </button>
          
          {/* 添加退出Canvas模式按钮 */}
          <button
            onClick={() => onCanvasModeToggle && onCanvasModeToggle()}
            className="text-gray-300 hover:text-white flex items-center text-xs py-1 px-3 bg-[#2b2b2b] hover:bg-[#3d3d3d] rounded border border-[#3c3c3c] transition-colors"
            title="退出画布模式"
          >
            <svg className="mr-1" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 19H5V5H19V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M12 5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            退出
          </button>
        </div>
      </div>
      
      {/* 主要内容区域 - 分为代码区和结果区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 如果有多个代码片段，显示选项卡 */}
        {codeSnippets.length > 1 && !selectedCodeSnippet && (
          <div className="flex bg-[#252526] border-b border-[#1e1e1e]">
            {codeSnippets.map((snippet, index) => (
              <button
                key={index}
                className={`py-1 px-4 text-xs border-r border-[#1e1e1e] ${activeSnippetIndex === index ? 'bg-[#1e1e1e] text-white' : 'bg-[#2d2d2d] text-gray-400 hover:bg-[#333333]'}`}
                onClick={() => handleSnippetSelect(index)}
              >
                {snippet.language.toUpperCase()} 片段 #{index + 1}
              </button>
            ))}
          </div>
        )}
        
        {/* 代码区域 */}
        <div className="flex-1 overflow-auto min-h-0 relative">
          {isEditing ? (
            <div className="relative w-full h-full flex">
              {/* 行号部分 */}
              <div className="bg-[#1e1e1e] text-[#6A6A6A] text-right py-4 pr-2 pl-4 select-none font-mono text-sm">
                {editableCode.split('\n').map((_, i) => (
                  <div key={i} className="leading-5">
                    {i + 1}
                  </div>
                ))}
              </div>
              {/* 编辑器部分 */}
              <textarea
                value={editableCode}
                onChange={(e) => setEditableCode(e.target.value)}
                className="w-full h-full bg-[#1e1e1e] text-white p-4 pl-0 resize-none font-mono border-none outline-none leading-5"
                spellCheck={false}
                autoComplete="off"
                wrap="off"
                onKeyDown={(e) => {
                  // 处理Tab键
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const start = e.currentTarget.selectionStart;
                    const end = e.currentTarget.selectionEnd;
                    
                    // 在光标位置插入两个空格
                    const newValue = editableCode.substring(0, start) + '  ' + editableCode.substring(end);
                    setEditableCode(newValue);
                    
                    // 移动光标到插入空格之后
                    setTimeout(() => {
                      e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
                    }, 0);
                  }
                }}
              />
            </div>
          ) : (
            <SyntaxHighlighter
              language={selectedLanguage}
              style={vscodeTheme}
              showLineNumbers={true}
              wrapLines={true}
              lineProps={lineNumber => ({
                style: { 
                  display: 'block', 
                  backgroundColor: lineNumber % 5 === 0 ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  position: 'relative',
                },
                className: 'relative',
              })}
              customStyle={{
                margin: 0,
                borderRadius: 0,
                height: '100%',
                fontSize: '14px',
                border: 'none',
              }}
            >
              {editableCode}
            </SyntaxHighlighter>
          )}

          {/* VSCode风格的底部状态栏 */}
          <div className="absolute bottom-0 left-0 right-0 h-6 bg-[#007acc] text-white flex items-center justify-between text-xs px-3">
            <div className="flex items-center space-x-4">
              <span>{selectedLanguage.toUpperCase()}</span>
              <span>编码: UTF-8</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>行数: {editableCode.split('\n').length}</span>
              <span>{isEditing ? '编辑中' : '只读模式'}</span>
            </div>
          </div>
        </div>
        
        {/* 输出区域 - 仅当语言是Python时显示 */}
        {(selectedLanguage === 'python' || selectedLanguage === 'py') && (
          <div className="h-1/3 min-h-[150px] border-t border-[#3c3c3c] bg-[#1e1e1e] flex flex-col">
            <div className="bg-[#252526] py-1 px-4 text-xs text-gray-300 border-b border-[#3c3c3c] flex justify-between items-center">
              <div className="flex items-center">
                <svg className="mr-2" width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9h12v7H6V9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M7 4h10l2 5H5l2-5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 16v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 19h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>终端输出</span>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setPythonOutput('')}
                  className="text-gray-400 hover:text-white text-xs flex items-center"
                  title="清空输出"
                >
                  <svg className="mr-1" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  清空
                </button>
                <button 
                  onClick={runPythonCode}
                  disabled={pyodideLoading || executing}
                  className={`text-gray-300 hover:text-white flex items-center text-xs ${pyodideLoading || executing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="重新运行"
                >
                  <svg className="mr-1" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 3l14 9-14 9V3z" fill="currentColor" />
                  </svg>
                  重新运行
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-2 font-mono bg-[#1e1e1e] relative">
              {pyodideLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e] bg-opacity-80">
                  <div className="flex flex-col items-center">
                    <div className="mb-2">
                      <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <div className="text-yellow-400 font-mono text-sm">正在加载Python解释器...</div>
                  </div>
                </div>
              ) : executing ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[#1e1e1e] bg-opacity-80">
                  <div className="flex flex-col items-center">
                    <div className="mb-2">
                      <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    <div className="text-green-400 font-mono text-sm">执行中...</div>
                  </div>
                </div>
              ) : null}
              
              {error ? (
                <div className="text-red-400 p-2 whitespace-pre-wrap font-mono text-sm border-l-2 border-red-500 bg-opacity-20 bg-red-900">
                  {error}
                </div>
              ) : pythonOutput ? (
                <div className="text-white p-2 whitespace-pre-wrap font-mono text-sm">
                  <pre className="text-white whitespace-pre-wrap">{pythonOutput}</pre>
                </div>
              ) : (
                <div className="text-gray-500 p-2 flex flex-col items-center justify-center h-full">
                  <svg className="mb-2" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 3l14 9-14 9V3z" fill="currentColor" />
                  </svg>
                  <span>点击"运行"按钮执行代码...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CanvasMode; 