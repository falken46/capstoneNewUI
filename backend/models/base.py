"""
基础模型接口类
所有模型实现必须继承此接口
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Generator, Optional


class ModelInterface(ABC):
    """模型接口基类"""
    
    @abstractmethod
    def __init__(self, api_key: Optional[str] = None, **kwargs):
        """初始化模型
        
        Args:
            api_key: API密钥
            **kwargs: 其他参数
        """
        pass
    
    @abstractmethod
    def chat_completion(self, 
                      messages: List[Dict[str, str]], 
                      stream: bool = True,
                      **kwargs) -> Dict[str, Any]:
        """非流式聊天完成
        
        Args:
            messages: 消息列表，格式为[{"role": "user", "content": "你好"}, ...]
            stream: 是否使用流式传输
            **kwargs: 其他参数如temperature等
            
        Returns:
            返回完整的回复内容
        """
        pass
    
    @abstractmethod
    def chat_completion_stream(self, 
                             messages: List[Dict[str, str]], 
                             **kwargs) -> Generator[Dict[str, Any], None, None]:
        """流式聊天完成
        
        Args:
            messages: 消息列表，格式为[{"role": "user", "content": "你好"}, ...]
            **kwargs: 其他参数如temperature等
            
        Returns:
            返回生成器，每次产生一个token
        """
        pass
    
    @abstractmethod
    def get_model_info(self) -> Dict[str, Any]:
        """获取模型信息
        
        Returns:
            返回模型信息，包括名称、类型等
        """
        pass 