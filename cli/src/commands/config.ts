import { Command } from 'commander'
import chalk from 'chalk'
import { conf, setToken } from '../config.js'
import { createApiClient } from '../api.js'
import inquirer from 'inquirer'

export const configCommand = new Command('config')
  .description('配置 OpenJenny CLI')

configCommand
  .command('set-server <url>')
  .description('设置服务器地址')
  .action((url: string) => {
    conf.set('server_url', url)
    console.log(chalk.green(`  ✓ 服务器地址已设置为: ${url}\n`))
  })

configCommand
  .command('set <key> <value>')
  .description('设置任意配置项（key: server_url | install_dir_local | install_dir_global）')
  .action((key: string, value: string) => {
    const allowed = ['server_url', 'install_dir_local', 'install_dir_global']
    if (!allowed.includes(key)) {
      console.log(chalk.red(`  ✗ 不支持的配置项: ${key}`))
      console.log(chalk.gray(`  可用配置项: ${allowed.join(' | ')}\n`))
      return
    }
    conf.set(key as any, value)
    console.log(chalk.green(`  ✓ ${key} 已设置为: ${value}\n`))
  })

configCommand
  .command('login')
  .description('登录并保存 Token')
  .action(async () => {
    const { username, password } = await inquirer.prompt([
      { type: 'input', name: 'username', message: '用户名：' },
      { type: 'password', name: 'password', message: '密码：', mask: '*' },
    ])

    try {
      const api = createApiClient()
      const { data } = await api.post('/auth/login', { username, password })
      setToken(data.access_token)
      console.log(chalk.green(`  ✓ 登录成功，欢迎 ${data.user.username}！\n`))
    } catch {
      console.log(chalk.red('  ✗ 登录失败，请检查用户名和密码\n'))
    }
  })

configCommand
  .command('logout')
  .description('退出登录')
  .action(() => {
    setToken('')
    console.log(chalk.green('  ✓ 已退出登录\n'))
  })

configCommand
  .command('show')
  .description('查看当前配置')
  .action(() => {
    console.log(chalk.gray('  当前配置：\n'))
    console.log(`  ${chalk.white('服务器地址：')} ${chalk.cyan(conf.get('server_url'))}`)
    console.log(`  ${chalk.white('本地安装目录：')} ${chalk.cyan(conf.get('install_dir_local'))}`)
    console.log(`  ${chalk.white('全局安装目录：')} ${chalk.cyan(conf.get('install_dir_global'))}`)
    const token = conf.get('token')
    console.log(`  ${chalk.white('登录状态：')} ${token ? chalk.green('已登录') : chalk.red('未登录')}`)
    console.log()
  })
