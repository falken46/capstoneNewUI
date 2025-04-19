"""
后端配置文件
"""

import os
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()


class Config:
    """后端配置类"""
    
    # Flask应用配置
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() in ('true', '1', 't')
    HOST = os.getenv('FLASK_HOST', '0.0.0.0')
    PORT = int(os.getenv('FLASK_PORT', '5000'))
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*')
    
    # API密钥
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')
    DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY', '')
    
    # API基础URL（可选，用于覆盖默认值）
    OPENAI_API_BASE = os.getenv('OPENAI_API_BASE', '')
    ANTHROPIC_API_BASE = os.getenv('ANTHROPIC_API_BASE', '')
    DEEPSEEK_API_BASE = os.getenv('DEEPSEEK_API_BASE', 'https://api.deepseek.com/v1')
    OLLAMA_API_BASE = os.getenv('OLLAMA_API_BASE', 'http://localhost:11434')
    
    # 默认模型配置
    DEFAULT_MODEL_TYPE = os.getenv('DEFAULT_MODEL_TYPE', 'ollama')
    DEFAULT_MODEL_NAME = os.getenv('DEFAULT_MODEL_NAME', 'qwen2.5-coder')
    
    @classmethod
    def get_model_config(cls, model_type: Optional[str] = None) -> Dict[str, Any]:
        """获取指定类型模型的配置
        
        Args:
            model_type: 模型类型，支持 'openai', 'anthropic', 'deepseek', 'ollama'
                       如果为None，则使用默认类型
        
        Returns:
            模型配置字典
        """
        model_type = model_type or cls.DEFAULT_MODEL_TYPE
        
        configs = {
            'openai': {
                'api_key': cls.OPENAI_API_KEY,
                'base_url': cls.OPENAI_API_BASE or None,
                'model': os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo')
            },
            'anthropic': {
                'api_key': cls.ANTHROPIC_API_KEY,
                'model': os.getenv('ANTHROPIC_MODEL', 'claude-3-sonnet-20240229')
            },
            'deepseek': {
                'api_key': cls.DEEPSEEK_API_KEY,
                'base_url': cls.DEEPSEEK_API_BASE,
                'model': os.getenv('DEEPSEEK_MODEL', 'deepseek-chat')
            },
            'ollama': {
                'base_url': cls.OLLAMA_API_BASE,
                'model': os.getenv('OLLAMA_MODEL', cls.DEFAULT_MODEL_NAME)
            }
        }
        
        return configs.get(model_type, configs['ollama']) 