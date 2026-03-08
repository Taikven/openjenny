import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { LogIn, Eye, EyeOff } from 'lucide-react'
import { authApi } from '../lib/services'
import { useAuthStore } from '../lib/store'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [showPwd, setShowPwd] = useState(false)
  const [form, setForm] = useState({ username: '', password: '' })

  const loginMutation = useMutation({
    mutationFn: () => authApi.login({ username: form.username, password: form.password }),
    onSuccess: (data) => {
      setAuth(data.user, data.access_token)
      toast.success(`欢迎回来，${data.user.username}！`)
      navigate('/')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || '登录失败'),
  })

  const registerMutation = useMutation({
    mutationFn: () => authApi.register({ username: form.username, password: form.password }),
    onSuccess: () => {
      toast.success('注册成功，请登录')
      setTab('login')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || '注册失败'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (tab === 'login') loginMutation.mutate()
    else registerMutation.mutate()
  }

  const isPending = loginMutation.isPending || registerMutation.isPending
  const f = (k: string) => (v: string) => setForm({ ...form, [k]: v })

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-sky-500 flex items-center justify-center text-white font-black text-2xl mx-auto mb-4">OJ</div>
          <h1 className="text-2xl font-bold text-white">OpenJenny</h1>
          <p className="text-gray-400 text-sm mt-1">团队 Skill 共享平台</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-white/5 rounded-2xl p-6">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-gray-950 rounded-xl p-1">
            {(['login', 'register'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
                  ${tab === t ? 'bg-sky-500 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}>
                {t === 'login' ? '登录' : '注册'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">用户名</label>
              <input
                value={form.username} onChange={(e) => f('username')(e.target.value)}
                placeholder="your_username"
                required autoFocus
                className="w-full px-4 py-2.5 bg-gray-950 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 transition-colors text-sm"
              />
            </div>

            {tab === 'register' && null}

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">密码</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={form.password} onChange={(e) => f('password')(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 pr-11 bg-gray-950 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-sky-500/50 transition-colors text-sm"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                  {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={isPending}
              className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 mt-2 shadow-sm">
              {isPending
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><LogIn size={16} />{tab === 'login' ? '登录' : '注册'}</>}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-400 text-sm mt-4">
          <Link to="/" className="hover:text-gray-300 transition-colors">← 返回首页</Link>
        </p>
      </div>
    </div>
  )
}
