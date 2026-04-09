'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else if (data.session) {
      window.location.href = '/dashboard'
    } else {
      setError('No se pudo iniciar sesión')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#2e1e0b' }}>
      <div className="w-full max-w-sm px-6">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-[#d49a3a] mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            Casa Toro
          </h1>
          <p className="text-stone-500 text-sm">Panel de gestión</p>
        </div>

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
            <p className="text-red-400 text-sm text-center bg-red-950/30 rounded-lg p-2">{error}</p>
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
