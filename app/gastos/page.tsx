'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

type Gasto = {
  id: string
  mes: string
  categoria: string
  descripcion: string
  monto: number
  comprobante_url: string | null
  registrado_por: string | null
  created_at: string
}

const CATEGORIAS: Record<string, string> = {
  servicios_publicos: 'Servicios públicos',
  limpieza:           'Limpieza',
  mantenimiento:      'Mantenimiento',
  suministros:        'Suministros',
  impuestos:          'Impuestos / contabilidad',
  casero:             'Casero',
  empleadas:          'Empleadas',
  piscina:            'Piscina',
  arreglos:           'Arreglos / reparaciones',
  otro:               'Otro',
}

const COLORES: Record<string, string> = {
  servicios_publicos: 'bg-blue-50 text-blue-700',
  limpieza:           'bg-teal-50 text-teal-700',
  mantenimiento:      'bg-orange-50 text-orange-700',
  suministros:        'bg-purple-50 text-purple-700',
  impuestos:          'bg-red-50 text-red-700',
  casero:             'bg-stone-50 text-stone-600',
  empleadas:          'bg-pink-50 text-pink-700',
  piscina:            'bg-cyan-50 text-cyan-700',
  arreglos:           'bg-amber-50 text-amber-700',
  otro:               'bg-gray-50 text-gray-600',
}

