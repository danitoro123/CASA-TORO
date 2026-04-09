'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Correo o contraseña incorrectos')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#2e1e0b' }}>
      <div className="w-full max-w-sm px-6">

        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-[#d49a3a] mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            Casa Toro
          </h1>
          <p className="text-stone-500 text-sm">Panel de gestión</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="bg-[#3d2a10] rounded-2xl p-8 flex flex-col gap-4 border border-[#4d3515]">
          <div>
            <label className="text-xs text-stone-400 uppercase tracking-wider block mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="tu@correo.com"
              className="w-full bg-[#2e1e0b] border border-[#4d3515] rounded-xl px-4 py-3 text-stone-200 placeholder-stone-600 focus:outline-none focus:border-[#d49a3a] transition-colors text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-stone-400 uppercase tracking-wider block mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-[#2e1e0b] border border-[#4d3515] rounded-xl px-4 py-3 text-stone-200 placeholder-stone-600 focus:outline-none focus:border-[#d49a3a] transition-colors text-sm"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#d49a3a] text-[#2e1e0b] font-bold py-3 rounded-xl hover:bg-[#e2b96a] transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-stone-700 text-xs mt-6">
          Solo para uso interno · Casa Toro
        </p>
      </div>
    </div>
  )
}
