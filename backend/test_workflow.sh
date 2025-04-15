#!/bin/bash
# 测试调试工作流的shell脚本

# 设置默认值
URL=${URL:-"http://localhost:5002"}
PORT=${PORT:-"5000"}
MODEL_TYPE=${MODEL_TYPE:-"ollama"}
MODEL_NAME=${MODEL_NAME:-"qwen2.5-coder"}
DEBUG="false"

# 确保脚本可执行
chmod +x test_debug_workflow.py

# 确保依赖已安装
pip install requests termcolor

# 示例代码
EXAMPLE_CODE='
def calculate_average(numbers):
    total = 0
    for num in numbers:
        total += num
    return total / len(numbers)

# 测试代码
numbers = [1, 2, 3, 4, 5]
result = calculate_average(numbers)
print(f"平均值: {result}")

# 这会导致错误
empty_list = []
result = calculate_average(empty_list)  # 除以零错误
print(f"空列表的平均值: {result}")
'

# 性能问题示例
PERFORMANCE_ISSUE='
def find_duplicates(items):
    duplicates = []
    for i in range(len(items)):
        for j in range(len(items)):
            if i != j and items[i] == items[j] and items[i] not in duplicates:
                duplicates.append(items[i])
    return duplicates

# 测试代码
test_list = [1, 2, 3, 4, 5, 2, 3, 6, 7, 8, 9, 1]
result = find_duplicates(test_list)
print(f"重复项: {result}")
'

# 显示帮助信息
show_help() {
    echo "使用方法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help               显示帮助信息"
    echo "  -u, --url URL            设置API基础URL (默认: $URL)"
    echo "  -p, --port PORT          设置API端口 (默认: $PORT)"
    echo "  -t, --model-type TYPE    设置模型类型 (默认: $MODEL_TYPE)"
    echo "  -m, --model-name NAME    设置模型名称 (默认: $MODEL_NAME)"
    echo "  -c, --custom CONTENT     使用自定义内容"
    echo "  -e, --error              使用会导致错误的代码示例"
    echo "  -p, --performance        使用性能问题的代码示例"
    echo "  -n, --no-stream          使用非流式模式"
    echo "  -d, --debug              启用调试模式"
    echo ""
    echo "示例:"
    echo "  $0 -e                    测试错误代码示例 (流式模式)"
    echo "  $0 --performance -n      测试性能问题代码示例 (非流式模式)"
    echo "  $0 -c \"print('hello')\"   测试自定义代码"
    echo "  $0 -p 5002 -d            使用端口5002并启用调试模式"
    exit 0
}

# 解析命令行参数
CONTENT=""
STREAM_ARG=""
DEBUG_ARG=""
PORT_ARG=""

while [[ "$#" -gt 0 ]]; do
    case $1 in
        -h|--help) show_help ;;
        -u|--url) URL="$2"; shift ;;
        -p|--port) PORT="$2"; PORT_ARG="--port $2"; shift ;;
        -t|--model-type) MODEL_TYPE="$2"; shift ;;
        -m|--model-name) MODEL_NAME="$2"; shift ;;
        -c|--custom) CONTENT="$2"; shift ;;
        -e|--error) CONTENT="$EXAMPLE_CODE" ;;
        --performance) CONTENT="$PERFORMANCE_ISSUE" ;;
        -n|--no-stream) STREAM_ARG="--no-stream" ;;
        -d|--debug) DEBUG="true"; DEBUG_ARG="--debug" ;;
        *) echo "未知参数: $1"; exit 1 ;;
    esac
    shift
done

# 如果没有指定内容，使用默认的错误示例
if [ -z "$CONTENT" ]; then
    CONTENT="$EXAMPLE_CODE"
    echo "使用默认错误示例代码"
fi

# 运行测试脚本
echo "使用以下参数测试调试工作流:"
echo "URL: $URL"
echo "端口: $PORT"
echo "模型类型: $MODEL_TYPE"
echo "模型名称: $MODEL_NAME"
echo "流式模式: $([[ -z "$STREAM_ARG" ]] && echo "是" || echo "否")"
echo "调试模式: $DEBUG"
echo ""

# 将内容写入临时文件
TEMP_FILE=$(mktemp)
echo "$CONTENT" > "$TEMP_FILE"
echo "内容已保存到临时文件: $TEMP_FILE"
echo ""

# 确认API服务可访问
echo "正在检查API服务是否可访问..."
if curl -s "$URL:$PORT/api/health" > /dev/null; then
    echo "API服务可访问 ✓"
else
    echo "警告: 无法访问API服务，请确保服务正在运行，并检查URL和端口配置"
    echo "尝试访问: $URL:$PORT/api/health"
    if [ "$DEBUG" = "true" ]; then
        echo "尝试使用curl获取详细信息..."
        curl -v "$URL:$PORT/api/health"
    fi
    echo ""
    read -p "是否继续测试? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "测试已取消"
        exit 1
    fi
fi

# 运行Python测试脚本
./test_debug_workflow.py \
    --url "$URL" \
    --content "$CONTENT" \
    --model-type "$MODEL_TYPE" \
    --model-name "$MODEL_NAME" \
    $STREAM_ARG \
    $DEBUG_ARG \
    $PORT_ARG

# 显示结果
exit_code=$?
if [ $exit_code -eq 0 ]; then
    echo "测试完成，退出代码: $exit_code"
else
    echo "测试失败，退出代码: $exit_code"
    if [ "$DEBUG" = "true" ]; then
        echo "尝试使用curl获取服务信息..."
        curl -v "$URL:$PORT/api/health"
    fi
fi

# 清理
rm -f "$TEMP_FILE" 