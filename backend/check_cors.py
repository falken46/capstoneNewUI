#!/usr/bin/env python
"""
CORS 配置检查工具
用于诊断 403 错误问题
"""

from flask import Flask, jsonify, request, Response
from flask_cors import CORS
import argparse
import os
import logging

# 设置日志
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# 创建应用
app = Flask(__name__)

# 显示请求信息的中间件
@app.before_request
def log_request_info():
    logger.debug("请求头:")
    for header, value in request.headers.items():
        logger.debug(f"  {header}: {value}")
    
    logger.debug(f"请求方法: {request.method}")
    logger.debug(f"请求路径: {request.path}")
    logger.debug(f"请求参数: {request.args}")
    
    if request.is_json:
        logger.debug(f"请求JSON: {request.json}")

# 健康检查接口
@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "cors_config": "enabled"})

# 模拟调试工作流接口
@app.route("/api/debug/workflow", methods=["POST"])
def debug_workflow_mock():
    if not request.is_json:
        return jsonify({"error": "需要 JSON 格式的请求体"}), 400
    
    # 获取请求数据
    data = request.json
    content = data.get("content", "")
    stream = data.get("stream", False)
    
    logger.info(f"收到调试工作流请求: content={content[:50]}..., stream={stream}")
    
    # 处理流式响应
    if stream:
        def generate():
            yield "data: {\"event\":\"analyzing_problem\",\"content\":\"正在分析问题...\"}\n\n"
            yield "data: {\"event\":\"extracting_code\",\"content\":\"提取代码中...\"}\n\n"
            yield "data: {\"event\":\"suggesting_solutions\",\"content\":\"建议解决方案...\"}\n\n"
            yield "data: {\"event\":\"done\",\"content\":\"\"}\n\n"
            yield "data: [DONE]\n\n"
        
        return Response(generate(), mimetype="text/event-stream")
    
    # 处理非流式响应
    else:
        return jsonify({
            "events": [
                {"event": "analyzing_problem", "content": "问题分析完成"},
                {"event": "extracting_code", "content": "代码提取完成"},
                {"event": "suggesting_solutions", "content": "解决方案生成完成"}
            ]
        })

def main():
    parser = argparse.ArgumentParser(description="CORS 配置测试服务器")
    parser.add_argument("--port", type=int, default=5000, help="服务器端口")
    parser.add_argument("--host", default="127.0.0.1", help="服务器主机")
    parser.add_argument("--cors-origin", default="*", help="CORS 允许的源")
    args = parser.parse_args()
    
    # 配置 CORS
    if args.cors_origin == "*":
        logger.info("配置 CORS: 允许所有源")
        CORS(app)
    else:
        logger.info(f"配置 CORS: 允许源 {args.cors_origin}")
        CORS(app, resources={r"/*": {"origins": args.cors_origin}})
    
    # 启动服务器
    logger.info(f"启动测试服务器: http://{args.host}:{args.port}")
    app.run(host=args.host, port=args.port, debug=True)

if __name__ == "__main__":
    main() 