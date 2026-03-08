import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal, Terminal, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { skillsApi } from '../lib/services'
import SkillCard from '../components/SkillCard'
import InstallCommandModal from '../components/InstallCommandModal'

const SORTS = [
  { value: 'created_at', label: '最新' },
  { value: 'download_count', label: '最多下载' },
]

export default function HomePage() {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('created_at')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [showModal, setShowModal] = useState(false)
  const [selectMode, setSelectMode] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['skills', search, sort, page],
    queryFn: () => skillsApi.list({ q: search || undefined, sort, page, page_size: 12 }),
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(q)
    setPage(1)
  }

  const toggleSelect = (name: string) => {
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    )
  }

  const clearSelect = () => {
    setSelected([])
    setSelectMode(false)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white mb-3">
          团队 <span className="text-sky-500">Skill</span> 共享平台
        </h1>
        <p className="text-gray-400 text-lg">发现、安装、分享团队成员的技能包</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-6 max-w-2xl mx-auto">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索 skill 名称、描述、标签..."
            className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-sky-500/70 focus:ring-1 focus:ring-sky-500/30 transition-colors"
          />
          {q && (
            <button type="button" onClick={() => { setQ(''); setSearch(''); setPage(1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>
        <button type="submit"
          className="px-5 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold transition-colors shadow-sm">
          搜索
        </button>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1.5 text-sm text-gray-400">
          <SlidersHorizontal size={16} />
          <span>排序</span>
        </div>
        {SORTS.map((s) => (
          <button key={s.value} onClick={() => { setSort(s.value); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors
              ${sort === s.value
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'}`}>
            {s.label}
          </button>
        ))}

        {/* 多选模式 */}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => { setSelectMode(!selectMode); setSelected([]) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors
              ${selectMode
                ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                : 'bg-white/5 text-gray-400 hover:text-white border border-transparent'}`}>
            <Terminal size={14} />
            {selectMode ? '退出多选' : '批量安装'}
          </button>
          {selected.length > 0 && (
            <>
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-sky-500 hover:bg-sky-400 text-white transition-colors font-medium shadow-sm">
                <Terminal size={14} /> 获取安装命令 ({selected.length})
              </button>
              <button onClick={clearSelect} className="text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-white/5 rounded-xl p-5 animate-pulse">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-gray-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-800 rounded w-3/4" />
                  <div className="h-3 bg-gray-800 rounded w-1/2" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-800 rounded" />
                <div className="h-3 bg-gray-800 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <Search size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg">没有找到相关 Skill</p>
          {search && <p className="text-sm mt-1">尝试其他关键词</p>}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {data?.items.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                selected={selected.includes(skill.name)}
                onSelect={toggleSelect}
                showCheckbox={selectMode}
              />
            ))}
          </div>

          {/* Pagination */}
          {data && data.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-gray-400 transition-colors">
                <ChevronLeft size={18} />
              </button>
              {Array.from({ length: data.total_pages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === data.total_pages || Math.abs(p - page) <= 2)
                .map((p, idx, arr) => (
                  <>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span key={`ellipsis-${p}`} className="text-gray-400 px-1">…</span>
                    )}
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors
                        ${page === p ? 'bg-sky-500 text-white' : 'bg-white/5 hover:bg-white/10 text-gray-400'}`}>
                      {p}
                    </button>
                  </>
                ))}
              <button onClick={() => setPage(p => Math.min(data.total_pages, p + 1))} disabled={page === data.total_pages}
                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 flex items-center justify-center text-gray-400 transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          )}

          {data && (
            <p className="text-center text-sm text-gray-400 mt-4">
              共 {data.total} 个 Skill
            </p>
          )}
        </>
      )}

      {showModal && (
        <InstallCommandModal skillNames={selected} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
