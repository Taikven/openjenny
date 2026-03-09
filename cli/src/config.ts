import Conf from 'conf'

interface ConfigSchema {
  server_url: string
  token: string
  install_dir_local: string
  install_dir_global: string
}

export const conf = new Conf<ConfigSchema>({
  projectName: 'openjenny',
  defaults: {
    server_url: 'http://localhost:8669',
    token: '',
    install_dir_local: '.jenny/skills',
    install_dir_global: `${process.env.HOME || process.env.USERPROFILE}/.jenny/skills`,
  },
})

export function getServerUrl(): string {
  return conf.get('server_url')
}

export function getToken(): string {
  return conf.get('token')
}

export function setToken(token: string): void {
  conf.set('token', token)
}
