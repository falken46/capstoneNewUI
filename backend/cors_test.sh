#!/bin/bash
# CORS配置和403错误测试脚本

# 设置颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # 无颜色

# 显示标题
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}      CORS 和 403 错误诊断工具        ${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 确保依赖已安装
echo -e "${YELLOW}正在检查并安装依赖...${NC}"
pip install flask flask-cors requests termcolor > /dev/null
echo -e "${GREEN}依赖检查完成✓${NC}"
echo ""

# 确保脚本可执行
chmod +x check_cors.py

# 设置默认参数
MOCK_PORT=5001
API_PORT=5000
API_HOST="localhost"
TEST_MODE="all"

# 显示帮助信息
show_help() {
    echo "使用方法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help               显示帮助信息"
    echo "  -m, --mock-port PORT     设置模拟服务器端口 (默认: $MOCK_PORT)"
    echo "  -a, --api-port PORT      设置实际API端口 (默认: $API_PORT)"
    echo "  -o, --host HOST          设置API主机名 (默认: $API_HOST)"
    echo "  -t, --test TEST          设置测试模式: mock(仅模拟), api(仅实际API), all(全部) (默认: $TEST_MODE)"
    echo ""
    echo "示例:"
    echo "  $0 -m 5001 -a 5000       设置模拟服务器端口为5001，实际API端口为5000"
    echo "  $0 -t mock               仅运行模拟服务器测试"
    echo "  $0 -t api                仅测试实际API"
    exit 0
}

# 解析命令行参数
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -h|--help) show_help ;;
        -m|--mock-port) MOCK_PORT="$2"; shift ;;
        -a|--api-port) API_PORT="$2"; shift ;;
        -o|--host) API_HOST="$2"; shift ;;
        -t|--test) TEST_MODE="$2"; shift ;;
        *) echo "未知参数: $1"; exit 1 ;;
    esac
    shift
done

# 运行模拟服务器测试
run_mock_test() {
    echo -e "${BLUE}[1] 启动模拟CORS服务器...${NC}"
    # 在后台启动模拟服务器
    python check_cors.py --port "$MOCK_PORT" --host "0.0.0.0" > mock_server.log 2>&1 &
    MOCK_PID=$!
    
    # 等待服务器启动
    echo -e "${YELLOW}等待模拟服务器启动...${NC}"
    sleep 2
    
    # 测试健康端点
    echo -e "${BLUE}[2] 测试健康端点...${NC}"
    if curl -s "http://localhost:$MOCK_PORT/api/health" > /dev/null; then
        echo -e "${GREEN}健康端点测试成功✓${NC}"
        
        # 测试调试工作流端点 - 非流式
        echo -e "${BLUE}[3] 测试非流式调试工作流端点...${NC}"
        NON_STREAM_RESULT=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d '{"content":"test content", "stream":false}' \
            "http://localhost:$MOCK_PORT/api/debug/workflow")
        
        echo -e "${YELLOW}响应:${NC}"
        echo "$NON_STREAM_RESULT" | python -m json.tool
        echo ""
        
        # 测试调试工作流端点 - 流式
        echo -e "${BLUE}[4] 测试流式调试工作流端点...${NC}"
        echo -e "${YELLOW}响应:${NC}"
        curl -N -s -X POST \
            -H "Content-Type: application/json" \
            -H "Accept: text/event-stream" \
            -d '{"content":"test content", "stream":true}' \
            "http://localhost:$MOCK_PORT/api/debug/workflow"
        echo ""
    else
        echo -e "${RED}健康端点测试失败✗${NC}"
        echo -e "${YELLOW}查看日志中的错误信息...${NC}"
        cat mock_server.log
    fi
    
    # 终止模拟服务器
    echo -e "${BLUE}[5] 终止模拟服务器...${NC}"
    kill $MOCK_PID
    wait $MOCK_PID 2>/dev/null
    echo -e "${GREEN}模拟服务器已停止✓${NC}"
}

