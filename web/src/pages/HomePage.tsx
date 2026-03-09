import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search, SlidersHorizontal, Terminal, X, ChevronLeft, ChevronRight,
  Tag, Zap, PackagePlus, Loader2
} from 'lucide-react'
import { skillsApi } from '../lib/services'
import SkillCard from '../components/SkillCard'
import InstallCommandModal from '../components/InstallCommandModal'

const SORTS = [
  { value: 'created_at', label: '最新' },
  { value: 'download_count', label: '最多下载' },
]

const SEARCH_MODES = [
  { value: 'fuzzy',     label: '模糊',    icon: Search, tip: '在名称、描述、标签中模糊搜索' },
  { value: 'exact_tag', label: '精确标签', icon: Tag,    tip: '精确匹配标签' },
] as const

type SearchMode = 'fuzzy' | 'exact_tag'

export default function HomePage() {
  const [q, setQ] = useState('')
  const [search, setSearch] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('fuzzy')
  const [activeMode, setActiveMode] = useState<SearchMode>('fuzzy')   // 已生效的模式
  const [sort, setSort] = useState('created_at')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [showModal, setShowModal] = useState(false)
  const [modalSkills, setModalSkills] = useState<string[]>([])   // 实际传给弹窗的列表
  const [selectMode, setSelectMode] = useState(false)
  const [installAllLoading, setInstallAllLoading] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const skeletonTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // searchMode: 当前选中（未提交），activeMode: 已提交生效的模式
  const isExactMode = activeMode === 'exact_tag'

  const { data, isLoading } = useQuery({
    queryKey: ['skills', search, activeMode, sort, page],
    queryFn: () => skillsApi.list({
      q: search || undefined,
      search_mode: activeMode,
      sort,
      page,
      page_size: 12,
    }),
  })

  // isLoading 超过 5 秒才显示骨架屏，避免短暂闪烁
  useEffect(() => {
    if (isLoading) {
      skeletonTimerRef.current = setTimeout(() => {
        setShowSkeleton(true)
      }, 5000)
    } else {
      if (skeletonTimerRef.current) {
        clearTimeout(skeletonTimerRef.current)
        skeletonTimerRef.current = null
      }
      setShowSkeleton(false)
    }
    return () => {
      if (skeletonTimerRef.current) {
        clearTimeout(skeletonTimerRef.current)
        skeletonTimerRef.current = null
      }
    }
  }, [isLoading])

  // 精确搜索时查询全量总数（仅用于按钮上显示数字）
  const { data: exactNamesData } = useQuery({
    queryKey: ['exact-names-count', search, activeMode],
    queryFn: () => skillsApi.getExactNames({ q: search, search_mode: activeMode }),
    enabled: isExactMode && !!search,
    staleTime: 30_000,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setActiveMode(searchMode)
    setSearch(q)
    setPage(1)
  }

  const handleClear = () => {
    setQ('')
    setSearch('')
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

  const handleInstallAll = async () => {
    setInstallAllLoading(true)
    try {
      // 点击时实时请求，确保拿到最新的全量名称
      const result = await skillsApi.getExactNames({ q: search, search_mode: activeMode })
      if (!result.names.length) return
      setModalSkills(result.names)
      setShowModal(true)
    } catch {
      // 静默失败，toast 可在此添加
    } finally {
      setInstallAllLoading(false)
    }
  }

  const placeholderMap: Record<SearchMode, string> = {
    fuzzy:      '模糊搜索名称、描述、标签...',
    exact_tag:  '输入精确的标签名...',
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
      <div className="max-w-2xl mx-auto mb-6">
        {/* 搜索模式切换 */}
        <div className="flex gap-1 mb-2">
          {SEARCH_MODES.map((m) => {
            const Icon = m.icon
            return (
              <button
                key={m.value}
                type="button"
                title={m.tip}
                onClick={() => {
                  setSearchMode(m.value)
                  setActiveMode(m.value)
                  setPage(1)
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                  ${searchMode === m.value
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    : 'bg-white/5 text-gray-500 hover:text-gray-300 border border-transparent'}`}
              >
                <Icon size={12} />
                {m.label}
              </button>
            )
          })}
          {searchMode !== 'fuzzy' && (
            <span className="ml-auto flex items-center gap-1 text-xs text-amber-400/80">
              <Zap size={11} />
              精确搜索模式
            </span>
          )}
        </div>

        {/* 搜索输入 */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={placeholderMap[searchMode]}
              className={`w-full pl-10 pr-4 py-3 bg-gray-900 border rounded-xl text-white placeholder-gray-500 
                focus:outline-none transition-colors
                ${searchMode !== 'fuzzy'
                  ? 'border-amber-500/30 focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/20'
                  : 'border-white/10 focus:border-sky-500/70 focus:ring-1 focus:ring-sky-500/30'}`}
            />
            {q && (
              <button type="button" onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            )}
          </div>
          <button type="submit"
            className={`px-5 py-3 rounded-xl font-semibold transition-colors shadow-sm text-white
              ${searchMode !== 'fuzzy'
                ? 'bg-amber-500 hover:bg-amber-400'
                : 'bg-sky-500 hover:bg-sky-400'}`}>
            搜索
          </button>
        </form>
      </div>

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

        <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
          {/* 精确搜索时显示"安装全部"按钮：有精确搜索词即显示 */}
          {isExactMode && !!search && (
            <button
              onClick={handleInstallAll}
              disabled={installAllLoading || !exactNamesData?.total}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 transition-colors font-medium disabled:opacity-40"
            >
              {installAllLoading
                ? <Loader2 size={14} className="animate-spin" />
                : <PackagePlus size={14} />}
              安装全部
              {exactNamesData && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-bold">
                  {exactNamesData.total}
                </span>
              )}
            </button>
          )}

          {/* 多选模式 */}
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
              <button onClick={() => { setModalSkills(selected); setShowModal(true) }}
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
      {showSkeleton ? (
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
        <InstallCommandModal skillNames={modalSkills} onClose={() => { setShowModal(false); setModalSkills([]) }} />
      )}
    </div>
  )
}
