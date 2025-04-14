"""
DeepSeek模型接口实现
"""

from typing import Dict, Any, List, Generator, Optional
import os

try:
    from openai import OpenAI
except ImportError:
    raise ImportError("请安装openai包: pip install openai")

from models.base import ModelInterface


class DeepseekModel(ModelInterface):
    """DeepSeek模型接口实现
    
    注意: DeepSeek API与OpenAI API兼容，因此使用OpenAI客户端
    """
    
    def __init__(self, api_key: Optional[str] = None, **kwargs):
        """初始化DeepSeek模型
        
        Args:
            api_key: DeepSeek API密钥，如果为None则从环境变量DEEPSEEK_API_KEY获取
            **kwargs: 其他参数
                - base_url: API基础URL，默认为DeepSeek官方API: https://api.deepseek.com/v1
                - model: 模型名称，默认为deepseek-chat
                - timeout: 超时时间，默认为60秒
        """
        self.api_key = api_key or os.getenv("DEEPSEEK_API_KEY")
        if not self.api_key:
            raise ValueError("DeepSeek API密钥未提供，请设置DEEPSEEK_API_KEY环境变量或通过api_key参数传入")
        
        self.base_url = kwargs.get("base_url", "https://api.deepseek.com/v1")
        self.model = kwargs.get("model", "deepseek-chat")
        self.timeout = kwargs.get("timeout", 60)
        
        client_kwargs = {
            "api_key": self.api_key, 
            "base_url": self.base_url,
            "timeout": self.timeout
        }
            
        self.client = OpenAI(**client_kwargs)
    
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
        model = kwargs.get("model", self.model)
        temperature = kwargs.get("temperature", 0.7)
        max_tokens = kwargs.get("max_tokens")
        
        completion_kwargs = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": stream
        }
        
        if max_tokens:
            completion_kwargs["max_tokens"] = max_tokens
        
        if stream:
            return self.chat_completion_stream(messages, **kwargs)
        
        response = self.client.chat.completions.create(**completion_kwargs)
        
        return {
            "model": model,
            "content": response.choices[0].message.content,
            "finish_reason": response.choices[0].finish_reason,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
                "total_tokens": response.usage.total_tokens
            }
        }
    
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
        max_tokens = kwargs.get("max_tokens")
        
        completion_kwargs = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "stream": True
        }
        
        if max_tokens:
            completion_kwargs["max_tokens"] = max_tokens
        
        response_stream = self.client.chat.completions.create(**completion_kwargs)
        
        for chunk in response_stream:
            if chunk.choices[0].delta.content:
                yield {
                    "model": model,
                    "content": chunk.choices[0].delta.content,
                    "finish_reason": chunk.choices[0].finish_reason
                }
    
    def get_model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        return {
            "name": self.model,
            "type": "deepseek",
            "provider": "DeepSeek" 
        } 