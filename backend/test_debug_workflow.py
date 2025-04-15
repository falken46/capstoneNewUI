#!/usr/bin/env python
"""
调试工作流测试脚本
用于验证debug_workflow接口的功能
"""

import requests
import json
import time
import argparse
import sys
from termcolor import colored

def test_streaming_workflow(url, content, model_type=None, model_name=None, debug=False):
    """
    测试流式工作流
    
    Args:
        url: API基础URL
        content: 要分析的内容
        model_type: 模型类型
        model_name: 模型名称
        debug: 是否启用调试模式
    """
    print(colored("开始测试流式工作流...", "blue", attrs=["bold"]))
    print("-" * 80)
    
    # 构建请求体
    payload = {
        "content": content,
        "stream": True
    }
    
    if model_type:
        payload["model_type"] = model_type
    if model_name:
        payload["model_name"] = model_name
    
    # 打印请求详情
    request_url = f"{url}/api/debug/workflow"
    print(colored("发送请求到:", "cyan"))
    print(colored(request_url, "cyan"))
    
    if debug:
        print(colored("\n请求数据:", "cyan"))
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    
    # 配置请求头
    headers = {
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
    }
    
    # 发送请求
    try:
        print(colored("\n正在发送请求...", "cyan"))
        response = requests.post(
            request_url,
            json=payload,
            stream=True,
            headers=headers
        )
        
        print(colored(f"收到响应，状态码: {response.status_code}", "cyan"))
        
        if debug:
            print(colored("\n响应头:", "cyan"))
            for header, value in response.headers.items():
                print(f"{header}: {value}")
        
        if response.status_code != 200:
            print(colored(f"错误: {response.status_code}", "red"))
            try:
                error = response.json()
                print(colored(f"错误详情: {error}", "red"))
            except:
                print(colored("无法解析错误响应为JSON", "red"))
                print(colored("原始响应内容:", "red"))
                print(response.text)
            return
        
        # 处理流式响应
        print(colored("\n接收到流式响应...", "green"))
        
        # 跟踪当前步骤
        current_step = None
        step_content = ""
        
        # 解析SSE流
        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if debug:
                    print(colored(f"原始行: {line}", "magenta"))
                
                if line.startswith("data:"):
                    # 解析数据
                    data_str = line[5:].strip()
                    if data_str == "[DONE]":
                        print(colored("工作流完成", "blue", attrs=["bold"]))
                        break
                    
                    try:
                        data = json.loads(data_str)
                        if debug:
                            print(colored(f"解析的JSON数据: {data}", "magenta"))
                        
                        # 处理事件
                        event = data.get("event", "")
                        content = data.get("content", "")
                        
                        # 新步骤开始或步骤变化
                        if event != current_step:
                            if current_step:
                                print() # 添加一个空行分隔不同步骤
                            
                            current_step = event
                            # 打印步骤名称
                            step_name = get_step_name(event)
                            print(colored(f"步骤: {step_name}", "yellow", attrs=["bold"]))
                            step_content = content
                            if content:  # 如果初始内容不为空，则显示
                                print(content)
                        elif content != step_content:
                            # 内容更新，只打印新增部分
                            if len(content) > len(step_content):
                                new_content = content[len(step_content):]
                                sys.stdout.write(new_content)
                                sys.stdout.flush()
                                step_content = content
                            else:
                                # 内容可能完全变化，直接打印
                                print(content)
                                step_content = content
                        
                        # 处理特殊事件
                        if event == "done":
                            print(colored("\n工作流完成", "blue", attrs=["bold"]))
                            break
                        elif event == "error":
                            print(colored(f"\n错误: {content}", "red"))
                            break
                    
                    except json.JSONDecodeError as e:
                        print(colored(f"解析JSON失败: {e}", "red"))
                        print(f"原始数据: {data_str}")
        
        print("-" * 80)
        print(colored("流式工作流测试完成", "blue", attrs=["bold"]))
    
    except requests.RequestException as e:
        print(colored(f"请求失败: {e}", "red"))
        # 显示详细错误信息
        if hasattr(e, "response") and e.response:
            print(colored(f"响应状态码: {e.response.status_code}", "red"))
            print(colored("响应头:", "red"))
            for header, value in e.response.headers.items():
                print(f"{header}: {value}")
            print(colored("响应内容:", "red"))
            print(e.response.text)
        if debug:
            # 显示完整的异常跟踪
            import traceback
            print(colored("异常跟踪:", "red"))
            traceback.print_exc()