# 测试实际API
test_api() {
    echo -e "${BLUE}[1] 测试实际API健康端点...${NC}"
    HEALTH_RESULT=$(curl -s -v "http://$API_HOST:$API_PORT/api/health" 2>&1)
    HEALTH_STATUS=$?
    
    if [ $HEALTH_STATUS -eq 0 ] && [[ "$HEALTH_RESULT" == *"200 OK"* ]]; then
        echo -e "${GREEN}实际API健康端点测试成功✓${NC}"
    else
        echo -e "${RED}实际API健康端点测试失败✗${NC}"
        echo -e "${YELLOW}详细信息:${NC}"
        echo "$HEALTH_RESULT"
        echo ""
        echo -e "${YELLOW}这可能表明API服务不在运行或无法访问${NC}"
    fi
    
    echo -e "${BLUE}[2] 测试CORS和OPTIONS预检请求...${NC}"
    OPTIONS_RESULT=$(curl -s -v -X OPTIONS \
        -H "Origin: http://localhost:3000" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Content-Type" \
        "http://$API_HOST:$API_PORT/api/debug/workflow" 2>&1)
    
    echo -e "${YELLOW}OPTIONS响应头:${NC}"
    echo "$OPTIONS_RESULT" | grep -i "< access-control"
    echo ""
    
    if [[ "$OPTIONS_RESULT" == *"Access-Control-Allow-Origin"* ]]; then
        echo -e "${GREEN}CORS配置正确✓${NC}"
    else
        echo -e "${RED}未检测到CORS响应头，这可能是403错误的原因✗${NC}"
    fi
    
    echo -e "${BLUE}[3] 直接测试调试工作流API...${NC}"
    WORKFLOW_RESULT=$(curl -s -v -X POST \
        -H "Content-Type: application/json" \
        -d '{"content":"test content", "stream":false}' \
        "http://$API_HOST:$API_PORT/api/debug/workflow" 2>&1)
    
    echo -e "${YELLOW}请求响应:${NC}"
    echo "$WORKFLOW_RESULT"
    echo ""
    
    # 检查是否有403错误
    if [[ "$WORKFLOW_RESULT" == *"403"* ]]; then
        echo -e "${RED}检测到HTTP 403错误${NC}"
        echo -e "${YELLOW}可能的原因:${NC}"
        echo "1. CORS配置不正确"
        echo "2. 需要身份验证"
        echo "3. IP地址被限制"
        echo "4. 服务器配置问题"
    elif [[ "$WORKFLOW_RESULT" == *"200 OK"* ]]; then
        echo -e "${GREEN}API调用成功✓${NC}"
    else
        echo -e "${RED}API调用失败，但不是403错误✗${NC}"
    fi
}

# 主测试流程
if [ "$TEST_MODE" = "all" ] || [ "$TEST_MODE" = "mock" ]; then
    echo -e "${BLUE}=============================${NC}"
    echo -e "${BLUE}     模拟服务器测试         ${NC}"
    echo -e "${BLUE}=============================${NC}"
    echo ""
    run_mock_test
    echo ""
fi

if [ "$TEST_MODE" = "all" ] || [ "$TEST_MODE" = "api" ]; then
    echo -e "${BLUE}=============================${NC}"
    echo -e "${BLUE}     实际API测试            ${NC}"
    echo -e "${BLUE}=============================${NC}"
    echo ""
    test_api
    echo ""
fi

echo -e "${BLUE}=============================${NC}"
echo -e "${BLUE}     诊断总结              ${NC}"
echo -e "${BLUE}=============================${NC}"
echo ""
echo -e "${YELLOW}如果模拟服务器测试成功但实际API测试失败，可能的解决方案:${NC}"
echo ""
echo "1. 检查API服务器是否配置了CORS：确保Flask应用中正确配置了flask_cors"
echo "   示例: CORS(app) 或 CORS(app, resources={r'/api/*': {'origins': '*'}})"
echo ""
echo "2. 检查API服务的防火墙或安全组设置"
echo ""
echo "3. 尝试在API服务器上添加以下CORS响应头:"
echo "   Access-Control-Allow-Origin: *"
echo "   Access-Control-Allow-Methods: GET, POST, OPTIONS"
echo "   Access-Control-Allow-Headers: Content-Type"
echo ""
echo "4. 检查API服务器日志，查找可能的错误或权限问题"
echo ""
echo -e "${GREEN}测试完成。${NC}" 