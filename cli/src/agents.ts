import path from 'path'
import os from 'os'

export type AgentName = 'claude' | string

export interface AgentConfig {
  name: AgentName
  label: string
  /** 计算 skill 安装目录 */
  skillsDir: (scope: 'local' | 'global') => string
  /** 安装后的提示说明 */
  hint?: string
}

const HOME = os.homedir()

// ──────────────────────────────────────────────
//  已支持的 Agent 定义
// ──────────────────────────────────────────────
const AGENTS: Record<AgentName, AgentConfig> = {
  claude: {
    name: 'claude',
    label: 'Claude (Anthropic)',
    skillsDir: (scope) =>
      scope === 'global'
        ? path.join(HOME, '.claude', 'skills')
        : path.join(process.cwd(), '.claude', 'skills'),
    hint: 'Skills 已安装到 .claude/skills/，Claude 可自动识别该目录下的 skill。',
  },
}

/** 获取 Agent 配置，未知 agent 返回通用目录（.{agent}/skills） */
export function getAgentConfig(agent: AgentName): AgentConfig {
  if (AGENTS[agent]) return AGENTS[agent]

  // 兜底：未知 agent，使用 .{agent}/skills 目录约定
  return {
    name: agent,
    label: agent,
    skillsDir: (scope) =>
      scope === 'global'
        ? path.join(HOME, `.${agent}`, 'skills')
        : path.join(process.cwd(), `.${agent}`, 'skills'),
    hint: `Skills 已安装到 .${agent}/skills/ 目录。`,
  }
}

export function listSupportedAgents(): AgentConfig[] {
  return Object.values(AGENTS)
}
