"""
Flask应用主文件
"""

import os
import json
from typing import Dict, Any, List
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS

from config import Config
from models.factory import ModelFactory
from models.base import ModelInterface

# 创建Flask应用
app = Flask(__name__)
app.config['SECRET_KEY'] = Config.SECRET_KEY

# 配置CORS
CORS(app, resources={r"/*": {"origins": Config.CORS_ORIGINS}})

# 模型实例缓存，避免重复创建
model_instances: Dict[str, ModelInterface] = {}

def get_model(model_type: str = None, model_name: str = None) -> ModelInterface:
    """获取或创建模型实例
    
    Args:
        model_type: 模型类型
        model_name: 模型名称
        
    Returns:
        模型实例
    """
    model_type = model_type or Config.DEFAULT_MODEL_TYPE
    
    # 如果指定了模型名称，则获取对应配置
    config = Config.get_model_config(model_type)
    if model_name:
        config['model'] = model_name
    
    # 生成缓存键
    cache_key = f"{model_type}_{config['model']}"
    
    # 如果缓存中没有，则创建新实例
    if cache_key not in model_instances:
        try:
            model_instances[cache_key] = ModelFactory.create_model(model_type, **config)
        except Exception as e:
            app.logger.error(f"创建模型实例失败: {str(e)}")
            raise
    
    return model_instances[cache_key]


@app.route('/api/chat', methods=['POST'])
def chat():
    """聊天API
    
    请求体:
    {
        "messages": [{"role": "user", "content": "你好"}],
        "model_type": "ollama",
        "model_name": "qwen2.5-coder",
        "stream": true,
        "temperature": 0.7,
        "max_tokens": 1000
    }
    
    响应:
    - 非流式: {"model": "...", "content": "...", ...}
    - 流式: 使用SSE
    """
    try:
        data = request.json
        
        if not data:
            return jsonify({"error": "请求体为空"}), 400
        
        if "messages" not in data or not isinstance(data["messages"], list):
            return jsonify({"error": "messages字段缺失或格式错误"}), 400
        
        # 获取参数
        messages = data["messages"]
        model_type = data.get("model_type", Config.DEFAULT_MODEL_TYPE)
        model_name = data.get("model_name")
        stream = data.get("stream", True)  # 默认使用流式传输
        temperature = data.get("temperature", 0.7)
        max_tokens = data.get("max_tokens")
        
        # 获取模型实例
        model = get_model(model_type, model_name)
        
        # 聊天参数
        chat_params = {
            "temperature": temperature,
        }
        
        if max_tokens:
            chat_params["max_tokens"] = max_tokens
        
        # 根据是否流式传输选择不同的处理方式
        if stream:
            # 使用Server-Sent Events进行流式传输
            def generate():
                try:
                    for chunk in model.chat_completion_stream(messages, **chat_params):
                        yield f"data: {json.dumps(chunk)}\n\n"
                except Exception as e:
                    error_msg = {"error": str(e)}
                    yield f"data: {json.dumps(error_msg)}\n\n"
                yield "data: [DONE]\n\n"
            
            return Response(
                stream_with_context(generate()),
                content_type='text/event-stream'
            )
        else:
            # 非流式处理
            response = model.chat_completion(messages, stream=False, **chat_params)
            return jsonify(response)
    
    except Exception as e:
        app.logger.error(f"处理请求时发生错误: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/models', methods=['GET'])
def list_models():
    """获取可用模型列表
    
    响应:
    {
        "default": {"type": "ollama", "name": "qwen2.5-coder", "provider": "Ollama"},
        "models": {
            "openai": [...],
            "anthropic": [...],
            "deepseek": [...],
            "ollama": [...]
        }
    }
    """
    try:
        models = ModelFactory.get_available_models()
        default_model = ModelFactory.get_default_model()
        
        return jsonify({
            "default": default_model,
            "models": models
        })
    except Exception as e:
        app.logger.error(f"获取模型列表时发生错误: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查
    
    响应:
    {"status": "ok", "version": "1.0.0"}
    """
    return jsonify({
        "status": "ok",
        "version": "1.0.0"
    })


if __name__ == '__main__':
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    ) 