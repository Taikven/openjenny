#!/bin/bash

# ============================================
# OpenJenny 一键启动脚本
# 后端: FastAPI (uvicorn) | 前端: Vite + React
# ============================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录（项目根目录）
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$ROOT_DIR/server"
WEB_DIR="$ROOT_DIR/web"

# 日志目录
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}       🚀 OpenJenny 一键启动                    ${NC}"
echo -e "${BLUE}================================================${NC}"

# ---- 检查依赖 ----
echo -e "\n${YELLOW}[1/4] 检查环境依赖...${NC}"

if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo -e "${RED}❌ 未找到 python3，请先安装 Python 3.x${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ 未找到 node，请先安装 Node.js${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ 未找到 npm，请先安装 npm${NC}"
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1 || python --version 2>&1)
NODE_VERSION=$(node --version 2>&1)
NPM_VERSION=$(npm --version 2>&1)
echo -e "${GREEN}✅ Python: $PYTHON_VERSION${NC}"
echo -e "${GREEN}✅ Node:   $NODE_VERSION${NC}"
echo -e "${GREEN}✅ NPM:    $NPM_VERSION${NC}"

# ---- 后端：安装 Python 依赖 ----
echo -e "\n${YELLOW}[2/4] 安装后端依赖 (pip)...${NC}"
cd "$SERVER_DIR"

# 检查是否存在虚拟环境，不存在则创建
if [ ! -d "$SERVER_DIR/venv" ]; then
    echo -e "${YELLOW}  → 创建 Python 虚拟环境...${NC}"
    python3 -m venv venv || python -m venv venv
fi

# 兼容 Windows (Scripts) 和 Linux/macOS (bin)
if [ -f "$SERVER_DIR/venv/Scripts/activate" ]; then
    source "$SERVER_DIR/venv/Scripts/activate"
elif [ -f "$SERVER_DIR/venv/bin/activate" ]; then
    source "$SERVER_DIR/venv/bin/activate"
else
    echo -e "${RED}❌ 虚拟环境激活脚本未找到，请检查 Python 安装${NC}"
    exit 1
fi

pip install -r requirements.txt -q
echo -e "${GREEN}✅ 后端依赖安装完成${NC}"

# ---- 前端：安装 Node 依赖 ----
echo -e "\n${YELLOW}[3/4] 安装前端依赖 (npm)...${NC}"
cd "$WEB_DIR"

if [ ! -d "$WEB_DIR/node_modules" ]; then
    npm install -q
    echo -e "${GREEN}✅ 前端依赖安装完成${NC}"
else
    echo -e "${GREEN}✅ 前端依赖已存在，跳过安装${NC}"
fi

# ---- 启动服务 ----
echo -e "\n${YELLOW}[4/4] 启动服务...${NC}"

# 启动前先清理端口冲突的进程
kill_port() {
    local PORT=$1
    python "$ROOT_DIR/kill_port.py" "$PORT"
    echo -e "${YELLOW}  ⚠️  端口 ${PORT} 冲突进程已处理${NC}"
}

kill_port 8669
kill_port 5173

# 启动后端（后台运行，日志写入文件）
echo -e "${BLUE}  → 启动后端服务 (http://localhost:8669)...${NC}"
cd "$SERVER_DIR"
if [ -f "$SERVER_DIR/venv/Scripts/activate" ]; then
    source "$SERVER_DIR/venv/Scripts/activate"
else
    source "$SERVER_DIR/venv/bin/activate"
fi
nohup uvicorn app.main:app --host 0.0.0.0 --port 8669 --reload > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$LOG_DIR/backend.pid"
echo -e "${GREEN}✅ 后端已启动 (PID: $BACKEND_PID)${NC}"

# 等待后端就绪
sleep 2

# 启动前端（后台运行，日志写入文件）
echo -e "${BLUE}  → 启动前端服务 (http://localhost:5173)...${NC}"
cd "$WEB_DIR"
nohup npm run dev > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$LOG_DIR/frontend.pid"
echo -e "${GREEN}✅ 前端已启动 (PID: $FRONTEND_PID)${NC}"

# ---- 完成 ----
echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}  🎉 OpenJenny 启动成功！${NC}"
echo -e "${GREEN}------------------------------------------------${NC}"
echo -e "${GREEN}  前端地址:  http://localhost:5173${NC}"
echo -e "${GREEN}  后端地址:  http://localhost:8669${NC}"
echo -e "${GREEN}  API 文档:  http://localhost:8669/docs${NC}"
echo -e "${GREEN}------------------------------------------------${NC}"
echo -e "${GREEN}  日志目录:  $LOG_DIR${NC}"
echo -e "${GREEN}  停止服务:  bash stop.sh${NC}"
echo -e "${GREEN}================================================${NC}"

# 捕获 Ctrl+C 以显示提示
trap "echo -e '\n${YELLOW}提示: 服务仍在后台运行，使用 bash stop.sh 停止${NC}'" INT
wait
