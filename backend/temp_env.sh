#!/bin/bash
# 临时环境变量设置脚本

export FLASK_PORT=5002
export FLASK_DEBUG=True

# 使用说明
echo "临时环境变量已设置:"
echo "FLASK_PORT=5002"
echo "FLASK_DEBUG=True"
echo ""
echo "现在运行: python run.py" 