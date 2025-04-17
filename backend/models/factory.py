"""
模型工厂类
用于根据配置创建不同的模型实例
"""

from typing import Dict, Any, Optional
import sys
import importlib

from models.base import ModelInterface

class ModelFactory:
    """模型工厂类"""
    
    @staticmethod
    def _load_model_class(model_type: str):
        """动态加载模型类
        
        Args:
            model_type: 模型类型名称
            
        Returns:
            模型类
        """
        try:
            module = importlib.import_module(f"models.{model_type}")
            
            # 正确处理各种模型类名
            model_class_names = {
                "openai": "OpenAIModel",
                "anthropic": "AnthropicModel",
                "deepseek": "DeepseekModel",
                "ollama": "OllamaModel"
            }
            
            if model_type in model_class_names:
                class_name = model_class_names[model_type]
            else:
                # 默认处理方式，用于新增模型
                class_name = f"{model_type.capitalize()}Model"
                
            return getattr(module, class_name)
        except (ImportError, AttributeError) as e:
            print(f"导入模型 {model_type} 失败: {e}", file=sys.stderr)
            raise
    
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
        supported_types = ['openai', 'anthropic', 'deepseek', 'ollama']
        
        if model_type not in supported_types:
            raise ValueError(f"不支持的模型类型: {model_type}，支持的类型有: {', '.join(supported_types)}")
        
        try:
            model_class = ModelFactory._load_model_class(model_type)
            return model_class(**kwargs)
        except Exception as e:
            print(f"创建模型 {model_type} 实例失败: {e}", file=sys.stderr)
            raise
    
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
            OllamaModel = ModelFactory._load_model_class("ollama")
            ollama_model = OllamaModel()
            ollama_models = ollama_model.get_available_models()
            models["ollama"] = ollama_models
        except Exception as e:
            print(f"获取Ollama模型列表失败: {e}", file=sys.stderr)
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
        from config import Config
        return {
            "type": Config.DEFAULT_MODEL_TYPE,
            "name": Config.DEFAULT_MODEL_NAME,
            "provider": "OpenAI" if Config.DEFAULT_MODEL_TYPE == "openai" else "Ollama"
        } 