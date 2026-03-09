#!/bin/bash

# ============================================
# OpenJenny 一键停止脚本
# ============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/logs"

echo -e "${YELLOW}正在停止 OpenJenny 服务...${NC}"

# 用 Python 按端口杀进程
kill_port() {
    local PORT=$1
    python "$ROOT_DIR/kill_port.py" "$PORT"
}

echo -e "${YELLOW}  → 停止后端 (端口 8669)...${NC}"
RESULT=$(kill_port 8669)
if [ "$RESULT" = "ok" ]; then
    echo -e "${GREEN}✅ 后端已停止${NC}"
else
    echo -e "${YELLOW}⚠️  后端未在运行${NC}"
fi

echo -e "${YELLOW}  → 停止前端 (端口 5173)...${NC}"
RESULT=$(kill_port 5173)
if [ "$RESULT" = "ok" ]; then
    echo -e "${GREEN}✅ 前端已停止${NC}"
else
    echo -e "${YELLOW}⚠️  前端未在运行${NC}"
fi

# 清理 PID 文件
rm -f "$LOG_DIR/backend.pid" "$LOG_DIR/frontend.pid"

echo -e "${GREEN}🛑 OpenJenny 已全部停止${NC}"
