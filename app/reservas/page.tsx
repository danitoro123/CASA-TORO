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
  notas: string | null
}

const COP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const ESTADOS: Record<string, string> = {
  confirmada: 'bg-emerald-50 text-emerald-700',
  cancelada:  'bg-red-50 text-red-600',
  pendiente:  'bg-amber-50 text-amber-700',
}

export default function ReservasPage() {
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [rol, setRol] = useState('')
  const [form, setForm] = useState({
    huesped: '', fecha_llegada: '', fecha_salida: '',
    ingreso_bruto: '', comision_airbnb: '', ingreso_neto: '',
    calificacion: '', resena: '', estado: 'confirmada', notas: '',
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setRol(data.user?.user_metadata?.rol ?? '')
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
      alert('Error al sincronizar. Verifica la URL iCal en configuración.')
    }
    setSyncing(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      huesped: form.huesped,
      fecha_llegada: form.fecha_llegada,
      fecha_salida: form.fecha_salida,
      ingreso_bruto: parseFloat(form.ingreso_bruto) || 0,
      comision_airbnb: parseFloat(form.comision_airbnb) || 0,
      ingreso_neto: parseFloat(form.ingreso_neto) || 0,
      calificacion: form.calificacion ? parseInt(form.calificacion) : null,
      resena: form.resena || null,
      estado: form.estado,
      notas: form.notas || null,
    }
    const { error } = await supabase.from('reservas').insert(payload)
    if (!error) {
      setShowForm(false)
      setForm({ huesped:'',fecha_llegada:'',fecha_salida:'',ingreso_bruto:'',comision_airbnb:'',ingreso_neto:'',calificacion:'',resena:'',estado:'confirmada',notas:'' })
      loadReservas()
    } else {
      alert('Error al guardar: ' + error.message)
    }
  }

  const isAdmin = rol === 'admin'

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-stone-800" style={{ fontFamily: 'Georgia, serif' }}>Reservas</h2>
          <p className="text-stone-500 text-sm mt-1">{reservas.length} reservas registradas</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 text-sm px-4 py-2 border border-stone-200 rounded-xl bg-white text-stone-600 hover:border-stone-300 transition-all disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={syncing ? 'animate-spin' : ''}><path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
              {syncing ? 'Sincronizando...' : 'Sync iCal'}
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="text-sm px-4 py-2 bg-[#d49a3a] text-[#2e1e0b] font-semibold rounded-xl hover:bg-[#e2b96a] transition-colors"
            >
              + Nueva reserva
            </button>
          </div>
        )}
      </div>

      {/* Form nueva reserva */}
      {showForm && (
        <div className="card mb-6 border-[#d49a3a]/30">
          <h3 className="font-semibold text-stone-800 mb-4">Nueva reserva</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              ['Huésped', 'huesped', 'text', 'Nombre del huésped'],
              ['Llegada', 'fecha_llegada', 'date', ''],
              ['Salida', 'fecha_salida', 'date', ''],
              ['Ingreso bruto', 'ingreso_bruto', 'number', '0'],
              ['Comisión Airbnb', 'comision_airbnb', 'number', '0'],
              ['Ingreso neto', 'ingreso_neto', 'number', '0'],
              ['Calificación (1-5)', 'calificacion', 'number', ''],
            ].map(([label, key, type, ph]) => (
              <div key={key}>
                <label className="text-xs text-stone-500 block mb-1">{label}</label>
                <input
                  type={type}
                  min={type === 'number' ? 0 : undefined}
                  max={key === 'calificacion' ? 5 : undefined}
                  placeholder={ph}
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#d49a3a] transition-colors"
                />
              </div>
            ))}
            <div>
              <label className="text-xs text-stone-500 block mb-1">Estado</label>
              <select
                value={form.estado}
                onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#d49a3a]"
              >
                <option value="confirmada">Confirmada</option>
                <option value="pendiente">Pendiente</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs text-stone-500 block mb-1">Reseña del huésped</label>
              <textarea
                value={form.resena}
                onChange={e => setForm(f => ({ ...f, resena: e.target.value }))}
                rows={2}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#d49a3a] resize-none"
              />
            </div>
            <div className="col-span-2 md:col-span-3 flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm px-4 py-2 text-stone-500 hover:text-stone-700">Cancelar</button>
              <button type="submit" className="text-sm px-5 py-2 bg-[#d49a3a] text-[#2e1e0b] font-semibold rounded-xl hover:bg-[#e2b96a] transition-colors">Guardar</button>
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
                {['Huésped','Llegada','Salida','Noches','Ingreso neto','Calificación','Estado'].map(h => (
                  <th key={h} className="text-left text-xs uppercase tracking-wider text-stone-400 px-5 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reservas.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-stone-400 py-16">Sin reservas aún — haz clic en Sync iCal o agrega una manualmente</td></tr>
              ) : reservas.map(r => (
                <tr key={r.id} className="border-b border-stone-50 hover:bg-stone-50/50 transition-colors">
                  <td className="px-5 py-3 font-medium text-stone-800">{r.huesped || '—'}</td>
                  <td className="px-5 py-3 text-stone-600">{format(new Date(r.fecha_llegada + 'T12:00:00'), 'd MMM yyyy', { locale: es })}</td>
                  <td className="px-5 py-3 text-stone-600">{format(new Date(r.fecha_salida + 'T12:00:00'), 'd MMM yyyy', { locale: es })}</td>
                  <td className="px-5 py-3 text-stone-600">{r.noches}</td>
                  <td className="px-5 py-3 font-medium text-stone-800">{r.ingreso_neto > 0 ? COP(r.ingreso_neto) : '—'}</td>
                  <td className="px-5 py-3">
                    {r.calificacion ? (
                      <span className="text-[#d49a3a]">{'★'.repeat(r.calificacion)}{'☆'.repeat(5 - r.calificacion)}</span>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${ESTADOS[r.estado] ?? ''}`}>
                      {r.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
