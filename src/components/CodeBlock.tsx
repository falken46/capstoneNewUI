import React, { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import pyodideService, { ExecutionResult } from '../utils/pyodideService';
import OutputBox from './OutputBox';

interface CodeBlockProps {
  code: string;
}

/**
 * 代码块组件
 * 显示Python代码并提供运行功能
 */
const CodeBlock: React.FC<CodeBlockProps> = ({ code }) => {
  const [codeValue, setCodeValue] = useState<string>(code);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [showOutput, setShowOutput] = useState<boolean>(false);
  const [hasRun, setHasRun] = useState<boolean>(false);

  // 运行代码
  const runCode = async () => {
    if (isRunning) return;
    
    setIsRunning(true);
    setShowOutput(true);
    setHasRun(true);
    
    try {
      const result = await pyodideService.runPythonCode(codeValue);
      setResult(result);
    } catch (error) {
      console.error('运行代码时出错:', error);
      setResult({
        output: '',
        error: `运行错误: ${error instanceof Error ? error.message : String(error)}`,
        hasError: true
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="code-block my-4 border border-gray-700 rounded-lg overflow-hidden bg-[#1e1e1e] transition-shadow duration-300 hover:shadow-lg">
      {/* 代码编辑器头部 */}
      <div className="flex justify-between items-center px-4 py-2 bg-[#252525] border-b border-gray-700">
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <div className="text-gray-300 text-sm font-medium">Python</div>
        </div>
        <div className="flex space-x-2">
          {hasRun && !showOutput && (
            <button
              onClick={() => setShowOutput(true)}
              className="flex items-center text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 py-1 px-2 rounded transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <polyline points="7 13 12 18 17 13"></polyline>
                <polyline points="7 6 12 11 17 6"></polyline>
              </svg>
              查看输出
            </button>
          )}
          <button
            onClick={runCode}
            disabled={isRunning}
            className={`flex items-center text-xs ${
              isRunning 
                ? 'bg-indigo-700 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500'
            } text-white py-1 px-3 rounded transition-colors`}
          >
            {isRunning ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                运行中...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
                运行
              </>
            )}
          </button>
        </div>
      </div>

      {/* 代码编辑器 */}
      <div className="border-b border-gray-700">
        <CodeMirror
          value={codeValue}
          height="auto"
          theme="dark"
          extensions={[python()]}
          onChange={(value) => setCodeValue(value)}
          className="code-mirror-wrapper"
        />
      </div>

      {/* 输出框 */}
      {result && (
        <OutputBox
          output={result.output}
          error={result.error}
          isVisible={showOutput}
          onClose={() => setShowOutput(false)}
        />
      )}
    </div>
  );
};

export default CodeBlock; 