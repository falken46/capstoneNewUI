// 定义Pyodide接口
interface PyodideInterface {
  runPython: (code: string) => any;
  globals: any;
  loadPackagesFromImports: (code: string) => Promise<void>;
}

// 扩展全局Window接口，以便TypeScript能理解loadPyodide
declare global {
  interface Window {
    loadPyodide: (config?: { indexURL?: string }) => Promise<PyodideInterface>;
  }
}

// 定义执行结果接口
export interface ExecutionResult {
  output: string;
  error: string | null;
  hasError: boolean;
}

// Pyodide 服务类，用于加载和执行 Python 代码
class PyodideService {
  private pyodide: PyodideInterface | null = null;
  private isLoading: boolean = false;
  private loadingPromise: Promise<PyodideInterface> | null = null;

  // 初始化 Pyodide
  async initPyodide(): Promise<PyodideInterface> {
    if (this.pyodide) {
      return this.pyodide;
    }

    if (this.isLoading && this.loadingPromise) {
      return this.loadingPromise;
    }

    this.isLoading = true;
    
    try {
      // 如果还没有加载Pyodide脚本，先加载脚本
      if (!window.loadPyodide) {
        await this.loadPyodideScript();
      }
      
      // 创建加载Promise
      this.loadingPromise = window.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/',
      });
      
      // 等待加载完成
      this.pyodide = await this.loadingPromise;
      
      return this.pyodide;
    } catch (error) {
      console.error('Failed to load Pyodide:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }
  
  // 加载Pyodide脚本
  private loadPyodideScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Pyodide script'));
      document.head.appendChild(script);
    });
  }

  // 执行 Python 代码
  async runPythonCode(code: string): Promise<ExecutionResult> {
    let pyodide: PyodideInterface;
    
    try {
      // 确保 Pyodide 已初始化
      pyodide = await this.initPyodide();
      
      // 设置捕获输出的代码
      pyodide.runPython(`
import sys
from io import StringIO

class CaptureOutput:
    def __init__(self):
        self.stdout = StringIO()
        self.stderr = StringIO()
        self.original_stdout = sys.stdout
        self.original_stderr = sys.stderr
        
    def __enter__(self):
        sys.stdout = self.stdout
        sys.stderr = self.stderr
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        sys.stdout = self.original_stdout
        sys.stderr = self.original_stderr

_capture = CaptureOutput()
      `);
      
      // 运行用户代码并捕获输出
      try {
        // 尝试加载代码中导入的包
        await pyodide.loadPackagesFromImports(code);
        
        // 确保代码的缩进正确 - 将用户代码作为一个独立的代码块执行
        pyodide.runPython(`
with _capture:
    exec('''
${code}
    ''')
        `);
        
        // 获取捕获的输出
        const stdout = pyodide.runPython('_capture.stdout.getvalue()').toString();
        const stderr = pyodide.runPython('_capture.stderr.getvalue()').toString();
        
        return {
          output: stdout,
          error: stderr || null,
          hasError: !!stderr,
        };
      } catch (error) {
        // 处理执行错误
        return {
          output: '',
          error: error instanceof Error ? error.message : String(error),
          hasError: true,
        };
      }
    } catch (error) {
      // 处理 Pyodide 加载错误
      return {
        output: '',
        error: `Pyodide 初始化错误: ${error instanceof Error ? error.message : String(error)}`,
        hasError: true,
      };
    }
  }
}

// 创建单例实例
const pyodideService = new PyodideService();
export default pyodideService; 