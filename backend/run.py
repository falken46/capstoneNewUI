"""
启动脚本
"""

from app import app
from config import Config

if __name__ == "__main__":
    print(f"正在启动AI聊天后端服务，访问地址: http://{Config.HOST}:{Config.PORT}")
    app.run(
        host=Config.HOST,
        port=Config.PORT,
        debug=Config.DEBUG
    ) 