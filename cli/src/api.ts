import axios from 'axios'
import { getServerUrl, getToken } from './config.js'

export function createApiClient() {
  const client = axios.create({ baseURL: `${getServerUrl()}/api` })
  const token = getToken()
  if (token) client.defaults.headers.common['Authorization'] = `Bearer ${token}`
  return client
}
