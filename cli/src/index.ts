#!/usr/bin/env node
import { program } from 'commander'
import { installCommand } from './commands/install.js'
import { searchCommand } from './commands/search.js'
import { listCommand } from './commands/list.js'
import { uninstallCommand } from './commands/uninstall.js'
import { configCommand } from './commands/config.js'
import chalk from 'chalk'

const VERSION = '1.0.0'

console.log(chalk.cyan.bold('\n  OpenJenny CLI') + chalk.gray(` v${VERSION}\n`))

program
  .name('openjenny')
  .description('团队 Skill 共享平台命令行工具')
  .version(VERSION)

program.addCommand(installCommand)
program.addCommand(searchCommand)
program.addCommand(listCommand)
program.addCommand(uninstallCommand)
program.addCommand(configCommand)

program.parse()
