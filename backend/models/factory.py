"""
模型工厂类
用于根据配置创建不同的模型实例
"""

from typing import Dict, Any, Optional

from models.base import ModelInterface
from models.openai import OpenAIModel
from models.anthropic import AnthropicModel
from models.deepseek import DeepseekModel
from models.ollama import OllamaModel


class ModelFactory:
    """模型工厂类"""
    
    @staticmethod
    def create_model(model_type: str, **kwargs) -> ModelInterface:
        """根据模型类型创建模型实例
        
        Args:
            model_type: 模型类型，支持 'openai', 'anthropic', 'deepseek', 'ollama'
            **kwargs: 传递给模型构造函数的参数
            
        Returns:
            ModelInterface实例
            
        Raises:
            ValueError: 如果模型类型不受支持
        """
        model_classes = {
            "openai": OpenAIModel,
            "anthropic": AnthropicModel,
            "deepseek": DeepseekModel,
            "ollama": OllamaModel
        }
        
        if model_type not in model_classes:
            raise ValueError(f"不支持的模型类型: {model_type}，支持的类型有: {', '.join(model_classes.keys())}")
        
        return model_classes[model_type](**kwargs)
    
    @staticmethod
    def get_available_models() -> Dict[str, Any]:
        """获取所有可用的模型信息
        
        Returns:
            包含所有支持模型的字典，按提供商分组
        """
        models = {
            "openai": [
                {"name": "gpt-3.5-turbo", "type": "openai", "provider": "OpenAI"},
                {"name": "gpt-4", "type": "openai", "provider": "OpenAI"},
                {"name": "gpt-4-turbo", "type": "openai", "provider": "OpenAI"},
                {"name": "gpt-4o", "type": "openai", "provider": "OpenAI"}
            ],
            "anthropic": [
                {"name": "claude-3-opus-20240229", "type": "anthropic", "provider": "Anthropic Claude"},
                {"name": "claude-3-sonnet-20240229", "type": "anthropic", "provider": "Anthropic Claude"},
                {"name": "claude-3-haiku-20240307", "type": "anthropic", "provider": "Anthropic Claude"}
            ],
            "deepseek": [
                {"name": "deepseek-chat", "type": "deepseek", "provider": "DeepSeek"},
                {"name": "deepseek-coder", "type": "deepseek", "provider": "DeepSeek"}
            ],
            "ollama": []
        }
        
        # 获取ollama模型列表
        try:
            ollama_model = OllamaModel()
            ollama_models = ollama_model.get_available_models()
            models["ollama"] = ollama_models
        except Exception:
            # 如果获取本地Ollama模型失败，添加默认模型
            models["ollama"] = [
                {"name": "qwen2.5-coder", "type": "ollama", "provider": "Ollama"},
                {"name": "llama3", "type": "ollama", "provider": "Ollama"},
                {"name": "mistral", "type": "ollama", "provider": "Ollama"}
            ]
        
        return models
    
    @staticmethod
    def get_default_model() -> Dict[str, Any]:
        """获取默认模型信息
        
        Returns:
            默认模型的配置
        """
        return {
            "type": "ollama",
            "name": "qwen2.5-coder",
            "provider": "Ollama"
        } 