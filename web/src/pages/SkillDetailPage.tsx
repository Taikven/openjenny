import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Download, ThumbsUp, Tag, ArrowLeft, Terminal, Archive, FileText, User, Calendar, RefreshCw, Trash2, X, Pencil, Check, Plus } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { skillsApi, likesApi, commentsApi } from '../lib/services'
import { useAuthStore } from '../lib/store'
import InstallCommandModal from '../components/InstallCommandModal'
import toast from 'react-hot-toast'

// 渲染评论内容，高亮开头的 @username
function renderContent(content: string) {
  const match = content.match(/^(@\S+)\s(.*)$/s)
  if (match) {
    return (
      <span>
        <span className="text-sky-400 font-medium">{match[1]}</span>
        {' '}{match[2]}
      </span>
    )
  }
  return <span>{content}</span>
}

export default function SkillDetailPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const { user, isLoggedIn } = useAuthStore()
  const qc = useQueryClient()
  const [showInstall, setShowInstall] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: number; username: string } | null>(null)
  const [tab, setTab] = useState<'guide' | 'versions'>('guide')
  const [editingTags, setEditingTags] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [draftTags, setDraftTags] = useState<string[]>([])
  const tagInputRef = useRef<HTMLInputElement>(null)

  const { data: skill, isLoading } = useQuery({
    queryKey: ['skill', name],
    queryFn: () => skillsApi.get(name!),
    enabled: !!name,
  })

  const { data: myLike } = useQuery({
    queryKey: ['like', name],
    queryFn: () => likesApi.myLike(name!),
    enabled: !!name && isLoggedIn(),
  })

  const { data: comments, refetch: refetchComments } = useQuery({
    queryKey: ['comments', name],
    queryFn: () => commentsApi.list(name!),
    enabled: !!name,
  })

  const likeMutation = useMutation({
    mutationFn: () => likesApi.toggle(name!),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['skill', name] })
      qc.invalidateQueries({ queryKey: ['like', name] })
      toast.success(res.liked ? '已点赞 👍' : '已取消点赞')
    },
  })

  const commentMutation = useMutation({
    mutationFn: ({ content, parent_id }: { content: string; parent_id?: number }) => {
      const finalContent = replyTo ? `@${replyTo.username} ${content}` : content
      return commentsApi.add(name!, finalContent, parent_id)
    },
    onSuccess: () => {
      setCommentText('')
      setReplyTo(null)
      refetchComments()
      toast.success('评论成功')
    },
  })

  const deleteCommentMutation = useMutation({
    mutationFn: (id: number) => commentsApi.delete(id),
    onSuccess: () => { refetchComments(); toast.success('已删除') },
  })

  const deleteMutation = useMutation({
    mutationFn: () => skillsApi.delete(name!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] })
      toast.success('已删除')
      navigate('/')
    },
  })

  const updateTagsMutation = useMutation({
    mutationFn: (tags: string) => skillsApi.updateTags(name!, tags),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skill', name] })
      setEditingTags(false)
      toast.success('标签已更新')
    },
    onError: () => toast.error('更新失败'),
  })

  const startEditTags = () => {
    setDraftTags(skill?.tags ? skill.tags.split(',').map((t) => t.trim()).filter(Boolean) : [])
    setTagInput('')
    setEditingTags(true)
    setTimeout(() => tagInputRef.current?.focus(), 50)
  }

  const addDraftTag = () => {
    const v = tagInput.trim()
    if (v && !draftTags.includes(v)) setDraftTags((prev) => [...prev, v])
    setTagInput('')
    tagInputRef.current?.focus()
  }

  const removeDraftTag = (t: string) => setDraftTags((prev) => prev.filter((x) => x !== t))

  const saveTags = () => updateTagsMutation.mutate(draftTags.join(','))

  if (isLoading) return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse space-y-4">
      <div className="h-8 bg-gray-800 rounded w-48" />
      <div className="h-40 bg-gray-900 rounded-xl" />
    </div>
  )

  if (!skill) return (
    <div className="text-center py-24 text-gray-500">
      <p>Skill 不存在</p>
    </div>
  )

  const tagList = skill.tags ? skill.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
  const canEdit = user?.id === skill.author.id || user?.is_admin
  const downloadUrl = skillsApi.downloadUrl(skill.name)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back */}
      <button onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-6 transition-colors text-sm">
        <ArrowLeft size={16} /> 返回列表
      </button>

      {/* Header card */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-sky-500/20 to-blue-600/20 border border-sky-500/20 flex items-center justify-center flex-shrink-0">
              {skill.file_type === 'md'
                ? <FileText size={24} className="text-sky-500" />
                : <Archive size={24} className="text-blue-500" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{skill.display_name}</h1>
              <code className="text-sky-500/70 text-sm">{skill.name}</code>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowInstall(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition-colors">
              <Terminal size={16} /> 安装命令
            </button>
            <a href={downloadUrl} download
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium text-sm transition-colors border border-white/10">
              <Download size={16} /> 下载
            </a>
            {canEdit && (
              <>
                <button onClick={() => navigate(`/skills/${name}/edit`)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-sm transition-colors">
                  <RefreshCw size={15} /> 更新
                </button>
                <button onClick={() => {
                  if (confirm('确认删除此 Skill？')) deleteMutation.mutate()
                }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm transition-colors">
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Description */}
        {skill.description && (
          <p className="text-gray-400 mt-4 leading-relaxed">{skill.description}</p>
        )}

        {/* Tags */}
        <div className="mt-4">
          {editingTags ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {draftTags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <Tag size={11} />{tag}
                    <button onClick={() => removeDraftTag(tag)} className="ml-0.5 hover:text-white">
                      <X size={11} />
                    </button>
                  </span>
                ))}
                <div className="inline-flex items-center gap-1 rounded-full border border-dashed border-sky-500/40 bg-sky-500/5 pl-2 pr-1 py-0.5">
                  <input
                    ref={tagInputRef}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addDraftTag() }
                    }}
                    placeholder="输入标签后回车"
                    className="bg-transparent text-sm text-sky-400 placeholder-sky-500/40 outline-none w-28"
                  />
                  <button onClick={addDraftTag} className="text-sky-500/60 hover:text-sky-400"><Plus size={13} /></button>
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <button onClick={saveTags} disabled={updateTagsMutation.isPending}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs bg-sky-500 hover:bg-sky-400 text-white font-medium transition-colors disabled:opacity-50">
                  <Check size={12} /> 保存
                </button>
                <button onClick={() => setEditingTags(false)}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs bg-white/5 hover:bg-white/10 text-gray-400 transition-colors">
                  <X size={12} /> 取消
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {tagList.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm bg-sky-500/10 text-sky-400 border border-sky-500/20">
                  <Tag size={11} />{tag}
                </span>
              ))}
              {tagList.length === 0 && <span className="text-sm text-gray-600">暂无标签</span>}
              {canEdit && (
                <button onClick={startEditTags}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-white/5 hover:bg-white/10 text-gray-500 hover:text-gray-300 border border-transparent hover:border-white/10 transition-colors">
                  <Pencil size={11} /> 编辑标签
                </button>
              )}
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-5 mt-5 pt-4 border-t border-white/5 text-sm text-gray-500">
          <span className="flex items-center gap-1.5"><User size={14} />{skill.author.username}</span>
          <span className="flex items-center gap-1.5"><RefreshCw size={14} />v{skill.version}</span>
          <span className="flex items-center gap-1.5"><Download size={14} />{skill.download_count} 次下载</span>
          <span className="flex items-center gap-1.5">
            <ThumbsUp size={14} className={skill.like_count > 0 ? 'text-sky-400' : ''} />
            {skill.like_count} 人点赞
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar size={14} />{new Date(skill.created_at).toLocaleDateString('zh-CN')}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-900/50 border border-white/5 rounded-xl p-1 w-fit">
        {[
          { key: 'guide', label: '使用说明' },
          { key: 'versions', label: `版本历史 (${skill.versions.length})` },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${tab === t.key
                ? 'bg-sky-500/15 text-sky-400'
                : 'text-gray-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-6 mb-6">
        {tab === 'guide' && (
          skill.usage_guide
            ? <div className="prose-dark"><ReactMarkdown remarkPlugins={[remarkGfm]}>{skill.usage_guide}</ReactMarkdown></div>
            : <p className="text-gray-400 text-center py-8">暂无使用说明</p>
        )}
        {tab === 'versions' && (
          <div className="space-y-3">
            {skill.versions.map((v) => (
              <div key={v.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-950 border border-white/5">
                <span className="px-2 py-0.5 rounded text-xs bg-sky-500/20 text-sky-400 font-mono font-semibold mt-0.5">v{v.version}</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-300">{v.changelog || '无变更说明'}</p>
                  <p className="text-xs text-gray-600 mt-1">{new Date(v.created_at).toLocaleString('zh-CN')}</p>
                </div>
                {v.version !== skill.version && (
                  <a href={skillsApi.downloadUrl(skill.name, v.version)} download
                    className="text-xs text-gray-400 hover:text-sky-500 transition-colors flex items-center gap-1">
                    <Download size={12} />下载
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Like */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-6 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ThumbsUp size={20} className={myLike?.liked ? 'text-sky-400' : 'text-gray-500'} />
          <span className="text-white font-medium">{skill.like_count} 人觉得有用</span>
        </div>
        {isLoggedIn() ? (
          <button
            onClick={() => likeMutation.mutate()}
            disabled={likeMutation.isPending}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium transition-colors
              ${myLike?.liked
                ? 'bg-sky-500/20 text-sky-400 hover:bg-red-500/15 hover:text-red-400'
                : 'bg-sky-500 hover:bg-sky-400 text-white'}`}>
            <ThumbsUp size={15} />
            {myLike?.liked ? '取消点赞' : '点赞'}
          </button>
        ) : (
          <a href="/login" className="text-sky-400 hover:text-sky-300 text-sm transition-colors">登录后点赞</a>
        )}
      </div>

      {/* Comments */}
      <div className="bg-gray-900 border border-white/5 rounded-2xl p-6">
        <h2 className="font-semibold text-white mb-4">评论 ({Array.isArray(comments) ? comments.length : 0})</h2>

        {isLoggedIn() && (
          <div className="mb-6">
            {replyTo && (
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
                <span>回复 <span className="text-sky-500">@{replyTo.username}</span></span>
                <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-white"><X size={14} /></button>
              </div>
            )}
            <div className="flex gap-3">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="写下你的评论..."
                rows={3}
                className="flex-1 px-4 py-3 bg-gray-950 border border-white/10 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 resize-none transition-colors"
              />
            </div>
            <div className="flex justify-start mt-2">
              <button
                onClick={() => commentMutation.mutate({ content: commentText, parent_id: replyTo?.id })}
                disabled={!commentText.trim()}
                className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
                发布评论
              </button>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {Array.isArray(comments) && comments.length === 0 && (
            <p className="text-gray-400 text-sm py-4">暂无评论，成为第一个评论者</p>
          )}
          {Array.isArray(comments) && comments.map((c: any) => (
            <div key={c.id} className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500/30 to-blue-600/30 flex items-center justify-center text-sky-400 text-xs font-bold flex-shrink-0">
                  {c.user.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{c.user.username}</span>
                    <span className="text-xs text-gray-500">{new Date(c.created_at).toLocaleString('zh-CN')}</span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">{renderContent(c.content)}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {isLoggedIn() && (
                      <button onClick={() => setReplyTo({ id: c.id, username: c.user.username })}
                        className="text-xs text-gray-400 hover:text-sky-500 transition-colors">回复</button>
                    )}
                    {(user?.id === c.user.id || user?.is_admin) && (
                      <button onClick={() => deleteCommentMutation.mutate(c.id)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors">删除</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Replies */}
              {c.replies?.length > 0 && (
                <div className="ml-11 space-y-3 pl-4 border-l border-white/5">
                  {c.replies.map((r: any) => (
                    <div key={r.id} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-600/20 flex items-center justify-center text-purple-400 text-xs font-bold flex-shrink-0">
                        {r.user.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white">{r.user.username}</span>
                          <span className="text-xs text-gray-500">{new Date(r.created_at).toLocaleString('zh-CN')}</span>
                        </div>
                        <p className="text-sm text-gray-300">{renderContent(r.content)}</p>
                        <div className="flex items-center gap-3 mt-1.5">
                          {isLoggedIn() && (
                            <button onClick={() => setReplyTo({ id: c.id, username: r.user.username })}
                              className="text-xs text-gray-400 hover:text-sky-500 transition-colors">回复</button>
                          )}
                          {(user?.id === r.user.id || user?.is_admin) && (
                            <button onClick={() => deleteCommentMutation.mutate(r.id)}
                              className="text-xs text-gray-400 hover:text-red-500 transition-colors">删除</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showInstall && (
        <InstallCommandModal skillNames={[skill.name]} onClose={() => setShowInstall(false)} />
      )}
    </div>
  )
}
