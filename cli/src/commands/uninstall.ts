import { Command } from 'commander'
import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import { getAgentConfig, listSupportedAgents } from '../agents.js'

export const uninstallCommand = new Command('uninstall')
  .alias('remove')
  .description('卸载 Skill')
  .argument('<skill>', 'Skill 名称')
  .option('-g, --global', '从全局目录卸载', false)
  .option(
    '-a, --agent <agent>',
    `目标 Agent（${listSupportedAgents().map((a) => a.name).join(' | ')}）`,
    'claude',
  )
  .action((skill: string, options: { global: boolean; agent: string }) => {
    const agentCfg = getAgentConfig(options.agent)
    const scope = options.global ? 'global' : 'local'
    const baseDir = agentCfg.skillsDir(scope)
    const destDir = path.join(baseDir, skill)

    if (!fs.existsSync(destDir)) {
      console.log(
        chalk.red(`  ✗ Skill ${chalk.cyan(skill)} 未安装`) +
        chalk.gray(` (${destDir})\n`),
      )
      process.exit(1)
    }

    fs.rmSync(destDir, { recursive: true, force: true })
    console.log(
      chalk.green(`  ✓ ${chalk.cyan(skill)} 已从 ${chalk.dim(destDir)} 卸载\n`),
    )
  })
