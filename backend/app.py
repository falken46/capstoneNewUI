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
from workflows import run_workflow

# 定义data.json文件的绝对路径
DATA_FILE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.json')

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

@app.route('/api/debug/workflow', methods=['POST'])
def debug_workflow():
    """调试工作流
    
    请求体:
    {
        "content": "代码或问题内容",
        "stream": true, // 可选，默认为true
        "model_type": "ollama", // 可选，用于LLM调用的模型类型
        "model_name": "qwen2.5-coder" // 可选，用于LLM调用的模型名称
    }
    
    响应:
    - 非流式: 返回完整的工作流结果
    - 流式: 使用SSE逐步返回工作流步骤的结果
    """
    try:
        data = request.json
        
        if not data:
            return jsonify({"error": "请求体为空"}), 400
        
        if "content" not in data:   
            return jsonify({"error": "content字段缺失"}), 400
        
        # 获取参数
        content = data["content"]
        model_type = data.get("model_type", Config.DEFAULT_MODEL_TYPE)
        model_name = data.get("model_name")
        stream = data.get("stream", True)  # 默认使用流式传输

        app.logger.info(f"接收到调试工作流请求: content长度={len(content)}, model_type={model_type}, model_name={model_name}")

        # 获取模型实例
        model = get_model(model_type, model_name)
            
        # 根据是否流式传输选择不同的处理方式
        if stream:
            # 使用Server-Sent Events进行流式传输
            def generate():
                try:
                    for event_data in run_workflow(model, content, stream=True):
                        # 输出调试信息
                        app.logger.debug(f"工作流事件: {event_data.get('event_name')}, 状态: {event_data.get('status')}")
                                
                        # 返回事件数据
                        yield f"data: {json.dumps(event_data)}\n\n"
                except Exception as e:
                    app.logger.error(f"工作流执行出错: {str(e)}")
                    error_msg = {"error": str(e), "event_name": "error", "status": "error", "content": str(e)}
                    yield f"data: {json.dumps(error_msg)}\n\n"
                finally:
                    app.logger.info("调试工作流完成")
                    yield "data: {\"event_name\": \"done\", \"status\": \"done\", \"content\": \"\"}\n\n"
            
            return Response(
                stream_with_context(generate()),
                content_type='text/event-stream'
            )
        else:
            # 非流式处理，收集所有结果
            results = []
            try:
                for event_data in run_workflow(model, content, stream=False):
                    results.append(event_data)
                
                return jsonify({"results": results})
            except Exception as e:
                app.logger.error(f"非流式工作流执行出错: {str(e)}")
                return jsonify({"error": str(e), "event_name": "error", "status": "error", "content": str(e)}), 500
    
    except Exception as e:
        app.logger.error(f"执行调试工作流时发生错误: {str(e)}")
        return jsonify({"error": str(e), "event_name": "error", "status": "error", "content": str(e)}), 500


