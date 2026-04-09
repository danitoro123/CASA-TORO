'use client'
import './globals.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const nav = [
  { href: '/dashboard', label: 'Inicio',    icon: '◈' },
  { href: '/reservas',  label: 'Reservas',  icon: '◉' },
  { href: '/gastos',    label: 'Gastos',    icon: '◎' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const [user, setUser] = useState<any>(null)
  const [rol, setRol] = useState<string>('lectora')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user)
        setRol(data.user.user_metadata?.rol ?? 'lectora')
      }
    })
  }, [])

  // Páginas sin sidebar (login)
  if (path === '/login' || path === '/') return (
    <html lang="es">
      <head><title>Casa Toro</title></head>
      <body>{children}</body>
    </html>
  )

  return (
    <html lang="es">
      <head>
        <title>Casa Toro — Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="flex min-h-screen bg-stone-50">

        {/* Sidebar */}
        <aside className="w-56 shrink-0 bg-[#2e1e0b] text-stone-200 flex flex-col py-8 px-5 min-h-screen">
          {/* Logo */}
          <div className="mb-10">
            <p className="text-xs uppercase tracking-widest text-stone-500 mb-1">Gestión</p>
            <h1 className="text-xl font-bold text-[#d49a3a]" style={{ fontFamily: 'Georgia, serif' }}>
              Casa Toro
            </h1>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-1 flex-1">
            {nav.map(item => {
              const active = path.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                    active
                      ? 'bg-[#d49a3a] text-[#2e1e0b] font-semibold'
                      : 'text-stone-400 hover:text-stone-100 hover:bg-white/5'
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Usuario */}
          {user && (
            <div className="border-t border-white/10 pt-4 mt-4">
              <p className="text-xs text-stone-500 truncate">{user.email}</p>
              <p className="text-xs text-[#d49a3a] capitalize mt-0.5">{rol}</p>
              <button
                onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
                className="text-xs text-stone-600 hover:text-stone-400 mt-2 transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          )}
        </aside>

        {/* Contenido */}
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>

      </body>
    </html>
  )
}
