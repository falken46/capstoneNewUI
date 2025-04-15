# AI聊天后端服务

这是一个基于Python Flask的AI聊天后端服务，支持多种AI模型API，包括OpenAI(ChatGPT)、Anthropic(Claude)、DeepSeek以及本地部署的Ollama模型。

## 特性

- 支持多种AI模型API：
  - OpenAI (ChatGPT)
  - Anthropic Claude
  - DeepSeek
  - 本地部署的Ollama模型 (如qwen2.5-coder, llama3等)
- 默认使用qwen2.5-coder模型
- 支持流式传输响应
- 统一的API接口，便于前端集成
- 可通过环境变量配置

## 安装

1. 安装依赖项：

```bash
pip install -r requirements.txt
```

2. 配置环境变量：

从示例文件创建`.env`配置文件：

```bash
cp .env.example .env
```

然后编辑`.env`文件，填入您的API密钥和其他配置。

## 使用方法

### 启动服务

```bash
python app.py
```

服务默认在`http://0.0.0.0:5000`启动。

### API接口

#### 1. 发送聊天请求

```
POST /api/chat
```

请求体：

```json
{
    "messages": [{"role": "user", "content": "你好"}],
    "model_type": "ollama",  // 可选，默认使用配置的DEFAULT_MODEL_TYPE
    "model_name": "qwen2.5-coder",  // 可选，默认使用配置的对应类型的模型
    "stream": true,  // 可选，默认为true，使用流式传输
    "temperature": 0.7,  // 可选，默认为0.7
    "max_tokens": 1000  // 可选
}
```

#### 2. 获取可用模型列表

```
GET /api/models
```

#### 3. 健康检查

```
GET /api/health
```

## 本地Ollama模型配置

要使用本地Ollama模型，需要先安装Ollama并拉取所需模型：

1. 安装Ollama: [https://ollama.com/download](https://ollama.com/download)

2. 拉取模型：

```bash
# 拉取qwen2.5-coder模型
ollama pull qwen2.5-coder

# 拉取llama3模型
ollama pull llama3
```

3. 启动Ollama服务：

```bash
ollama serve
```

确保Ollama服务运行在`http://localhost:11434`(默认端口)。如有变化，请在`.env`文件中修改`OLLAMA_API_BASE`。

## 配置选项

所有配置选项都可以在`.env`文件中设置：

- `FLASK_DEBUG`: 是否启用调试模式
- `FLASK_HOST`: 监听的主机地址
- `FLASK_PORT`: 监听的端口
- `OPENAI_API_KEY`: OpenAI API密钥
- `ANTHROPIC_API_KEY`: Anthropic API密钥
- `DEEPSEEK_API_KEY`: DeepSeek API密钥
- `DEFAULT_MODEL_TYPE`: 默认模型类型，可选值：openai, anthropic, deepseek, ollama
- `DEFAULT_MODEL_NAME`: 默认模型名称

## 与前端集成

本后端设计为与前端无缝集成。前端可以通过API接口发送请求并接收响应，特别是流式传输使用了SSE(Server-Sent Events)标准，便于前端处理实时更新。

## 后端服务

后端API服务，为前端提供聊天、调试和其他功能。

## 功能特性

- 聊天API接口
- 多模型支持（OpenAI、Anthropic、Deepseek、Ollama）
- 调试工作流（Debug Workflow）
- CORS支持
- 健康检查

## 环境配置

通过`.env`文件或环境变量配置应用：

```
# 基本配置
FLASK_DEBUG=True  # 开发模式
FLASK_HOST=0.0.0.0  # 监听地址
FLASK_PORT=5002  # 端口号 (注意: macOS上避免使用5000端口，已被AirPlay占用)
SECRET_KEY=your-secret-key
CORS_ORIGINS=*  # CORS来源

# API密钥
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
DEEPSEEK_API_KEY=your-deepseek-key

# API地址 (可选)
OPENAI_API_BASE=
ANTHROPIC_API_BASE=
DEEPSEEK_API_BASE=https://api.deepseek.com/v1
OLLAMA_API_BASE=http://localhost:11434

# 默认模型
DEFAULT_MODEL_TYPE=ollama
DEFAULT_MODEL_NAME=qwen2.5-coder
```

## 运行应用

```bash
python run.py
```

或使用临时环境变量：

```bash
source temp_env.sh
python run.py
```

## API接口

### 调试工作流

分析并调试代码问题。

- **端点**: `/api/debug/workflow`
- **方法**: POST
- **请求体**:
  ```json
  {
    "content": "代码或问题内容",
    "stream": true,  // 可选，默认为true
    "model_type": "ollama",  // 可选
    "model_name": "qwen2.5-coder"  // 可选
  }
  ```
- **响应**:
  - 非流式: JSON对象，包含完整结果
  - 流式: Server-Sent Events (SSE)格式的事件流

### 健康检查

- **端点**: `/api/health`
- **方法**: GET
- **响应**: `{"status": "ok", "version": "1.0.0"}`

## 常见问题

### CORS 403错误

如果遇到403 Forbidden错误，可能的原因：

1. **端口冲突**: macOS上端口5000被AirPlay服务占用，导致Flask应用无法正常启动
   - 解决方案: 修改`FLASK_PORT`环境变量，使用其他端口如5002

2. **CORS配置问题**: 
   - 确保已配置CORS: `CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})`
   - 检查响应头是否包含正确的CORS头部

3. **API服务器未运行**:
   - 运行`python run.py`启动服务器
   - 查看日志确认启动成功

### 调试工具

使用以下脚本测试CORS和API功能：

```bash
./cors_test.sh -t api -a 5002
```

更多选项请查看`./cors_test.sh -h` 