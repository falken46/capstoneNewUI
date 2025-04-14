"""
Ollama模型接口实现
支持本地部署的模型如qwen2.5-coder, llama3等
"""

from typing import Dict, Any, List, Generator, Optional
import os
import json
import requests
from requests.exceptions import RequestException

from models.base import ModelInterface


class OllamaModel(ModelInterface):
    """Ollama模型接口实现"""
    
    def __init__(self, api_key: Optional[str] = None, **kwargs):
        """初始化Ollama模型
        
        Args:
            api_key: 不需要API密钥，保留此参数是为了与其他模型接口一致
            **kwargs: 其他参数
                - base_url: Ollama API基础URL，默认为http://localhost:11434
                - model: 模型名称，默认为qwen2.5-coder
                - timeout: 超时时间，默认为60秒
        """
        self.base_url = kwargs.get("base_url", "http://localhost:11434")
        self.model = kwargs.get("model", "qwen2.5-coder")
        self.timeout = kwargs.get("timeout", 60)
        
        # 检查Ollama服务是否可用
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=self.timeout)
            response.raise_for_status()
        except RequestException as e:
            raise ConnectionError(f"无法连接到Ollama服务 ({self.base_url}): {str(e)}")
    
    def chat_completion(self, 
                      messages: List[Dict[str, str]], 
                      stream: bool = False,
                      **kwargs) -> Dict[str, Any]:
        """非流式聊天完成
        
        Args:
            messages: 消息列表，格式为[{"role": "user", "content": "你好"}, ...]
            stream: 是否使用流式传输
            **kwargs: 其他参数
                - temperature: 温度，默认为0.7
                - max_tokens: 最大token数，默认为None
                - model: 模型名称，默认为初始化时的model
        """
        if stream:
            return self.chat_completion_stream(messages, **kwargs)
        
        model = kwargs.get("model", self.model)
        temperature = kwargs.get("temperature", 0.7)
        
        # Ollama API请求参数
        request_data = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature
            }
        }
        
        # 添加max_tokens如果提供
        if "max_tokens" in kwargs:
            request_data["options"]["num_predict"] = kwargs["max_tokens"]
        
        # 发送请求到Ollama API
        try:
            response = requests.post(
                f"{self.base_url}/api/chat",
                json=request_data,
                timeout=self.timeout
            )
            response.raise_for_status()
            result = response.json()
            
            return {
                "model": model,
                "content": result["message"]["content"],
                "finish_reason": result.get("done", True) and "stop" or "length",
                "usage": {
                    "prompt_tokens": result.get("prompt_eval_count", 0),
                    "completion_tokens": result.get("eval_count", 0),
                    "total_tokens": result.get("prompt_eval_count", 0) + result.get("eval_count", 0)
                }
            }
        except RequestException as e:
            raise Exception(f"调用Ollama API失败: {str(e)}")
    
    def chat_completion_stream(self, 
                             messages: List[Dict[str, str]], 
                             **kwargs) -> Generator[Dict[str, Any], None, None]:
        """流式聊天完成
        
        Args:
            messages: 消息列表，格式为[{"role": "user", "content": "你好"}, ...]
            **kwargs: 其他参数
                - temperature: 温度，默认为0.7
                - max_tokens: 最大token数，默认为None
                - model: 模型名称，默认为初始化时的model
        """
        model = kwargs.get("model", self.model)
        temperature = kwargs.get("temperature", 0.7)
        
        # Ollama API请求参数
        request_data = {
            "model": model,
            "messages": messages,
            "stream": True,
            "options": {
                "temperature": temperature
            }
        }
        
        # 添加max_tokens如果提供
        if "max_tokens" in kwargs:
            request_data["options"]["num_predict"] = kwargs["max_tokens"]
        
        # 发送流式请求到Ollama API
        try:
            response = requests.post(
                f"{self.base_url}/api/chat",
                json=request_data,
                stream=True,
                timeout=self.timeout
            )
            response.raise_for_status()
            
            for line in response.iter_lines():
                if line:
                    try:
                        chunk = json.loads(line)
                        if "message" in chunk and chunk["message"]["content"]:
                            yield {
                                "model": model,
                                "content": chunk["message"]["content"],
                                "finish_reason": None
                            }
                    except json.JSONDecodeError:
                        pass
        except RequestException as e:
            raise Exception(f"调用Ollama API流式传输失败: {str(e)}")
    
    def get_model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        return {
            "name": self.model,
            "type": "ollama",
            "provider": "Ollama" 
        }
        
    def get_available_models(self) -> List[Dict[str, Any]]:
        """获取可用的本地模型列表"""
        try:
            response = requests.get(f"{self.base_url}/api/tags", timeout=self.timeout)
            response.raise_for_status()
            result = response.json()
            
            models = []
            for model in result.get("models", []):
                models.append({
                    "name": model["name"],
                    "type": "ollama",
                    "provider": "Ollama",
                    "size": model.get("size", 0),
                    "modified_at": model.get("modified_at", "")
                })
            
            return models
        except RequestException as e:
            raise Exception(f"获取Ollama模型列表失败: {str(e)}") 