def test_non_streaming_workflow(url, content, model_type=None, model_name=None, debug=False):
    """
    测试非流式工作流
    
    Args:
        url: API基础URL
        content: 要分析的内容
        model_type: 模型类型
        model_name: 模型名称
        debug: 是否启用调试模式
    """
    print(colored("开始测试非流式工作流...", "blue", attrs=["bold"]))
    print("-" * 80)
    
    # 构建请求体
    payload = {
        "content": content,
        "stream": False
    }
    
    if model_type:
        payload["model_type"] = model_type
    if model_name:
        payload["model_name"] = model_name
    
    # 打印请求详情
    request_url = f"{url}/api/debug/workflow"
    print(colored("发送请求到:", "cyan"))
    print(colored(request_url, "cyan"))
    
    if debug:
        print(colored("\n请求数据:", "cyan"))
        print(json.dumps(payload, ensure_ascii=False, indent=2))
    
    # 配置请求头
    headers = {
        "Content-Type": "application/json",
    }
    
    # 发送请求
    try:
        print(colored("\n正在发送请求...", "cyan"))
        response = requests.post(
            request_url,
            json=payload,
            headers=headers
        )
        
        print(colored(f"收到响应，状态码: {response.status_code}", "cyan"))
        
        if debug:
            print(colored("\n响应头:", "cyan"))
            for header, value in response.headers.items():
                print(f"{header}: {value}")
        
        if response.status_code != 200:
            print(colored(f"错误: {response.status_code}", "red"))
            try:
                error = response.json()
                print(colored(f"错误详情: {error}", "red"))
            except:
                print(colored("无法解析错误响应为JSON", "red"))
                print(colored("原始响应内容:", "red"))
                print(response.text)
            return
        
        # 处理响应
        try:
            result = response.json()
            print(colored("接收到非流式响应:", "green"))
            print(json.dumps(result, ensure_ascii=False, indent=2))
        except json.JSONDecodeError as e:
            print(colored(f"解析JSON失败: {e}", "red"))
            print(f"原始响应: {response.text}")
        
        print("-" * 80)
        print(colored("非流式工作流测试完成", "blue", attrs=["bold"]))
    
    except requests.RequestException as e:
        print(colored(f"请求失败: {e}", "red"))
        # 显示详细错误信息
        if hasattr(e, "response") and e.response:
            print(colored(f"响应状态码: {e.response.status_code}", "red"))
            print(colored("响应头:", "red"))
            for header, value in e.response.headers.items():
                print(f"{header}: {value}")
            print(colored("响应内容:", "red"))
            print(e.response.text)
        if debug:
            # 显示完整的异常跟踪
            import traceback
            print(colored("异常跟踪:", "red"))
            traceback.print_exc()


def get_step_name(step_id):
    """根据步骤ID获取步骤名称"""
    step_names = {
        "analyzing_problem": "分析问题",
        "extracting_code": "提取代码",
        "suggesting_solutions": "提供建议",
        "workflow_completed": "工作流完成",
        "error": "错误"
    }
    return step_names.get(step_id, step_id)


def main():
    parser = argparse.ArgumentParser(description="测试调试工作流API")
    parser.add_argument("--url", default="http://localhost:5000", help="API基础URL")
    parser.add_argument("--content", required=True, help="要分析的内容")
    parser.add_argument("--model-type", help="模型类型")
    parser.add_argument("--model-name", help="模型名称")
    parser.add_argument("--no-stream", action="store_true", help="使用非流式模式")
    parser.add_argument("--debug", action="store_true", help="启用调试模式")
    parser.add_argument("--port", type=int, help="指定API端口，会覆盖URL中的端口")
    
    args = parser.parse_args()
    
    # 处理URL和端口
    url = args.url
    if args.port:
        # 如果指定了端口，更新URL
        import re
        url = re.sub(r'(https?://[^:/]+)(:\d+)?', r'\1:' + str(args.port), url)
    
    # 确认连接信息
    print(colored(f"将连接到: {url}", "green"))
    print(colored(f"使用模型: {args.model_type or '默认'} / {args.model_name or '默认'}", "green"))
    print(colored(f"调试模式: {'开启' if args.debug else '关闭'}", "green"))
    print()
    
    # 流式测试
    if not args.no_stream:
        test_streaming_workflow(url, args.content, args.model_type, args.model_name, args.debug)
    
    # 非流式测试
    else:
        test_non_streaming_workflow(url, args.content, args.model_type, args.model_name, args.debug)


if __name__ == "__main__":
    main() 