// 技能相关 API
import api from './api'

export interface Skill {
  id: number
  name: string
  slug: string
  display_name: string
  description?: string
  usage_guide?: string
  version: string
  file_type?: string
  readme_content?: string
  tags?: string
  status: string
  download_count: number
  like_count: number
  author: { id: number; username: string; avatar?: string }
  versions: { id: number; version: string; changelog?: string; created_at: string }[]
  created_at: string
  updated_at?: string
}

export interface SkillListResponse {
  items: Skill[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface User {
  id: number
  username: string
  avatar?: string
  bio?: string
  is_admin: boolean
  created_at: string
}

// ─── Skills ────────────────────────────────────────────
export const skillsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<SkillListResponse>('/skills', { params }).then((r) => r.data),

  get: (name: string) =>
    api.get<Skill>(`/skills/${name}`).then((r) => r.data),

  create: (form: FormData) =>
    api.post<Skill>('/skills', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  update: (name: string, form: FormData) =>
    api.patch<Skill>(`/skills/${name}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  delete: (name: string) =>
    api.delete(`/skills/${name}`),

  updateTags: (name: string, tags: string) =>
    api.patch<Skill>(`/skills/${name}/tags`, { tags }).then((r) => r.data),

  getInstallCommand: (skill_names: string[]) =>
    api.post<{ command: string; skills: string[] }>('/skills/install-command', {
      skill_names,
    }).then((r) => r.data),

  getExactNames: (params: { q?: string; search_mode?: string; tag?: string; author?: string }) =>
    api.get<{ names: string[]; total: number }>('/skills/query/exact-search', { params }).then((r) => r.data),

  downloadUrl: (name: string, version?: string) =>
    `/api/skills/${name}/download${version ? `?version=${version}` : ''}`,
}

// ─── Auth ──────────────────────────────────────────────
export const authApi = {
  register: (data: { username: string; password: string }) =>
    api.post<User>('/auth/register', data).then((r) => r.data),

  login: (data: { username: string; password: string }) =>
    api.post<{ access_token: string; token_type: string; user: User }>(
      '/auth/login',
      data
    ).then((r) => r.data),

  me: () => api.get<User>('/auth/me').then((r) => r.data),

  updateMe: (data: { bio?: string; avatar?: string }) =>
    api.patch<User>('/auth/me', data).then((r) => r.data),

  getByUsername: (username: string) =>
    api.get<User>(`/auth/users/${username}`).then((r) => r.data),
}

// ─── Stats ─────────────────────────────────────────────
export const statsApi = {
  get: () =>
    api
      .get<{
        total_skills: number
        total_users: number
        total_downloads: number
        top_skills: { name: string; display_name: string; download_count: number }[]
      }>('/stats')
      .then((r) => r.data),
}

// ─── Likes ─────────────────────────────────────────────
export const likesApi = {
  toggle: (skillName: string) =>
    api.post<{ liked: boolean; like_count: number }>(`/skills/${skillName}/like`).then((r) => r.data),

  myLike: (skillName: string) =>
    api.get<{ liked: boolean; like_count: number }>(`/skills/${skillName}/like/my`).then((r) => r.data),
}

// ─── Comments ──────────────────────────────────────────
export const commentsApi = {
  list: (skillName: string) =>
    api.get(`/skills/${skillName}/comments`).then((r) => r.data),

  add: (skillName: string, content: string, parent_id?: number) =>
    api.post(`/skills/${skillName}/comments`, { content, parent_id }).then((r) => r.data),

  delete: (commentId: number) =>
    api.delete(`/comments/${commentId}`),
}
