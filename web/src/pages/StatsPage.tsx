import { useQuery } from '@tanstack/react-query'
import { statsApi } from '../lib/services'
import { Package, Users, Download, TrendingUp } from 'lucide-react'

export default function StatsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: statsApi.get,
  })

  const stats = [
    { label: '总 Skill 数', value: data?.total_skills ?? 0, icon: <Package size={22} />, color: 'sky' },
    { label: '团队成员', value: data?.total_users ?? 0, icon: <Users size={22} />, color: 'violet' },
    { label: '总下载次数', value: data?.total_downloads ?? 0, icon: <Download size={22} />, color: 'emerald' },
  ]

  if (isLoading) return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-4">
      <div className="h-8 bg-gray-800 rounded w-48" />
      <div className="grid grid-cols-3 gap-4">
        {[1,2,3].map(i => <div key={i} className="h-28 bg-gray-900 rounded-xl" />)}
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="text-sky-400" /> 平台统计
        </h1>
        <p className="text-gray-400 text-sm mt-1">OpenJenny 使用概况</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label}
            className="bg-gray-900 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors">
            <div className={`w-11 h-11 rounded-xl mb-4 flex items-center justify-center
              ${s.color === 'sky' ? 'bg-sky-500/20 text-sky-400' : s.color === 'violet' ? 'bg-violet-500/20 text-violet-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
              {s.icon}
            </div>
            <p className="text-3xl font-bold text-white">{s.value.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Top skills */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-5 flex items-center gap-2">
          <TrendingUp size={18} className="text-sky-400" /> 下载排行 TOP 5
        </h2>
        <div className="space-y-3">
          {data?.top_skills.map((s, i) => (
            <div key={s.name} className="flex items-center gap-4">
              <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0
                ${i === 0 ? 'bg-yellow-500/20 text-yellow-400' : i === 1 ? 'bg-gray-400/20 text-gray-400' : i === 2 ? 'bg-amber-700/20 text-amber-600' : 'bg-white/5 text-gray-500'}`}>
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{s.display_name}</p>
                <code className="text-gray-500 text-xs">{s.name}</code>
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-400">
                <Download size={14} />
                <span className="font-medium">{s.download_count.toLocaleString()}</span>
              </div>
            </div>
          ))}
          {(!data?.top_skills || data.top_skills.length === 0) && (
            <p className="text-gray-600 text-sm text-center py-4">暂无数据</p>
          )}
        </div>
      </div>
    </div>
  )
}
