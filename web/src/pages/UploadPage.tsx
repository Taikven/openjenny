import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, FileText, Archive, X, Tag, AlertCircle } from 'lucide-react'
import { skillsApi } from '../lib/services'
import toast from 'react-hot-toast'

export default function UploadPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [form, setForm] = useState({
    name: '',
    display_name: '',
    description: '',
    usage_guide: '',
    version: '1.0.0',
  })

  const mutation = useMutation({
    mutationFn: (fd: FormData) => skillsApi.create(fd),
    onSuccess: (skill) => {
      qc.invalidateQueries({ queryKey: ['skills'] })
      toast.success('Skill 上传成功！')
      navigate(`/skills/${skill.name}`)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || '上传失败')
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
    if (!form.name || !form.display_name) {
      toast.error('请填写 Skill 标识名和显示名称')
      return
    }
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v) })
    if (tags.length) fd.append('tags', tags.join(','))
    if (file) fd.append('file', file)
    mutation.mutate(fd)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">上传 Skill</h1>
        <p className="text-gray-400 mt-1 text-sm">分享你的 Skill 给团队成员</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Skill 文件 <span className="text-gray-500 font-normal">（.zip / .tar.gz / .md，可选）</span>
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
              ${dragOver ? 'border-sky-500 bg-sky-500/5' : 'border-white/10 hover:border-white/20 hover:bg-white/2'}`}>
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
                <p className="text-gray-400 text-sm">拖拽文件到此处，或点击选择</p>
                <p className="text-gray-600 text-xs mt-1">支持 .zip · .tar.gz · .md（最大 50MB）</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".zip,.md,.gz" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
        </div>

        {/* Name */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              标识名 <span className="text-red-400">*</span>
              <span className="text-gray-500 font-normal ml-1">（用于命令行安装）</span>
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/[^a-z0-9\-_]/g, '') })}
              placeholder="my-skill"
              className="w-full px-4 py-2.5 bg-gray-900 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 font-mono text-sm transition-colors"
            />
            <p className="text-xs text-gray-600 mt-1">只能包含小写字母、数字、横线</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              显示名称 <span className="text-red-400">*</span>
            </label>
            <input
              value={form.display_name}
              onChange={(e) => setForm({ ...form, display_name: e.target.value })}
              placeholder="我的 Skill"
              className="w-full px-4 py-2.5 bg-gray-900 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 transition-colors"
            />
          </div>
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
            使用说明
            <span className="text-gray-500 font-normal ml-1">（支持 Markdown）</span>
          </label>
          <textarea
            value={form.usage_guide}
            onChange={(e) => setForm({ ...form, usage_guide: e.target.value })}
            placeholder={`## 安装后使用方式\n\n\`\`\`bash\nopenjenny install my-skill\n\`\`\`\n\n## 参数说明\n...`}
            rows={8}
            className="w-full px-4 py-3 bg-gray-900 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 resize-y transition-colors text-sm font-mono"
          />
        </div>

        {/* Tags & Version */}
        <div className="grid grid-cols-2 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">版本号</label>
            <input
              value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })}
              placeholder="1.0.0"
              className="w-full px-4 py-2.5 bg-gray-900 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 font-mono text-sm transition-colors"
            />
          </div>
        </div>

        {/* Notice */}
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <p>上传后，其他团队成员可通过 <code className="bg-black/20 px-1 rounded">openjenny install {form.name || 'your-skill'}</code> 直接安装</p>
        </div>

        {/* Submit */}
        <button type="submit" disabled={mutation.isPending}
          className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">
          {mutation.isPending ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 上传中...</>
          ) : (
            <><Upload size={16} /> 发布 Skill</>
          )}
        </button>
      </form>
    </div>
  )
}