const COP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [rol, setRol] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [mesSeleccionado, setMesSeleccionado] = useState(format(startOfMonth(new Date()), 'yyyy-MM'))
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    categoria: 'servicios_publicos',
    descripcion: '',
    monto: '',
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setRol(data.user?.user_metadata?.rol ?? '')
      setUserEmail(data.user?.email ?? '')
    })
    loadGastos()
  }, [mesSeleccionado])

  async function loadGastos() {
    setLoading(true)
    const mesDate = mesSeleccionado + '-01'
    const { data } = await supabase
      .from('gastos')
      .select('*')
      .eq('mes', mesDate)
      .order('created_at', { ascending: false })
    setGastos(data ?? [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    let comprobante_url = null

    if (file) {
      const ext = file.name.split('.').pop()
      const filename = `${mesSeleccionado}/${Date.now()}.${ext}`
      const { data: up } = await supabase.storage
        .from('comprobantes')
        .upload(filename, file, { upsert: true })
      if (up) {
        const { data: url } = supabase.storage.from('comprobantes').getPublicUrl(up.path)
        comprobante_url = url.publicUrl
      }
    }

    const { error } = await supabase.from('gastos').insert({
      mes: mesSeleccionado + '-01',
      categoria: form.categoria,
      descripcion: form.descripcion,
      monto: parseFloat(form.monto),
      comprobante_url,
      registrado_por: userEmail,
    })

    setSaving(false)
    if (!error) {
      setShowForm(false)
      setForm({ categoria: 'servicios_publicos', descripcion: '', monto: '' })
      setFile(null)
      loadGastos()
    } else {
      alert('Error: ' + error.message)
    }
  }

  const totalMes = gastos.reduce((s, g) => s + g.monto, 0)
  const canEdit = rol === 'admin' || rol === 'contadora'
  const mesLabel = format(new Date(mesSeleccionado + '-15'), 'MMMM yyyy', { locale: es })

  // Agrupar por categoría
  const porCategoria: Record<string, number> = {}
  gastos.forEach(g => {
    porCategoria[g.categoria] = (porCategoria[g.categoria] ?? 0) + g.monto
  })

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-stone-800" style={{ fontFamily: 'Georgia, serif' }}>Gastos</h2>
          <p className="text-stone-500 text-sm mt-1 capitalize">{mesLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={mesSeleccionado}
            onChange={e => setMesSeleccionado(e.target.value)}
            className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#d49a3a]"
          />
          {canEdit && (
            <button
              onClick={() => setShowForm(true)}
              className="text-sm px-4 py-2 bg-[#d49a3a] text-[#2e1e0b] font-semibold rounded-xl hover:bg-[#e2b96a] transition-colors"
            >
              + Agregar gasto
            </button>
          )}
        </div>
      </div>

      {/* Resumen total */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="card">
          <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">Total del mes</p>
          <p className="stat-number">{COP(totalMes)}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">Gastos registrados</p>
          <p className="stat-number">{gastos.length}</p>
        </div>
        <div className="card col-span-2 md:col-span-1">
          <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">Categorías</p>
          <p className="stat-number">{Object.keys(porCategoria).length}</p>
        </div>
      </div>

      {/* Resumen por categoría */}
      {Object.keys(porCategoria).length > 0 && (
        <div className="card mb-6">
          <p className="text-xs uppercase tracking-widest text-stone-400 mb-4">Por categoría</p>
          <div className="flex flex-col gap-2">
            {Object.entries(porCategoria)
              .sort(([,a],[,b]) => b - a)
              .map(([cat, total]) => (
              <div key={cat} className="flex items-center justify-between">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${COLORES[cat]}`}>
                  {CATEGORIAS[cat]}
                </span>
                <div className="flex items-center gap-3 flex-1 mx-4">
                  <div className="flex-1 bg-stone-100 rounded-full h-1.5">
                    <div
                      className="bg-[#d49a3a] h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.round((total / totalMes) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs text-stone-400 w-10 text-right">
                    {Math.round((total / totalMes) * 100)}%
                  </span>
                </div>
                <span className="text-sm font-medium text-stone-700 text-right w-28">{COP(total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form nuevo gasto */}
      {showForm && (
        <div className="card mb-6 border-[#d49a3a]/30">
          <h3 className="font-semibold text-stone-800 mb-4">Registrar gasto — {mesLabel}</h3>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-stone-500 block mb-1">Categoría</label>
                <select
                  value={form.categoria}
                  onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#d49a3a]"
                >
                  {Object.entries(CATEGORIAS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-stone-500 block mb-1">Monto (COP)</label>
                <input
                  type="number"
                  min={0}
                  required
                  placeholder="0"
                  value={form.monto}
                  onChange={e => setForm(f => ({ ...f, monto: e.target.value }))}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#d49a3a]"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-stone-500 block mb-1">Descripción</label>
              <input
                type="text"
                required
                placeholder="Ej: Factura de energía mayo"
                value={form.descripcion}
                onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#d49a3a]"
              />
            </div>
            <div>
              <label className="text-xs text-stone-500 block mb-1">Comprobante (imagen o PDF — opcional)</label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-stone-500 file:mr-3 file:text-sm file:border-0 file:bg-stone-100 file:text-stone-700 file:rounded-lg file:px-3 file:py-1.5 file:cursor-pointer hover:file:bg-stone-200 transition-colors"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm px-4 py-2 text-stone-500 hover:text-stone-700">Cancelar</button>
              <button
                type="submit"
                disabled={saving}
                className="text-sm px-5 py-2 bg-[#d49a3a] text-[#2e1e0b] font-semibold rounded-xl hover:bg-[#e2b96a] transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar gasto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de gastos */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#d49a3a] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100">
                {['Categoría','Descripción','Monto','Comprobante','Registrado por'].map(h => (
                  <th key={h} className="text-left text-xs uppercase tracking-wider text-stone-400 px-5 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gastos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-stone-400 py-16">
                    {canEdit ? 'Sin gastos este mes — agrega el primero' : 'Sin gastos registrados este mes'}
                  </td>
                </tr>
              ) : gastos.map(g => (
                <tr key={g.id} className="border-b border-stone-50 hover:bg-stone-50/50 transition-colors">
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${COLORES[g.categoria]}`}>
                      {CATEGORIAS[g.categoria]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-stone-700">{g.descripcion}</td>
                  <td className="px-5 py-3 font-semibold text-stone-800">{COP(g.monto)}</td>
                  <td className="px-5 py-3">
                    {g.comprobante_url ? (
                      <a
                        href={g.comprobante_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#d49a3a] hover:underline text-xs"
                      >
                        Ver ↗
                      </a>
                    ) : (
                      <span className="text-stone-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-stone-400 text-xs">{g.registrado_por ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
