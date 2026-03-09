import { Command } from 'commander'
import inquirer from 'inquirer'
import ora from 'ora'
import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import { createApiClient } from '../api.js'
import { getAgentConfig, listSupportedAgents } from '../agents.js'
import { getServerUrl } from '../config.js'
import extractZip from 'extract-zip'

export const installCommand = new Command('install')
  .description('安装一个或多个 Skill')
  .argument('<skills...>', 'Skill 名称（支持 name@version 格式）')
  .option('-g, --global', '全局安装（安装到 HOME 目录下）', false)
  .option('-l, --local', '本地安装（安装到当前项目目录）', false)
  .option('-d, --dir <path>', '自定义安装目录（覆盖 agent 默认路径）')
  .option(
    '-a, --agent <agent>',
    `目标 Agent（${listSupportedAgents().map((a) => a.name).join(' | ')}）`,
    'claude',
  )
  .action(async (skills: string[], options: {
    global: boolean
    local: boolean
    dir?: string
    agent: string
  }) => {
    const api = createApiClient()
    const agentCfg = getAgentConfig(options.agent)

    // ── 确定 scope ────────────────────────────────────
    let scope: 'local' | 'global'
    if (options.global) {
      scope = 'global'
    } else if (options.local) {
      scope = 'local'
    } else {
      const localDir = agentCfg.skillsDir('local')
      const globalDir = agentCfg.skillsDir('global')
      const { answer } = await inquirer.prompt([{
        type: 'list',
        name: 'answer',
        message: `安装到哪里？ ${chalk.gray(`(Agent: ${agentCfg.label})`)}`,
        choices: [
          { name: `本地  (${localDir})`, value: 'local' },
          { name: `全局  (${globalDir})`, value: 'global' },
        ],
      }])
      scope = answer
    }

    const installDir = options.dir ?? agentCfg.skillsDir(scope)

    console.log(chalk.gray(`  🤖 Agent : ${chalk.white(agentCfg.label)}`))
    console.log(chalk.gray(`  📁 目录  : ${installDir}\n`))

    // ── 逐个安装 ─────────────────────────────────────
    for (const skillArg of skills) {
      const [skillName, version] = skillArg.split('@')
      const spinner = ora(
        `安装 ${chalk.cyan(skillName)}${version ? chalk.gray('@' + version) : ''}...`,
      ).start()

      try {
        // 获取 skill 元信息
        const { data: skill } = await api.get(`/skills/${skillName}`)
        const targetVersion = version || skill.version

        // 下载文件
        const downloadUrl = `${api.defaults.baseURL?.replace('/api', '')}/api/skills/${skillName}/download${version ? `?version=${version}` : ''}`
        const response = await api.get(downloadUrl, { responseType: 'arraybuffer' })

        // 创建安装目录 installDir/<skillName>/
        const destDir = path.join(installDir, skillName)
        fs.mkdirSync(destDir, { recursive: true })

        const contentDisposition = response.headers['content-disposition'] || ''
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
        const filename = filenameMatch ? filenameMatch[1] : `${skillName}.zip`
        const ext = path.extname(filename).toLowerCase()

        const filePath = path.join(destDir, filename)
        fs.writeFileSync(filePath, Buffer.from(response.data))

        // zip 自动解压
        if (ext === '.zip') {
          await extractZip(filePath, { dir: path.resolve(destDir) })
          fs.unlinkSync(filePath)
        }

        // 写入元信息（包含 agent 字段）
        const meta = {
          name: skillName,
          display_name: skill.display_name,
          version: targetVersion,
          agent: agentCfg.name,
          scope,
          dir: destDir,
          installed_at: new Date().toISOString(),
        }
        fs.writeFileSync(
          path.join(destDir, '.skill-meta.json'),
          JSON.stringify(meta, null, 2),
        )

        spinner.succeed(
          `${chalk.green('✓')} ${chalk.cyan(skillName)} ${chalk.gray(`v${targetVersion}`)} → ${chalk.dim(destDir)}`,
        )

        if (skill.usage_guide) {
          console.log(
            chalk.gray(
              `\n  💡 使用提示:\n  ${skill.usage_guide.split('\n').slice(0, 3).join('\n  ')}\n`,
            ),
          )
        }
      } catch (err: any) {
        if (err.response?.status === 404) {
          spinner.fail(`${chalk.red('✗')} Skill ${chalk.cyan(skillName)} 不存在`)
        } else {
          let detail: string
          if (err.response?.data) {
            detail = JSON.stringify(err.response.data)
          } else if (err.code === 'ECONNREFUSED' || err.cause?.code === 'ECONNREFUSED') {
            detail = `无法连接服务器 ${api.defaults.baseURL}，请确认服务已启动且地址正确`
          } else if (err.code === 'ENOTFOUND' || err.cause?.code === 'ENOTFOUND') {
            detail = `域名解析失败，请检查 server_url 配置`
          } else if (err.errors) {
            // AggregateError：提取内部所有子错误信息
            detail = (err.errors as Error[]).map((e) => e.message || String(e)).join('; ')
          } else {
            detail = err.message || String(err)
          }
          spinner.fail(`${chalk.red('✗')} 安装 ${chalk.cyan(skillName)} 失败: ${detail}`)
          console.log(chalk.gray(`  当前 server_url: ${getServerUrl()}`))
          console.log(chalk.gray(`  可通过 openjenny config set server_url <地址> 修改`))
        }
      }
    }

    // ── Agent 提示 ────────────────────────────────────
    if (agentCfg.hint) {
      console.log(`\n  ${chalk.yellow('ℹ')} ${chalk.gray(agentCfg.hint)}`)
    }
    console.log()
  })
