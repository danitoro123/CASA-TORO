'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type Reserva = {
  id: string
  huesped: string
  fecha_llegada: string
  fecha_salida: string
  noches: number
  ingreso_bruto: number
  comision_airbnb: number
  ingreso_neto: number
  calificacion: number | null
  resena: string | null
  estado: string
  canal: string | null
  notas: string | null
}

const COP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const ESTADOS: Record<string, string> = {
  confirmada: 'bg-emerald-50 text-emerald-700',
  cancelada:  'bg-red-50 text-red-600',
  pendiente:  'bg-amber-50 text-amber-700',
}

const CANALES: Record<string, { label: string; color: string }> = {
  airbnb:    { label: 'Airbnb',      color: 'bg-rose-50 text-rose-600' },
  instagram: { label: 'Instagram',   color: 'bg-purple-50 text-purple-700' },
  whatsapp:  { label: 'WhatsApp',    color: 'bg-green-50 text-green-700' },
  telefono:  { label: 'Teléfono',    color: 'bg-blue-50 text-blue-700' },
  directo:   { label: 'Directo',     color: 'bg-stone-50 text-stone-600' },
}

export default function ReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [canEdit, setCanEdit] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [filtro, setFiltro] = useState('todas')
  const [form, setForm] = useState({
    huesped: '', fecha_llegada: '', fecha_salida: '',
    ingreso_bruto: '', ingreso_neto: '',
    calificacion: '', resena: '', estado: 'confirmada',
    canal: 'whatsapp', notas: '',
  })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user
      if (!user) { window.location.href = '/login'; return }
      const rol = user.user_metadata?.rol ?? ''
      setIsAdmin(rol === 'admin')
      setCanEdit(rol === 'admin' || rol === 'contadora')
    })
    loadReservas()
  }, [])

  async function loadReservas() {
    const { data } = await supabase
      .from('reservas')
      .select('*')
      .order('fecha_llegada', { ascending: true })
    setReservas(data ?? [])
    setLoading(false)
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/sync-ical')
      const json = await res.json()
      if (json.ok) await loadReservas()
      alert(json.message ?? 'Sincronizado')
    } catch {
      alert('Error al sincronizar.')
    }
    setSyncing(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const bruto = parseFloat(form.ingreso_bruto) || 0
    const neto = parseFloat(form.ingreso_neto) || bruto
    const payload = {
      huesped: form.huesped,
      fecha_llegada: form.fecha_llegada,
      fecha_salida: form.fecha_salida,
      ingreso_bruto: bruto,
      comision_airbnb: 0,
      ingreso_neto: neto,
      calificacion: form.calificacion ? parseInt(form.calificacion) : null,
      resena: form.resena || null,
      estado: form.estado,
      canal: form.canal,
      notas: form.notas || null,
    }
    const { error } = await supabase.from('reservas').insert(payload)
    if (!error) {
      setShowForm(false)
      setForm({ huesped:'', fecha_llegada:'', fecha_salida:'', ingreso_bruto:'', ingreso_neto:'', calificacion:'', resena:'', estado:'confirmada', canal:'whatsapp', notas:'' })
      loadReservas()
    } else {
      alert('Error al guardar: ' + error.message)
    }
  }

  const reservasFiltradas = filtro === 'todas'
    ? reservas
    : filtro === 'directas'
      ? reservas.filter(r => r.canal && r.canal !== 'airbnb')
      : reservas.filter(r => !r.canal || r.canal === 'airbnb')

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-stone-800" style={{ fontFamily: 'Georgia, serif' }}>Reservas</h2>
          <p className="text-stone-500 text-sm mt-1">{reservas.length} reservas registradas</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button onClick={handleSync} disabled={syncing}
              className="flex items-center gap-2 text-sm px-4 py-2 border border-stone-200 rounded-xl bg-white text-stone-600 hover:border-stone-300 transition-all disabled:opacity-50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={syncing ? 'animate-spin' : ''}><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
              {syncing ? 'Sincronizando...' : 'Sync iCal'}
            </button>
          )}
          {canEdit && (
            <button onClick={() => setShowForm(true)}
              className="text-sm px-4 py-2 bg-[#d49a3a] text-[#2e1e0b] font-semibold rounded-xl hover:bg-[#e2b96a] transition-colors">
              + Reserva directa
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6">
        {[['todas','Todas'],['airbnb','Airbnb'],['directas','Directas']].map(([val, label]) => (
          <button key={val} onClick={() => setFiltro(val)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              filtro === val ? 'bg-[#2e1e0b] text-white border-[#2e1e0b]' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Form nueva reserva directa */}
      {showForm && canEdit && (
        <div className="card mb-6" style={{ borderColor: '#d49a3a33' }}>
          <h3 className="font-semibold text-stone-800 mb-4">Nueva reserva directa</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs text-stone-500 block mb-1">Canal de origen</label>
              <div className="flex gap-2 flex-wrap">
                {[['whatsapp','WhatsApp / Referido'],['instagram','Instagram'],['telefono','Teléfono'],['directo','Directo']].map(([val, label]) => (
                  <button key={val} type="button"
                    onClick={() => setForm(f => ({ ...f, canal: val }))}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      form.canal === val ? 'bg-[#2e1e0b] text-white border-[#2e1e0b]' : 'bg-white text-stone-500 border-stone-200'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {[
              ['Nombre del huésped', 'huesped', 'text', 'Nombre completo'],
              ['Fecha llegada', 'fecha_llegada', 'date', ''],
              ['Fecha salida', 'fecha_salida', 'date', ''],
              ['Ingreso total (COP)', 'ingreso_bruto', 'number', '0'],
              ['Ingreso neto (COP)', 'ingreso_neto', 'number', 'Igual al total si es directo'],
              ['Calificación (1-5)', 'calificacion', 'number', ''],
            ].map(([label, key, type, ph]) => (
              <div key={key}>
                <label className="text-xs text-stone-500 block mb-1">{label}</label>
                <input type={type} placeholder={ph}
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#d49a3a] transition-colors"
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-stone-500 block mb-1">Estado</label>
              <select value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#d49a3a]">
                <option value="confirmada">Confirmada</option>
                <option value="pendiente">Pendiente</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs text-stone-500 block mb-1">Notas</label>
              <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
                rows={2} placeholder="Observaciones adicionales..."
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#d49a3a] resize-none"/>
            </div>
            <div className="col-span-2 md:col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm px-4 py-2 text-stone-500 hover:text-stone-700">Cancelar</button>
              <button type="submit" className="text-sm px-5 py-2 bg-[#d49a3a] text-[#2e1e0b] font-semibold rounded-xl hover:bg-[#e2b96a] transition-colors">Guardar reserva</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-[#d49a3a] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100">
                {['Canal','Huésped','Llegada','Salida','Noches','Ingreso neto','Calificación','Estado'].map(h => (
                  <th key={h} className="text-left text-xs uppercase tracking-wider text-stone-400 px-4 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reservasFiltradas.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-stone-400 py-16">Sin reservas en esta categoría</td></tr>
              ) : reservasFiltradas.map(r => {
                const canal = r.canal ? CANALES[r.canal] : CANALES['airbnb']
                return (
                  <tr key={r.id} className="border-b border-stone-50 hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${canal?.color ?? ''}`}>
                        {canal?.label ?? 'Airbnb'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-800">{r.huesped || '—'}</td>
                    <td className="px-4 py-3 text-stone-600">{format(new Date(r.fecha_llegada + 'T12:00:00'), 'd MMM yyyy', { locale: es })}</td>
                    <td className="px-4 py-3 text-stone-600">{format(new Date(r.fecha_salida + 'T12:00:00'), 'd MMM yyyy', { locale: es })}</td>
                    <td className="px-4 py-3 text-stone-600">{r.noches}</td>
                    <td className="px-4 py-3 font-medium text-stone-800">{r.ingreso_neto > 0 ? COP(r.ingreso_neto) : '—'}</td>
                    <td className="px-4 py-3">
                      {r.calificacion ? <span className="text-[#d49a3a]">{'★'.repeat(r.calificacion)}{'☆'.repeat(5 - r.calificacion)}</span> : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${ESTADOS[r.estado] ?? ''}`}>{r.estado}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
