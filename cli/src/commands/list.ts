import { Command } from 'commander'
import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import { getAgentConfig, listSupportedAgents } from '../agents.js'

export const listCommand = new Command('list')
  .alias('ls')
  .description('列出已安装的 Skill')
  .option('-g, --global', '显示全局安装', false)
  .option(
    '-a, --agent <agent>',
    `目标 Agent（${listSupportedAgents().map((a) => a.name).join(' | ')} | all）`,
    'claude',
  )
  .action((options: { global: boolean; agent: string }) => {
    const scope = options.global ? 'global' : 'local'

    // --agent all：遍历所有已知 agent
    const agents =
      options.agent === 'all'
        ? listSupportedAgents()
        : [getAgentConfig(options.agent)]

    let totalShown = 0

    for (const agentCfg of agents) {
      const baseDir = agentCfg.skillsDir(scope)

      if (!fs.existsSync(baseDir)) continue

      const dirs = fs.readdirSync(baseDir).filter((d) =>
        fs.existsSync(path.join(baseDir, d, '.skill-meta.json')),
      )

      if (dirs.length === 0) continue

      console.log(
        chalk.cyan(`\n  🤖 ${agentCfg.label}`) +
        chalk.gray(` (${scope === 'global' ? '全局' : '本地'}) — ${baseDir}`),
      )
      console.log(chalk.gray('  ' + '─'.repeat(60)))

      dirs.forEach((d) => {
        try {
          const meta = JSON.parse(
            fs.readFileSync(path.join(baseDir, d, '.skill-meta.json'), 'utf-8'),
          )
          console.log(
            `  ${chalk.cyan((meta.name as string).padEnd(25))}` +
            `  ${chalk.white((meta.display_name || '').padEnd(25))}` +
            `  ${chalk.gray('v' + meta.version)}`,
          )
        } catch {
          console.log(`  ${chalk.gray(d)} ${chalk.red('(元信息损坏)')}`)
        }
      })
      totalShown += dirs.length
    }

    if (totalShown === 0) {
      console.log(chalk.yellow(`\n  暂无已安装的 Skill\n`))
    } else {
      console.log(chalk.gray(`\n  共 ${totalShown} 个 Skill\n`))
    }
  })
