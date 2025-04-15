"""
OpenAI模型接口实现
"""

from typing import Dict, Any, List, Generator, Optional
import os

try:
    from openai import OpenAI
except ImportError:
    raise ImportError("请安装openai包: pip install openai")

from models.base import ModelInterface


class OpenAIModel(ModelInterface):
    """OpenAI/ChatGPT模型接口实现"""
    
    def __init__(self, api_key: Optional[str] = None, **kwargs):
        """初始化OpenAI模型
        
        Args:
            api_key: OpenAI API密钥，如果为None则从环境变量OPENAI_API_KEY获取
            **kwargs: 其他参数
                - base_url: API基础URL，默认为官方API
                - model: 模型名称，默认为gpt-3.5-turbo
                - timeout: 超时时间，默认为60秒
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API密钥未提供，请设置OPENAI_API_KEY环境变量或通过api_key参数传入")
        
        self.base_url = kwargs.get("base_url")
        self.model = kwargs.get("model", "gpt-3.5-turbo")
        self.timeout = kwargs.get("timeout", 60)
        
        client_kwargs = {"api_key": self.api_key, "timeout": self.timeout}
        if self.base_url:
            client_kwargs["base_url"] = self.base_url
            
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
            "type": "openai",
            "provider": "OpenAI" 
        } 