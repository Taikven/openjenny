import { useEffect, useState } from 'react'
import { Copy, Check, Terminal, X } from 'lucide-react'
import { skillsApi } from '../lib/services'
import toast from 'react-hot-toast'

interface Props {
  skillNames: string[]
  onClose?: () => void
}

export default function InstallCommandModal({ skillNames, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const [command, setCommand] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    skillsApi.getInstallCommand(skillNames)
      .then((res) => setCommand(res.command))
      .catch(() => toast.error('生成命令失败'))
      .finally(() => setLoading(false))
  }, [])

  const copy = async () => {
    await navigator.clipboard.writeText(command)
    setCopied(true)
    toast.success('已复制到剪贴板')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
              <Terminal size={20} className="text-sky-400" />
            </div>
            <div>
              <h2 className="font-bold text-white text-lg">安装命令</h2>
              <p className="text-gray-500 text-sm">{skillNames.length} 个 skill</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Skills list */}
        <div className="bg-gray-950 rounded-lg p-3 mb-5 space-y-1.5">
          {skillNames.map((name) => (
            <div key={name} className="flex items-center gap-2 text-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />
              <code className="text-sky-400">{name}</code>
            </div>
          ))}
        </div>

        {/* Command */}
        <div className="mb-2">
          <p className="text-sm text-gray-400 mb-2 font-medium">在终端运行以下命令</p>
          <div className="bg-gray-950 rounded-xl border border-white/10 p-4 flex items-center justify-between gap-3 min-h-[56px]">
            {loading
              ? <span className="w-4 h-4 border-2 border-white/20 border-t-sky-400 rounded-full animate-spin" />
              : <code className="text-sky-400 text-sm font-mono flex-1 break-all">{command}</code>
            }
            {!loading && (
              <button onClick={copy}
                className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 hover:bg-sky-500/20 flex items-center justify-center text-gray-400 hover:text-sky-400 transition-colors">
                {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-2">运行后 CLI 会引导你选择安装位置及 Agent 类型</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-5">
          <button onClick={copy} disabled={loading || !command}
            className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
            {copied ? <><Check size={16} /> 已复制</> : <><Copy size={16} /> 复制命令</>}
          </button>
          <button onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-medium text-sm transition-colors">
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
