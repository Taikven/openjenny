import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { createApiClient } from '../api.js'
import { getServerUrl } from '../config.js'

export const searchCommand = new Command('search')
  .description('搜索 Skill')
  .argument('<keyword>', '搜索关键词')
  .option('-n, --limit <n>', '最多显示数量', '10')
  .action(async (keyword: string, options: { limit: string }) => {
    const api = createApiClient()
    const spinner = ora(`搜索 "${keyword}"...`).start()

    try {
      const { data } = await api.get('/skills', {
        params: { q: keyword, page_size: parseInt(options.limit) },
      })
      spinner.stop()

      if (data.items.length === 0) {
        console.log(chalk.yellow(`  未找到与 "${keyword}" 相关的 Skill\n`))
        return
      }

      console.log(chalk.gray(`  找到 ${data.total} 个结果，显示前 ${data.items.length} 个：\n`))

      data.items.forEach((skill: any, i: number) => {
        console.log(`  ${chalk.cyan(skill.name.padEnd(25))} ${chalk.white(skill.display_name.padEnd(20))} ${chalk.gray('v' + skill.version)} ${chalk.yellow('★ ' + skill.avg_rating.toFixed(1))} ${chalk.gray('↓ ' + skill.download_count)}`)
        if (skill.description) {
          console.log(`  ${chalk.gray('  ' + skill.description.slice(0, 70) + (skill.description.length > 70 ? '...' : ''))}`)
        }
        if (i < data.items.length - 1) console.log()
      })

      console.log(chalk.gray(`\n  安装命令: ${chalk.cyan('openjenny install <skill-name>')}\n`))
      console.log(chalk.gray(`  在线浏览: ${chalk.underline(getServerUrl().replace(':8001', ':5173'))}\n`))
    } catch (err: any) {
      spinner.fail(chalk.red('搜索失败: ' + err.message))
    }
  })
