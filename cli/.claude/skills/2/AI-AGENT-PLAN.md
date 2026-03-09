# Higress Console AI Agent 集成计划

> **适用场景**：面向一个**尚未包含 Agent 功能的 Higress Console 项目**，从零实现完整的 AI 智能运维助手。  
> **参考实现**：本计划基于已落地的 `agent/` 模块与前端 `AgentChat` 组件提炼，可作为新项目的精确蓝图。

---

## 目录

1. [整体架构](#1-整体架构)
2. [技术栈](#2-技术栈)
3. [目录结构](#3-目录结构)
4. [后端 Python Agent 服务](#4-后端-python-agent-服务)
   - 4.1 [环境与配置](#41-环境与配置)
   - 4.2 [工具层 tools/](#42-工具层-tools)
   - 4.3 [LLM 与 ReAct Agent（agent.py）](#43-llm-与-react-agentagentpy)
   - 4.4 [写操作确认 Agent（write_agent.py）](#44-写操作确认-agentwrite_agentpy)
   - 4.5 [RAG 知识库](#45-rag-知识库)
   - 4.6 [MCP Server（mcp_server.py）](#46-mcp-servermcp_serverpy)
   - 4.7 [FastAPI 主服务（main.py）](#47-fastapi-主服务mainpy)
5. [前端组件](#5-前端组件)
   - 5.1 [AgentChat 悬浮入口](#51-agentchat-悬浮入口)
   - 5.2 [useAgentChat Hook](#52-useagentchat-hook)
   - 5.3 [MessageBubble 消息气泡](#53-messagebubble-消息气泡)
   - 5.4 [ConfirmCard 写操作确认卡片](#54-confirmcard-写操作确认卡片)
   - 5.5 [接入 Layout](#55-接入-layout)
6. [SSE 事件协议](#6-sse-事件协议)
7. [前端路由代理](#7-前端路由代理)
8. [Docker / 部署](#8-docker--部署)
9. [分步实施顺序](#9-分步实施顺序)
10. [新增工具 SOP](#10-新增工具-sop)

---

## 1. 整体架构

```
┌─────────────────────────────────────────────────────┐
│  浏览器 (React / ice.js)                             │
│                                                     │
│   ┌──────────────────┐   悬浮按钮 → 聊天窗口         │
│   │   AgentChat      │                              │
│   │  ┌────────────┐  │  SSE 流（/agent/chat）        │
│   │  │MessageBubble│◄──────────────────────────┐   │
│   │  └────────────┘  │                          │   │
│   │  ┌────────────┐  │  POST /agent/chat/confirm │   │
│   │  │ConfirmCard │►──────────────────────────┐ │   │
│   │  └────────────┘  │                        │ │   │
│   └──────────────────┘                        │ │   │
└───────────────────────────────────────────────┘─┘   │
           ▲ Nginx/反向代理 /agent/* → :7091           │
           │                                          │
┌──────────┴───────────────────────────────────────┐  │
│  Python FastAPI Agent Service  (:7091)           │  │
│                                                  │  │
│   main.py                                        │  │
│    ├── POST /chat ──► write_agent.run_write_agent_stream
│    ├── POST /chat/confirm ► write_agent.resume_write_agent_stream
│    ├── GET  /health                              │  │
│    └── GET  /tools                               │  │
│                                                  │  │
│   write_agent.py  (LangGraph StateGraph)         │  │
│    ├── agent_node  ──► LLM (bind_tools)          │  │
│    ├── confirm_node ──► interrupt() → confirm_card│  │
│    ├── execute_node ──► 调用 TOOL_BY_NAME[name]  │  │
│    └── summarize_node ──► LLM(无工具，生成回复)  │  │
│                                                  │  │
│   agent.py  (SYSTEM_PROMPT + _build_llm)         │  │
│                                                  │  │
│   tools/                                         │  │
│    ├── core/  (纯函数，调用 Higress REST API)     │  │
│    │    ├── llm_provider.py                      │  │
│    │    ├── consumer.py                          │  │
│    │    ├── ai_route.py                          │  │
│    │    ├── route.py                             │  │
│    │    ├── domain.py                            │  │
│    │    ├── service_source.py                    │  │
│    │    ├── knowledge_base.py                    │  │
│    │    └── __init__.py  ← CORE_TOOLS 注册表      │  │
│    ├── utils.py  (http_get/post/put/delete)      │  │
│    └── __init__.py  (CORE_TOOLS → LangChain)     │  │
│                                                  │  │
│   rag/  (ChromaDB 向量检索)                       │  │
│   mcp_server.py  (MCP 协议适配)                  │  │
└──────────────────────────────────────────────────┘  │
           │                                          │
           ▼ HTTP  (HIGRESS_BACKEND_URL, 默认 :8080)   │
┌──────────────────────┐                              │
│  Higress Console     │                              │
│  Java Backend        │                              │
│  /v1/ai/providers    │                              │
│  /v1/ai/routes  ...  │                              │
└──────────────────────┘
```

**关键设计决策**：

| 决策 | 选择 | 原因 |
|------|------|------|
| Agent 框架 | LangGraph `StateGraph` + `MemorySaver` | 原生支持 `interrupt()` 暂停/恢复，实现写操作二次确认 |
| 流式传输 | SSE（Server-Sent Events） | 前端原生 Fetch API 即可消费，无需 WebSocket |
| 工具架构 | `core/` 纯函数 + `tools/__init__` LangChain 适配 + `mcp_server.py` MCP 适配 | 一份工具逻辑，多协议共用 |
| 认证透传 | 前端 `Authorization` header → Agent → Higress Backend | Agent 无状态，不存储凭证 |
| 写操作安全 | `interrupt()` 暂停 → `confirm_card` SSE 事件 → 用户确认 → `resume` | 三级风险（低/中/高），高危删除需手动输入资源名称 |
| LLM streaming | 构建时 `streaming=False` | 保证 tool_call 参数完整不分片；文字通过 `on_chat_model_end` 输出 |

---

## 2. 技术栈

### 后端（Python）

```
langchain>=1.0.0
langchain-core>=1.0.0
langchain-openai>=0.2.0        # 通义千问/OpenAI/Azure/DeepSeek/Moonshot/ZhipuAI 共用
langchain-community>=0.4.0
langchain-chroma>=0.1.0        # RAG 向量库
langchain-text-splitters>=0.3.0
langgraph>=0.2.0               # StateGraph + interrupt/resume + MemorySaver
fastapi>=0.110.0
uvicorn[standard]>=0.29.0
httpx>=0.27.0                  # 调用 Higress REST API
python-dotenv>=1.0.0
pydantic>=2.0.0
chromadb>=0.5.0
mcp>=1.0.0                     # MCP Server（可选）
```

### 前端（TypeScript / React）

- **框架**：ice.js（项目现有）
- **UI**：Ant Design
- **状态管理**：React hooks（`useState` / `useRef` / `useCallback`）
- **通信**：原生 `fetch` API + `ReadableStream` 解析 SSE
- **Markdown**：轻量自实现（无需引入 `react-markdown`，支持 `**bold**` / `` `code` `` / 换行）

---

## 3. 目录结构

新建以下目录与文件（相对于项目根目录）：

```
agent/                          ← Python Agent 服务根目录
├── .env.example                ← 环境变量模板
├── requirements.txt
├── Dockerfile
├── main.py                     ← FastAPI 入口（/chat, /chat/confirm, /health, /tools）
├── agent.py                    ← SYSTEM_PROMPT + _build_llm（多 LLM 工厂）
├── write_agent.py              ← LangGraph 图 + interrupt 确认机制（主流程）
├── mcp_server.py               ← MCP 协议适配（可选，供外部 Agent 接入）
├── knowledge/                  ← RAG 原始文档（.md 文件）
│   ├── faq.md
│   ├── getting-started.md
│   └── llm-provider-guide.md
├── rag/
│   ├── __init__.py
│   ├── indexer.py              ← 将 knowledge/ 建索引写入 chroma_db/
│   └── retriever.py            ← search(query, k=4) → list[str]
└── tools/
    ├── __init__.py             ← CORE_TOOLS = [fn1, fn2, ...]  唯一注册表
    ├── utils.py                ← http 工具函数（动态读取环境变量）
    └── core/
        ├── __init__.py         ← CORE_TOOLS 注册表
        ├── llm_provider.py
        ├── consumer.py
        ├── ai_route.py
        ├── route.py
        ├── domain.py
        ├── service_source.py
        └── knowledge_base.py

frontend/src/components/AgentChat/   ← 前端组件（全部新建）
├── index.tsx                   ← 悬浮按钮 + 聊天窗口容器
├── index.module.css            ← 全部样式
├── useAgentChat.ts             ← 全部业务逻辑（SSE 消费、状态管理）
├── MessageBubble.tsx           ← user / assistant / tool 三种气泡
└── ConfirmCard.tsx             ← 写操作确认卡片
```

---

## 4. 后端 Python Agent 服务

### 4.1 环境与配置

**`.env.example`**（用户复制为 `.env` 后填写）：

```dotenv
# Higress Console 后端地址
HIGRESS_BACKEND_URL=http://localhost:8080

# 开发环境固定凭证（生产环境由前端透传 Authorization header）
HIGRESS_DEFAULT_AUTH=Basic YWRtaW46YWRtaW4=

# LLM 配置
LLM_PROVIDER=qwen         # qwen | openai | azure | claude | deepseek | moonshot | zhipuai
LLM_MODEL=qwen-max

# 各提供商 API Key（按 LLM_PROVIDER 填对应的）
DASHSCOPE_API_KEY=sk-xxxx
OPENAI_API_KEY=sk-xxxx
DEEPSEEK_API_KEY=sk-xxxx
MOONSHOT_API_KEY=sk-xxxx
ZHIPUAI_API_KEY=xxxx

# Agent 服务端口
AGENT_PORT=7091
```

**多 LLM 提供商支持**（`agent.py` 中 `_build_llm()`）：

| `LLM_PROVIDER` | 实现类 | 接入地址 | 所需环境变量 |
|---|---|---|---|
| `qwen` | `ChatOpenAI`（兼容模式） | `dashscope.aliyuncs.com/compatible-mode/v1` | `DASHSCOPE_API_KEY` |
| `openai` | `ChatOpenAI` | 默认 | `OPENAI_API_KEY` |
| `azure` | `AzureChatOpenAI` | 默认 | `AZURE_OPENAI_API_KEY`、`AZURE_OPENAI_ENDPOINT` |
| `claude` | `ChatAnthropic` | 默认 | `ANTHROPIC_API_KEY` |
| `deepseek` | `ChatOpenAI`（兼容模式） | `api.deepseek.com/v1` | `DEEPSEEK_API_KEY` |
| `moonshot` | `ChatOpenAI`（兼容模式） | `api.moonshot.cn/v1` | `MOONSHOT_API_KEY` |
| `zhipuai` | `ChatOpenAI`（兼容模式） | `open.bigmodel.cn/api/paas/v4` | `ZHIPUAI_API_KEY` |

> ⚠️ **所有 LLM 均以 `streaming=False` 构建**，确保 `tool_call` 参数完整不分片。文字流效果通过 LangGraph `astream` 的 `updates` 模式 + `ToolMessage` 驱动实现。

---

### 4.2 工具层 tools/

#### 架构原则

```
tools/core/*.py          ← 纯函数，调用 Higress REST API，返回 str
tools/core/__init__.py   ← CORE_TOOLS = [fn1, fn2, ...]  唯一注册表
tools/__init__.py        ← CORE_TOOLS → LangChain StructuredTool（ALL_TOOLS）
tools/utils.py           ← http 工具函数（动态读取环境变量）
mcp_server.py            ← CORE_TOOLS → MCP Tool（自动派生）
```

**新增工具只需两步**：
1. 在 `core/xxx.py` 写纯函数（带类型注解 + docstring）
2. 在 `core/__init__.py` 的 `CORE_TOOLS` 列表中添加该函数

LangChain 和 MCP 两个适配层自动同步，**无需修改其他任何文件**。

#### `tools/__init__.py` 核心逻辑

```python
from langchain_core.tools import tool as _lc_tool
from .core import CORE_TOOLS

# 批量包装：core 纯函数 → LangChain StructuredTool
ALL_TOOLS = [_lc_tool(fn) for fn in CORE_TOOLS]

# 按名称导出，保持向后兼容
_tool_map = {t.name: t for t in ALL_TOOLS}
globals().update(_tool_map)
```

#### `tools/utils.py` 设计要点

认证 token 按以下优先级读取：
1. `_HIGRESS_AUTH_TOKEN`（前端透传，由 `main.py` 每次请求注入）
2. `HIGRESS_DEFAULT_AUTH`（`.env` 中配置的固定凭证，适合开发环境）
3. 无认证头

**关键**：两处均用 `os.getenv()` 动态读取，而非模块加载时一次性读取，确保每次请求的 token 都是最新值。

#### 工具函数规范

```python
def create_llm_provider(
    name: str,
    provider_type: str,
    tokens: list,
    protocol: str = "openai/v1",
    azure_service_url: str = "",
) -> str:
    """
    创建 AI 服务提供者（LLM Provider）。        ← 第一行：LLM 看到的简短描述
    参数：
      - name: 服务名称（全局唯一，建议英文小写） ← 参数说明帮助 LLM 正确填参
      - provider_type: 支持中文名"通义千问"或英文 qwen/openai/azure...
      ...
    """
    # 返回值统一为 str，成功以 ✅ 开头，失败以 ❌ 开头
    # 内部 try/except，不向外抛出异常
```

#### 已实现工具清单

| 工具名 | 分类 | 读/写 |
|--------|------|-------|
| `create_llm_provider` | AI 服务提供者 | 写 |
| `list_llm_providers` | AI 服务提供者 | 读 |
| `get_llm_provider` | AI 服务提供者 | 读 |
| `update_llm_provider` | AI 服务提供者 | 写 |
| `delete_llm_provider` | AI 服务提供者 | 写 |
| `create_consumer` | 消费者 | 写 |
| `list_consumers` | 消费者 | 读 |
| `get_consumer` | 消费者 | 读 |
| `delete_consumer` | 消费者 | 写 |
| `create_ai_route` | AI 路由 | 写 |
| `list_ai_routes` | AI 路由 | 读 |
| `delete_ai_route` | AI 路由 | 写 |
| `create_route` | 普通路由 | 写 |
| `list_routes` | 普通路由 | 读 |
| `delete_route` | 普通路由 | 写 |
| `create_domain` | 域名 | 写 |
| `list_domains` | 域名 | 读 |
| `delete_domain` | 域名 | 写 |
| `create_service_source` | 服务来源 | 写 |
| `list_service_sources` | 服务来源 | 读 |
| `list_services` | 后端服务 | 读 |
| `search_knowledge_base` | 知识库 RAG | 读 |

> **写操作判断规则**：工具名以 `create_`、`update_`、`delete_`、`add_` 开头均为写操作，触发 `interrupt()` 确认流程。

---

### 4.3 LLM 与 SYSTEM_PROMPT（agent.py）

`agent.py` 承担两个职责：
1. **`SYSTEM_PROMPT`**：定义助手人设、可执行操作范围、操作规范、提供商类型映射
2. **`_build_llm()`**：根据 `LLM_PROVIDER` / `LLM_MODEL` 环境变量工厂化构建 LLM 实例

SYSTEM_PROMPT 核心约束：
- 创建/修改前确认所有必填参数，缺少则**主动询问**
- 删除操作必须先获得用户**明确确认**
- 若用户要求执行多个操作，必须在**同一次响应**中同时输出所有工具调用（不分多轮）

---

### 4.4 写操作确认 Agent（write_agent.py）

这是 Agent 的**核心主流程**，采用 LangGraph `StateGraph` + `MemorySaver`。

#### 图结构

```
START
  │
  ▼
agent_node            ← LLM（bind_tools），分析用户意图，输出 tool_calls
  │
  ├─ 无 tool_calls ──────────────────────────────────► END（直接文字回复）
  │
  ├─ 有写操作 tool_calls ──────────► confirm_node
  │                                      │
  │                               interrupt({cards, tool_calls})
  │                                      │ ← 图暂停，推送 confirm_card SSE
  │                               用户 POST /chat/confirm
  │                                      │
  │                          ┌───────────┴──────────┐
  │                       "confirm"              "cancel"
  │                          │                      │
  │                    pending_tool_calls      AIMessage("已取消") ──► END
  │                          │
  └─ 只有读操作 tool_calls ──►execute_node（直接执行，不暂停）
                                    │
                               summarize_node  ← LLM（无工具绑定），生成友好回复
                                    │
                                   END
```

#### State 定义

```python
class AgentState(TypedDict):
    messages: Annotated[list, operator.add]   # 消息列表，自动累加
    pending_tool_calls: list[dict]             # interrupt 后暂存的写操作列表
```

#### MemorySaver 与图缓存

```python
# 全局共享一个 MemorySaver，所有 thread_id 共用
_checkpointer = MemorySaver()

# 按 "provider:model" 键缓存已编译的图，避免每次请求重建
_graph_cache: dict[str, Any] = {}
```

每次 `/chat` 请求：
- 如无 `thread_id` → `main.py` 自动生成 `uuid.uuid4()`
- `thread_id` 通过 SSE `thread_id` 事件推送给前端
- 前端后续调用 `/chat/confirm` 时携带此 `thread_id`

#### summarize_node 使用无工具 LLM

```python
# llm_plain = _build_llm()（不 bind_tools）
# 防止总结阶段 LLM 再次生成 tool_calls，触发新一轮确认循环
def summarize_node(state):
    msgs = [SystemMessage(SYSTEM_PROMPT)] + state["messages"]
    response = llm_plain.invoke(msgs)
    return {"messages": [response]}
```

#### 确认卡片三级风险

| 操作前缀 | `card_type` | `risk_level` | 确认方式 |
|----------|-------------|--------------|----------|
| `create_` / `add_` | `summary` | `low` | 展示字段摘要，点击[确认] |
| `update_` | `diff` | `medium` | 展示新配置列表，点击[确认更新] |
| `delete_` | `name_input` | `high` | 手动输入资源名称匹配后才激活[确认删除] |

高危关键词（`prod`/`production`/`main`/`master`）自动将 `risk_level` 升为 `high`。

敏感字段（`token`/`key`/`secret`/`password`）自动脱敏显示（`sk-xxxx***xxx`）。

---

### 4.5 RAG 知识库

#### 文件结构

```
knowledge/          ← Markdown 格式知识文档（人工维护）
rag/
├── indexer.py      ← build_index()：读取 knowledge/，分块，写入 chroma_db/
└── retriever.py    ← search(query, k=4) → list[str]
chroma_db/          ← 向量数据库持久化目录（不提交 Git）
```

**首次部署或文档更新后执行**：
```bash
cd agent && python -c "from rag.indexer import build_index; build_index()"
```

**Embedding 模型**：
- `LLM_PROVIDER=qwen` → `OpenAIEmbeddings(model="text-embedding-v3", base_url=dashscope兼容地址)`
- 其他 → 标准 `OpenAIEmbeddings`

**`search_knowledge_base` 工具**：调用 `rag.retriever.search(query, k=4)`，将结果拼接后返回给 LLM。

---

### 4.6 MCP Server（mcp_server.py）

将 `CORE_TOOLS` 自动注册为 MCP 协议工具，供 Claude Desktop / Cursor 等外部 Agent 使用。

转换逻辑：`inspect.signature` → `inputSchema`，`fn.__doc__` 第一行 → `description`。**无需手动编写任何 MCP 工具描述**。

```bash
# stdio 模式（本地，Claude Desktop）
python mcp_server.py

# HTTP/SSE 模式（远程连接）
python mcp_server.py --transport sse --port 7092
```

---

### 4.7 FastAPI 主服务（main.py）

#### API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/chat` | 流式聊天（SSE），调用 `run_write_agent_stream` |
| `POST` | `/chat/confirm` | 确认/取消写操作（SSE），调用 `resume_write_agent_stream` |
| `GET` | `/health` | 健康检查，返回当前 LLM 配置 |
| `GET` | `/tools` | 列出所有已注册工具名称与简介 |

#### `/chat` 请求体

```json
{
  "message": "创建一个 qwen 提供者，名称 my-qwen，token sk-xxxx",
  "history": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}],
  "thread_id": "可选，前端续传同一写操作会话"
}
```

#### `/chat/confirm` 请求体

```json
{
  "thread_id": "由 /chat 响应中 thread_id 事件携带",
  "action": "confirm",
  "confirmed_name": "高危删除时用户手动输入的资源名称（可选）"
}
```

#### 认证透传

```python
async def chat(req, authorization: Optional[str] = Header(None)):
    if authorization:
        os.environ["_HIGRESS_AUTH_TOKEN"] = authorization
    else:
        os.environ.pop("_HIGRESS_AUTH_TOKEN", None)
```

工具层 `utils.py` 的 `get_auth_headers()` 动态读取此环境变量，实现每次请求使用对应 token。

#### SSE 响应头

```python
headers={
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",   # 禁用 Nginx 缓冲，SSE 实时推送必需
    "Connection": "keep-alive",
}
```

---

## 5. 前端组件

### 5.1 AgentChat 悬浮入口

**文件**：`frontend/src/components/AgentChat/index.tsx`

- 右下角固定定位圆形悬浮按钮（`position: fixed; right: 24px; bottom: 24px`）
- 点击展开聊天窗口（约 360 × 520px）
- 头部：机器人图标 + "Higress 智能助手" + 清空按钮 + 关闭按钮
- 消息列表：`overflow-y: auto`，新消息时 `scrollTop = scrollHeight`
- 输入区：`Input.TextArea`（1-5 行自适应）+ 发送/停止按钮

**输入区禁用条件**：

```typescript
// 有未处理的确认卡片时，禁止发新消息，防止打断等待确认的写操作
const hasPendingCard = messages.some(
  (m) => m.role === 'confirm-card' && m.confirmStatus === 'pending'
);
const inputDisabled = loading || hasPendingCard;
```

**Loading 占位气泡显示条件**：

```typescript
// 有请求进行中 && 还没有 streaming 气泡 && 没有等待确认的卡片
loading && !messages.some((m) => m.streaming) && !hasPendingCard
```

---

### 5.2 useAgentChat Hook

**文件**：`frontend/src/components/AgentChat/useAgentChat.ts`

#### 核心 Ref（避免异步闭包读到旧状态）

```typescript
const msgsRef = useRef<Message[]>(messages)    // 最新消息列表
const threadIdRef = useRef<string | null>(null) // 当前写操作 thread_id
const abortRef = useRef<AbortController | null>(null) // 支持停止按钮
```

#### 消息类型定义

```typescript
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'tool' | 'confirm-card';
  content: string;
  toolName?: string;
  toolInput?: string;         // JSON 字符串，工具气泡显示参数
  status?: 'calling' | 'done' | 'error';
  streaming?: boolean;        // true 时显示 ▌ 光标
  confirmCards?: ConfirmCardData[];
  confirmThreadId?: string;
  confirmStatus?: 'pending' | 'confirmed' | 'cancelled';
}
```

#### SSE 解析器（readSSE）

纯 `AsyncGenerator`，负责 `ReadableStream` 字节流 → 事件对象：
- 处理分片（`buffer` 拼接）
- 处理流关闭时 buffer 残留的最后一行
- 忽略非 JSON 数据行

#### consumeStream 事件处理逻辑

| SSE 事件 | 处理 |
|----------|------|
| `thread_id` | `threadIdRef.current = event.thread_id` |
| `token` | 首个 token 懒惰创建 AI 气泡，后续追加 `content` |
| `tool_start` | 插入 `role:'tool'`、`status:'calling'` 消息 |
| `tool_end` | 更新对应 tool 消息 `content` + `status:'done'` |
| `confirm_card` | 关闭 reader、`setLoading(false)`、插入 `role:'confirm-card'` 消息 |
| `done` | `streaming:false`、`setLoading(false)`、`return` |

> **AI 气泡懒惰创建**：首个 `token` 事件到来时才插入，避免 `tool_start` 之前出现空气泡。

#### 对外接口

```typescript
{
  messages,       // 消息列表（含 user/assistant/tool/confirm-card）
  loading,        // 是否有请求进行中
  confirmCard,    // 当前待确认卡片状态（用于 index.tsx 判断是否有 pending 卡片）
  sendMessage,    // 发送用户消息，启动新对话轮次
  confirmAction,  // 用户点击[确认]，POST /chat/confirm action=confirm
  cancelAction,   // 用户点击[取消]，静默 POST /chat/confirm action=cancel
  stopGenerate,   // 用户点击[停止]，abort 当前 fetch
  clearMessages,  // 清空对话，重置所有状态
}
```

---

### 5.3 MessageBubble 消息气泡

**文件**：`frontend/src/components/AgentChat/MessageBubble.tsx`

#### `user` / `assistant` 气泡

- `user`：右对齐，蓝色背景，`UserOutlined` 头像
- `assistant`：左对齐，白色背景，`RobotOutlined` 头像
- 轻量 Markdown：`**bold**` → `<strong>`，`` `code` `` → `<code>`，`\n` → `<br/>`
- `streaming=true` 且 `content=''`：显示 `<Spin>`
- `streaming=true` 且有内容：末尾显示 `▌` 光标动画

#### `tool` 工具卡片

```
[ToolOutlined] 创建 AI 服务提供者   [执行中.../完成✓]
▶ 参数（可折叠，JSON 格式化，key: {} 时不显示）
  输出结果（超过 5 行或 300 字符时折叠，展开全部按钮）
```

工具名中文映射表（`TOOL_DISPLAY_NAME`）覆盖全部 22 个工具。

---

### 5.4 ConfirmCard 写操作确认卡片

**文件**：`frontend/src/components/AgentChat/ConfirmCard.tsx`

#### 卡片状态视觉

| `status` | 显示 |
|----------|------|
| `pending` | 确认/取消按钮激活 |
| `confirmed` | "✅ 已确认，执行中…"（按钮 loading） |
| `cancelled` | "❌ 操作已取消" |

#### 三种卡片类型

1. **`summary`（创建）**：
   - 操作标签 + 风险等级 Tag（绿/橙/红色）
   - 资源名称
   - 字段表格（key/value），敏感字段脱敏
   - [确认] [取消] 按钮

2. **`diff`（更新）**：
   - 同 summary，但标注"更新后将覆盖当前值"
   - 展示新配置字段（没有 before/after 对比，仅展示新值）

3. **`name_input`（删除）**：
   - 红色 `DeleteFilled` 图标
   - 高危警告横幅
   - 输入框：要求用户输入资源名称，实时校验
   - 输入正确才激活[确认删除]按钮

**批量操作**：多张卡片垂直排列，共用底部一对确认/取消按钮。

---

### 5.5 接入 Layout

**文件**：`frontend/src/pages/layout.tsx`

```tsx
import AgentChat from '@/components/AgentChat';

// 在 ProLayout 同级（或内部底层）添加，全局悬浮不影响布局
return (
  <ConfigProvider locale={antdLocale}>
    <ProLayout ...>
      {/* ...existing code... */}
    </ProLayout>
    <AgentChat />
  </ConfigProvider>
);
```

`AgentChat` 通过 `position: fixed` 固定右下角，不影响页面其他内容。

---

## 6. SSE 事件协议

`/chat` 和 `/chat/confirm` 共用同一格式，每行以 `data: ` 开头：

```
data: {"type": "thread_id", "thread_id": "550e8400-e29b-..."}

data: {"type": "token", "content": "您好"}

data: {"type": "tool_start", "name": "create_llm_provider", "input": "{\"name\":\"my-qwen\",...}"}

data: {"type": "tool_end", "name": "create_llm_provider", "output": "✅ 创建成功！", "input": "{...}"}

data: {"type": "confirm_card", "cards": [...], "tool_calls": [...], "thread_id": "uuid"}

data: {"type": "done"}
```

**读操作流**：
```
thread_id → [tool_start → tool_end]* → token* → done
```

**写操作流（两阶段）**：
```
阶段 1 /chat:         thread_id → confirm_card → done（SSE 关闭）
阶段 2 /chat/confirm: tool_start → tool_end → token → done
```

**`confirm_card` 数据结构**：
```json
{
  "type": "confirm_card",
  "thread_id": "uuid",
  "cards": [{
    "tool_name": "create_llm_provider",
    "card_type": "summary",
    "operation": "create",
    "resource_type": "llm_provider",
    "resource_type_name": "AI 服务提供者",
    "resource_name": "my-qwen",
    "risk_level": "low",
    "fields": [{"key": "名称", "value": "my-qwen"}, ...]
  }],
  "tool_calls": [{"name": "create_llm_provider", "args": {...}}]
}
```

---

## 7. 前端路由代理

Agent 服务运行在 `:7091`，前端通过 `/agent/*` 代理请求（避免跨域）。

### 开发环境（ice.js `ice.config.mts`）

```typescript
export default defineConfig({
  proxy: {
    '/agent': {
      target: 'http://localhost:7091',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/agent/, ''),
    },
  },
});
```

### 生产环境（Nginx）

```nginx
location /agent/ {
    proxy_pass http://agent-service:7091/;
    proxy_http_version 1.1;
    proxy_set_header Connection '';      # SSE 长连接，不关闭
    proxy_buffering off;                  # SSE 必须禁用缓冲
    proxy_cache off;
    proxy_read_timeout 300s;
    proxy_set_header Authorization $http_authorization;
}
```

---

## 8. Docker / 部署

### `agent/Dockerfile`

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# 预构建 RAG 索引（knowledge/ 有内容时）
RUN python -c "from rag.indexer import build_index; build_index()" || true
EXPOSE 7091
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7091"]
```

### `docker-compose.agent.yml`

```yaml
services:
  agent:
    build: ./agent
    ports:
      - "7091:7091"
    environment:
      - HIGRESS_BACKEND_URL=http://console:8080
      - LLM_PROVIDER=qwen
      - LLM_MODEL=qwen-max
      - DASHSCOPE_API_KEY=${DASHSCOPE_API_KEY}
    depends_on:
      - console
    restart: unless-stopped
```

### 本地开发快速启动

```bash
cd agent
cp .env.example .env        # 填写 API Key
pip install -r requirements.txt
# 可选：建立 RAG 索引
python -c "from rag.indexer import build_index; build_index()"
# 启动服务
uvicorn main:app --port 7091 --reload
```

---

## 9. 分步实施顺序

### Phase 1：后端工具层（2-3 天）

1. 创建 `agent/` 目录骨架，写 `requirements.txt`
2. 实现 `tools/utils.py`（http_get/post/put/delete）
3. 逐个实现 `tools/core/*.py`（先实现 `list_*` 查询类，验证 API 调用正确性）
4. 完成 `tools/core/__init__.py` CORE_TOOLS 注册表
5. 完成 `tools/__init__.py` LangChain 适配层
6. **验证**：`python -c "from tools.core import list_llm_providers; print(list_llm_providers())"`

### Phase 2：Agent 核心（1-2 天）

1. 实现 `agent.py`（SYSTEM_PROMPT + `_build_llm` 多提供商工厂）
2. 实现 `write_agent.py`（StateGraph + interrupt 确认机制）
3. **验证**：单独运行 `run_write_agent_stream` 测试读操作直接执行、写操作触发 `confirm_card`

### Phase 3：FastAPI 服务（1 天）

1. 实现 `main.py`（4 个端点 + CORS + lifespan 日志）
2. 启动：`uvicorn main:app --port 7091 --reload`
3. **验证**：
   - `curl http://localhost:7091/health`
   - `curl http://localhost:7091/tools`
   - `curl -X POST http://localhost:7091/chat -H "Content-Type: application/json" -d '{"message":"查询所有AI提供者"}'`

### Phase 4：RAG 知识库（1 天，可选）

1. 在 `knowledge/` 下放置 `.md` 文档
2. 实现 `rag/indexer.py` 和 `rag/retriever.py`
3. 运行建索引命令
4. 实现 `tools/core/knowledge_base.py`，在 `CORE_TOOLS` 注册

### Phase 5：前端组件（2-3 天）

1. 实现 `MessageBubble.tsx`（三种角色气泡 + Markdown 渲染）
2. 实现 `ConfirmCard.tsx`（三级确认卡片）
3. 实现 `useAgentChat.ts`（SSE 解析 + 状态管理）
4. 实现 `AgentChat/index.tsx`（悬浮按钮 + 窗口 + 样式）
5. 在 `layout.tsx` 引入 `<AgentChat />`
6. 配置 `ice.config.mts` 代理
7. **验证**：浏览器 Console 无报错，可正常发消息、显示工具气泡、确认卡片交互

### Phase 6：联调与优化（1-2 天）

1. 端到端测试完整写操作流程：发消息 → 确认卡片 → 确认 → 执行 → 总结回复
2. 测试三级确认卡片（create/update/delete）
3. 测试停止按钮（中断 fetch）
4. 测试清空对话
5. 测试错误场景（Agent 服务未启动、网络超时、工具异常）
6. Docker 化部署验证

### Phase 7：MCP Server（可选，1 天）

1. 实现 `mcp_server.py`（自动从 CORE_TOOLS 派生，inspect.signature → inputSchema）
2. 配置 Claude Desktop `~/.claude/claude_desktop_config.json` 接入验证

---

## 10. 新增工具 SOP

以新增"查询插件列表"为例，**只需修改 2 个文件**：

**Step 1**：在 `tools/core/plugin.py` 中编写纯函数：

```python
from ..utils import http_get

def list_plugins() -> str:
    """
    查询所有已安装的 Higress 插件列表。无需任何参数。
    """
    try:
        resp = http_get("/v1/plugins")
        items = resp.json().get("data", {}).get("list", [])
        if not items:
            return "当前没有任何插件。"
        lines = [f"- 名称: {p.get('name')}  版本: {p.get('version','—')}" for p in items]
        return f"当前共 {len(items)} 个插件：\n" + "\n".join(lines)
    except Exception as e:
        return f"❌ 查询失败：{str(e)}"
```

**Step 2**：在 `tools/core/__init__.py` 中注册：

```python
from .plugin import list_plugins

CORE_TOOLS = [
    # ...existing tools...
    list_plugins,   # ← 添加这一行
]
```

**Step 3（可选）**：在前端 `MessageBubble.tsx` 的 `TOOL_DISPLAY_NAME` 中添加中文名：

```typescript
list_plugins: '查询插件列表',
```

**完成。** 无需修改 `agent.py`、`write_agent.py`、`main.py`、`mcp_server.py`、`tools/__init__.py`。

---

> **文档版本**：v2.0  
> **最后更新**：2026-02-26  
> **基于实现**：`agent/` 模块（LangGraph + FastAPI）+ `frontend/src/components/AgentChat/`