@app.route('/api/save_chat', methods=['POST'])
def save_chat():
    """保存聊天记录
    
    请求体:
    {
        "chat_id": "聊天ID", // 必填参数，由前端生成
        "title": "聊天标题", // 可选，提取自第一条用户消息
        "messages": [{"role": "user", "content": "..."}, ...]
    }
    
    响应:
    {"success": true, "chat_id": "聊天ID"}
    """
    try:
        data = request.json
        
        if not data:
            return jsonify({"error": "请求体为空"}), 400
        
        if "messages" not in data or not isinstance(data["messages"], list) or len(data["messages"]) == 0:
            return jsonify({"error": "messages字段缺失或格式错误"}), 400
        
        # 获取参数
        messages = data["messages"]
        chat_id = data.get("chat_id")
        
        # 确保chat_id存在
        if not chat_id:
            return jsonify({"error": "chat_id字段缺失，前端必须提供chat_id"}), 400
        
        # 如果没有提供标题，则从第一条用户消息中提取
        title = data.get("title")
        if not title:
            for msg in messages:
                if msg.get("role") == "user":
                    # 限制标题长度为50个字符
                    title = msg.get("content", "")[:50]
                    if len(msg.get("content", "")) > 50:
                        title += "..."
                    break
        
        if not title:
            title = f"聊天 {chat_id[:8]}"
        
        # 读取现有数据
        chat_data = {}
        try:
            if os.path.exists(DATA_FILE_PATH) and os.path.getsize(DATA_FILE_PATH) > 0:
                with open(DATA_FILE_PATH, 'r', encoding='utf-8') as f:
                    chat_data = json.load(f)
        except Exception as e:
            app.logger.warning(f"读取data.json出错: {str(e)}")
            chat_data = {}
        
        # 确保chats键存在
        if "chats" not in chat_data:
            chat_data["chats"] = {}
        
        # 添加或更新聊天记录
        chat_data["chats"][chat_id] = {
            "id": chat_id,
            "title": title,
            "timestamp": int(__import__('time').time()),
            "messages": messages
        }
        
        # 写入数据
        with open(DATA_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(chat_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            "success": True,
            "chat_id": chat_id
        })
    
    except Exception as e:
        app.logger.error(f"保存聊天记录时发生错误: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/chats', methods=['GET'])
def list_chats():
    """获取聊天记录列表
    
    响应:
    {
        "chats": [
            {"id": "聊天ID", "title": "聊天标题", "timestamp": 1627984321}
        ]
    }
    """
    try:
        # 读取现有数据
        chat_data = {}
        try:
            if os.path.exists(DATA_FILE_PATH) and os.path.getsize(DATA_FILE_PATH) > 0:
                with open(DATA_FILE_PATH, 'r', encoding='utf-8') as f:
                    chat_data = json.load(f)
        except Exception as e:
            app.logger.warning(f"读取data.json出错: {str(e)}")
            return jsonify({"chats": []}), 200
        
        # 如果chats键不存在，返回空列表
        if "chats" not in chat_data:
            return jsonify({"chats": []}), 200
        
        # 提取聊天概要信息
        chat_summaries = []
        for chat_id, chat_info in chat_data["chats"].items():
            chat_summaries.append({
                "id": chat_id,
                "title": chat_info.get("title", f"聊天 {chat_id}"),
                "timestamp": chat_info.get("timestamp", 0)
            })
        
        # 按时间戳倒序排序
        chat_summaries.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return jsonify({"chats": chat_summaries})
    
    except Exception as e:
        app.logger.error(f"获取聊天记录列表时发生错误: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/chats/<chat_id>', methods=['GET'])
def get_chat(chat_id):
    """获取单个聊天记录详情
    
    响应:
    {
        "id": "聊天ID",
        "title": "聊天标题",
        "timestamp": 1627984321,
        "messages": [{"role": "user", "content": "..."}, ...]
    }
    """
    try:
        # 读取现有数据
        chat_data = {}
        try:
            if os.path.exists(DATA_FILE_PATH) and os.path.getsize(DATA_FILE_PATH) > 0:
                with open(DATA_FILE_PATH, 'r', encoding='utf-8') as f:
                    chat_data = json.load(f)
        except Exception as e:
            app.logger.warning(f"读取data.json出错: {str(e)}")
            return jsonify({"error": "聊天记录不存在"}), 404
        
        # 如果chats键不存在或聊天ID不存在，返回404
        if "chats" not in chat_data or chat_id not in chat_data["chats"]:
            return jsonify({"error": "聊天记录不存在"}), 404
        
        return jsonify(chat_data["chats"][chat_id])
    
    except Exception as e:
        app.logger.error(f"获取聊天记录详情时发生错误: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/chats/<chat_id>', methods=['DELETE'])
def delete_chat(chat_id):
    """删除单个聊天记录
    
    响应:
    {"success": true}
    """
    try:
        # 读取现有数据
        chat_data = {}
        try:
            if os.path.exists(DATA_FILE_PATH) and os.path.getsize(DATA_FILE_PATH) > 0:
                with open(DATA_FILE_PATH, 'r', encoding='utf-8') as f:
                    chat_data = json.load(f)
        except Exception as e:
            app.logger.warning(f"读取data.json出错: {str(e)}")
            return jsonify({"error": "聊天记录不存在"}), 404
        
        # 如果chats键不存在或聊天ID不存在，返回404
        if "chats" not in chat_data or chat_id not in chat_data["chats"]:
            return jsonify({"error": "聊天记录不存在"}), 404
        
        # 删除聊天记录
        del chat_data["chats"][chat_id]
        
        # 写入数据
        with open(DATA_FILE_PATH, 'w', encoding='utf-8') as f:
            json.dump(chat_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({"success": True})
    
    except Exception as e:
        app.logger.error(f"删除聊天记录时发生错误: {str(e)}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    ) 