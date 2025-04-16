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