import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { User, Package, Calendar, Download } from 'lucide-react'
import { authApi, skillsApi } from '../lib/services'
import { useAuthStore } from '../lib/store'
import SkillCard from '../components/SkillCard'

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { user: me } = useAuthStore()

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['user', username],
    queryFn: () => authApi.getByUsername(username!),
    enabled: !!username,
  })

  const { data: skillsData, isLoading: skillsLoading } = useQuery({
    queryKey: ['skills', { author: username }],
    queryFn: () => skillsApi.list({ author: username, page_size: 50 }),
    enabled: !!username,
  })

  const isMe = me?.username === username

  if (profileLoading) return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-pulse space-y-6">
      <div className="flex items-center gap-5">
        <div className="w-20 h-20 rounded-2xl bg-gray-800" />
        <div className="space-y-2">
          <div className="h-6 w-40 bg-gray-800 rounded" />
          <div className="h-4 w-24 bg-gray-800 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-900 rounded-xl" />)}
      </div>
    </div>
  )

  if (!profile) return (
    <div className="text-center py-24 text-gray-500">
      <User size={48} className="mx-auto mb-4 opacity-30" />
      <p>用户不存在</p>
    </div>
  )

  const skills = skillsData?.items ?? []
  const totalDownloads = skills.reduce((s, k) => s + k.download_count, 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Profile header */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-black text-3xl flex-shrink-0 select-none">
            {profile.username[0].toUpperCase()}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-white">{profile.username}</h1>
              {profile.is_admin && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400 font-medium">管理员</span>
              )}
              {isMe && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-sky-500/20 text-sky-400 font-medium">我</span>
              )}
            </div>
            {profile.bio && (
              <p className="text-gray-400 text-sm mt-1">{profile.bio}</p>
            )}
            <div className="flex items-center gap-1.5 mt-2 text-gray-500 text-xs">
              <Calendar size={12} />
              <span>加入于 {new Date(profile.created_at).toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
          {isMe && (
            <Link to="/upload"
              className="flex-shrink-0 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-sm font-medium transition-colors">
              上传 Skill
            </Link>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-gray-950 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-sky-400 mb-1">
              <Package size={16} />
            </div>
            <p className="text-2xl font-bold text-white">{skills.length}</p>
            <p className="text-gray-500 text-xs mt-0.5">已发布 Skill</p>
          </div>
          <div className="bg-gray-950 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-emerald-400 mb-1">
              <Download size={16} />
            </div>
            <p className="text-2xl font-bold text-white">{totalDownloads.toLocaleString()}</p>
            <p className="text-gray-500 text-xs mt-0.5">总下载量</p>
          </div>
        </div>
      </div>

      {/* Skills list */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Package size={18} className="text-sky-400" />
          发布的 Skill
          <span className="text-sm text-gray-500 font-normal">({skills.length})</span>
        </h2>

        {skillsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="h-44 bg-gray-900 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-16 text-gray-600">
            <Package size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">还没有发布任何 Skill</p>
            {isMe && (
              <Link to="/upload" className="mt-3 inline-block text-sky-400 hover:text-sky-300 text-sm transition-colors">
                去上传第一个 →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {skills.map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
