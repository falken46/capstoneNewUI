"""
Anthropic Claude模型接口实现
"""

from typing import Dict, Any, List, Generator, Optional
import os

try:
    import anthropic
except ImportError:
    raise ImportError("请安装anthropic包: pip install anthropic")

from models.base import ModelInterface


class AnthropicModel(ModelInterface):
    """Anthropic Claude模型接口实现"""
    
    def __init__(self, api_key: Optional[str] = None, **kwargs):
        """初始化Anthropic模型
        
        Args:
            api_key: Anthropic API密钥，如果为None则从环境变量ANTHROPIC_API_KEY获取
            **kwargs: 其他参数
                - base_url: API基础URL，默认为官方API
                - model: 模型名称，默认为claude-3-sonnet-20240229
                - timeout: 超时时间，默认为60秒
        """
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("Anthropic API密钥未提供，请设置ANTHROPIC_API_KEY环境变量或通过api_key参数传入")
        
        self.model = kwargs.get("model", "claude-3-sonnet-20240229")
        self.timeout = kwargs.get("timeout", 60)
        
        client_kwargs = {"api_key": self.api_key}
        
        self.client = anthropic.Anthropic(**client_kwargs)
    
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
                - max_tokens: 最大token数，默认为1024
                - model: 模型名称，默认为初始化时的model
        """
        model = kwargs.get("model", self.model)
        temperature = kwargs.get("temperature", 0.7)
        max_tokens = kwargs.get("max_tokens", 1024)
        
        # Anthropic要求将messages转换为system和messages的格式
        system_message = ""
        formatted_messages = []
        
        for msg in messages:
            if msg["role"] == "system":
                system_message += msg["content"] + "\n"
            else:
                formatted_messages.append(msg)
        
        completion_kwargs = {
            "model": model,
            "messages": formatted_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        if system_message:
            completion_kwargs["system"] = system_message.strip()
            
        if stream:
            return self.chat_completion_stream(messages, **kwargs)
        
        response = self.client.messages.create(**completion_kwargs)
        
        return {
            "model": model,
            "content": response.content[0].text,
            "finish_reason": "stop" if response.stop_reason == "end_turn" else response.stop_reason,
            "usage": {
                "input_tokens": response.usage.input_tokens,
                "output_tokens": response.usage.output_tokens,
                "total_tokens": response.usage.input_tokens + response.usage.output_tokens
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
                - max_tokens: 最大token数，默认为1024
                - model: 模型名称，默认为初始化时的model
        """
        model = kwargs.get("model", self.model)
        temperature = kwargs.get("temperature", 0.7)
        max_tokens = kwargs.get("max_tokens", 1024)
        
        # Anthropic要求将messages转换为system和messages的格式
        system_message = ""
        formatted_messages = []
        
        for msg in messages:
            if msg["role"] == "system":
                system_message += msg["content"] + "\n"
            else:
                formatted_messages.append(msg)
        
        completion_kwargs = {
            "model": model,
            "messages": formatted_messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True
        }
        
        if system_message:
            completion_kwargs["system"] = system_message.strip()
        
        response_stream = self.client.messages.create(**completion_kwargs)
        
        for chunk in response_stream:
            if hasattr(chunk, "delta") and chunk.delta.text:
                yield {
                    "model": model,
                    "content": chunk.delta.text,
                    "finish_reason": None
                }
    
    def get_model_info(self) -> Dict[str, Any]:
        """获取模型信息"""
        return {
            "name": self.model,
            "type": "anthropic",
            "provider": "Anthropic Claude" 
        } 