import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Upload, FileText, Archive, X, Tag, ArrowLeft, RefreshCw } from 'lucide-react'
import { skillsApi } from '../lib/services'
import toast from 'react-hot-toast'

export default function EditSkillPage() {
  const { name } = useParams<{ name: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [form, setForm] = useState({
    display_name: '',
    description: '',
    usage_guide: '',
    new_version: '',
    changelog: '',
  })

  const { data: skill, isLoading } = useQuery({
    queryKey: ['skill', name],
    queryFn: () => skillsApi.get(name!),
    enabled: !!name,
  })

  // 加载已有数据
  useEffect(() => {
    if (skill) {
      setForm({
        display_name: skill.display_name,
        description: skill.description || '',
        usage_guide: skill.usage_guide || '',
        new_version: skill.version,
        changelog: '',
      })
      if (skill.tags) {
        setTags(skill.tags.split(',').map((t) => t.trim()).filter(Boolean))
      }
    }
  }, [skill])

  const mutation = useMutation({
    mutationFn: (fd: FormData) => skillsApi.update(name!, fd),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['skills'] })
      qc.invalidateQueries({ queryKey: ['skill', name] })
      toast.success('更新成功！')
      navigate(`/skills/${updated.name}`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || '更新失败')
    },
  })

  const handleFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase()
    if (!['zip', 'md', 'gz'].includes(ext || '')) {
      toast.error('只支持 .zip / .tar.gz / .md 文件')
      return
    }
    setFile(f)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const t = tagInput.trim()
      if (t && !tags.includes(t)) setTags([...tags, t])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.display_name) {
      toast.error('请填写显示名称')
      return
    }
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
    if (tags.length) fd.append('tags', tags.join(','))
    if (file) fd.append('file', file)
    mutation.mutate(fd)
  }

  if (isLoading) return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse space-y-4">
      <div className="h-8 bg-gray-800 rounded w-48" />
      <div className="h-40 bg-gray-900 rounded-xl" />
    </div>
  )

  if (!skill) return (
    <div className="text-center py-24 text-gray-500">
      <p>Skill 不存在</p>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={() => navigate('/')}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-6 transition-colors text-sm">
        <ArrowLeft size={16} /> 返回列表
      </button>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <RefreshCw size={22} className="text-sky-400" /> 更新 Skill
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          更新 <code className="text-sky-400">{name}</code> 的内容或版本
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            新版本文件 <span className="text-gray-500 font-normal">（不替换则保留原文件）</span>
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${dragOver ? 'border-sky-500 bg-sky-500/5' : 'border-white/10 hover:border-white/20'}`}>
            {file ? (
              <div className="flex items-center justify-center gap-3">
                {file.name.endsWith('.md')
                  ? <FileText size={24} className="text-sky-400" />
                  : <Archive size={24} className="text-blue-400" />}
                <div className="text-left">
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-gray-500 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null) }}
                  className="ml-2 text-gray-500 hover:text-red-400 transition-colors">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto text-gray-600 mb-2" />
                <p className="text-gray-400 text-sm">拖拽新文件到此处，或点击选择</p>
                <p className="text-gray-600 text-xs mt-1">支持 .zip · .tar.gz · .md</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".zip,.md,.gz" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
        </div>

        {/* Display name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">显示名称 <span className="text-red-400">*</span></label>
          <input
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            placeholder="我的 Skill"
            className="w-full px-4 py-2.5 bg-gray-900 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">简介</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="简短描述这个 Skill 的功能..."
            rows={3}
            className="w-full px-4 py-3 bg-gray-900 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 resize-none transition-colors text-sm"
          />
        </div>

        {/* Usage guide */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            使用说明 <span className="text-gray-500 font-normal">（支持 Markdown）</span>
          </label>
          <textarea
            value={form.usage_guide}
            onChange={(e) => setForm({ ...form, usage_guide: e.target.value })}
            rows={8}
            className="w-full px-4 py-3 bg-gray-900 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 resize-y transition-colors text-sm font-mono"
          />
        </div>

        {/* Version & Changelog */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">新版本号</label>
            <input
              value={form.new_version}
              onChange={(e) => setForm({ ...form, new_version: e.target.value })}
              placeholder="1.0.0"
              className="w-full px-4 py-2.5 bg-gray-900 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 font-mono text-sm transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">变更说明</label>
            <input
              value={form.changelog}
              onChange={(e) => setForm({ ...form, changelog: e.target.value })}
              placeholder="本次更新内容..."
              className="w-full px-4 py-2.5 bg-gray-900 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 text-sm transition-colors"
            />
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            <Tag size={14} className="inline mr-1" />标签
          </label>
          <div className="bg-gray-900 border border-white/10 rounded-xl px-3 py-2 focus-within:border-sky-500/50 transition-colors">
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-sky-500/20 text-sky-400">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}><X size={10} /></button>
                </span>
              ))}
            </div>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={addTag}
              placeholder="输入后按 Enter 添加..."
              className="bg-transparent text-white text-sm w-full focus:outline-none placeholder-gray-600"
            />
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={mutation.isPending}
          className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">
          {mutation.isPending ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 更新中...</>
          ) : (
            <><RefreshCw size={16} /> 发布更新</>
          )}
        </button>
      </form>
    </div>
  )
}
