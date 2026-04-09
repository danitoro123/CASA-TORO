'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { format, startOfMonth, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

type Resumen = {
  mes: string
  noches_ocupadas: number
  noches_disponibles: number
  ingresos_netos: number
  total_gastos: number
  utilidad_neta: number
  comision_admin: number
  calificacion_promedio: number
}

type Reserva = {
  id: string
  huesped: string
  fecha_llegada: string
  fecha_salida: string
  noches: number
  ingreso_neto: number
  calificacion: number | null
  estado: string
}

function KPI({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card fade-up">
      <p className="text-xs uppercase tracking-widest text-stone-400 mb-2">{label}</p>
      <p className="stat-number">{value}</p>
      {sub && <p className="text-sm text-stone-500 mt-1">{sub}</p>}
    </div>
  )
}

function Estrellas({ n }: { n: number }) {
  return (
    <span className="text-[#d49a3a]">
      {'★'.repeat(Math.round(n))}{'☆'.repeat(5 - Math.round(n))}
    </span>
  )
}

const COP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

export default function DashboardPage() {
  const [resumen, setResumen] = useState<Resumen[]>([])
  const [proximas, setProximas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const hoy = new Date()
      const hace6 = subMonths(startOfMonth(hoy), 5)

      const [{ data: res }, { data: prox }] = await Promise.all([
        supabase
          .from('resumen_mensual')
          .select('*')
          .gte('mes', format(hace6, 'yyyy-MM-dd'))
          .order('mes', { ascending: true }),
        supabase
          .from('reservas')
          .select('*')
          .gte('fecha_llegada', format(hoy, 'yyyy-MM-dd'))
          .eq('estado', 'confirmada')
          .order('fecha_llegada', { ascending: true })
          .limit(5),
      ])

      setResumen(res ?? [])
      setProximas(prox ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const actual = resumen[resumen.length - 1]
  const anterior = resumen[resumen.length - 2]

  const ocup = actual
    ? Math.round((actual.noches_ocupadas / (actual.noches_ocupadas + actual.noches_disponibles || 1)) * 100)
    : 0

  const chartData = resumen.map(r => ({
    mes: format(new Date(r.mes + 'T12:00:00'), 'MMM', { locale: es }),
    ingresos: r.ingresos_netos,
    gastos: r.total_gastos,
    utilidad: r.utilidad_neta,
  }))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#d49a3a] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-stone-800" style={{ fontFamily: 'Georgia, serif' }}>
          Bienvenido
        </h2>
        <p className="text-stone-500 text-sm mt-1">
          {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })} ·{' '}
          <a
            href="https://es-l.airbnb.com/rooms/45439655"
            target="_blank"
            rel="noreferrer"
            className="text-[#d49a3a] hover:underline"
          >
            Ver en Airbnb ↗
          </a>
        </p>
      </div>

      {/* KPIs mes actual */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPI
          label="Ingresos netos"
          value={actual ? COP(actual.ingresos_netos) : '—'}
          sub="este mes"
        />
        <KPI
          label="Ocupación"
          value={actual ? `${ocup}%` : '—'}
          sub={actual ? `${actual.noches_ocupadas} noches` : ''}
        />
        <KPI
          label="Tu comisión"
          value={actual ? COP(actual.comision_admin) : '—'}
          sub="10% de utilidad neta"
        />
        <KPI
          label="Calificación"
          value={actual?.calificacion_promedio ? actual.calificacion_promedio.toFixed(1) : '—'}
          sub={actual?.calificacion_promedio ? '/ 5.0 ★' : 'sin reseñas aún'}
        />
      </div>

      {/* Gráfica + próximas reservas */}
      <div className="grid md:grid-cols-5 gap-6 mb-8">

        {/* Gráfica últimos 6 meses */}
        <div className="card md:col-span-3">
          <p className="text-xs uppercase tracking-widest text-stone-400 mb-4">Últimos 6 meses</p>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} barSize={22} barGap={4}>
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#a39990' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    COP(v),
                    name === 'ingresos' ? 'Ingresos' : name === 'gastos' ? 'Gastos' : 'Utilidad',
                  ]}
                  contentStyle={{ borderRadius: 10, border: '1px solid #eceae5', fontSize: 12 }}
                />
                <Bar dataKey="ingresos" fill="#eed4a1" radius={[4,4,0,0]} />
                <Bar dataKey="gastos"   fill="#bfb9ac" radius={[4,4,0,0]} />
                <Bar dataKey="utilidad" fill="#d49a3a" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-stone-400 text-sm">
              Sin datos aún — registra el primer mes
            </div>
          )}
          <div className="flex gap-4 mt-3 text-xs text-stone-500">
            <span><span className="inline-block w-3 h-3 rounded-sm bg-[#eed4a1] mr-1" />Ingresos</span>
            <span><span className="inline-block w-3 h-3 rounded-sm bg-[#bfb9ac] mr-1" />Gastos</span>
            <span><span className="inline-block w-3 h-3 rounded-sm bg-[#d49a3a] mr-1" />Utilidad</span>
          </div>
        </div>

        {/* Próximas reservas */}
        <div className="card md:col-span-2">
          <p className="text-xs uppercase tracking-widest text-stone-400 mb-4">Próximas reservas</p>
          {proximas.length === 0 ? (
            <p className="text-stone-400 text-sm">Sin reservas futuras</p>
          ) : (
            <div className="flex flex-col gap-3">
              {proximas.map(r => (
                <div key={r.id} className="flex flex-col gap-0.5 border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-stone-800">{r.huesped || 'Huésped'}</p>
                  <p className="text-xs text-stone-500">
                    {format(new Date(r.fecha_llegada + 'T12:00:00'), 'd MMM', { locale: es })}
                    {' → '}
                    {format(new Date(r.fecha_salida + 'T12:00:00'), 'd MMM', { locale: es })}
                    {' · '}{r.noches} noches
                  </p>
                  {r.ingreso_neto > 0 && (
                    <p className="text-xs text-[#d49a3a] font-medium">{COP(r.ingreso_neto)}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Resumen financiero mes actual */}
      {actual && (
        <div className="card">
          <p className="text-xs uppercase tracking-widest text-stone-400 mb-4">
            Resumen financiero — {format(new Date(actual.mes + 'T12:00:00'), 'MMMM yyyy', { locale: es })}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <p className="text-stone-400 mb-0.5">Ingresos brutos</p>
              <p className="font-semibold text-stone-800">{COP(actual.ingresos_netos)}</p>
            </div>
            <div>
              <p className="text-stone-400 mb-0.5">Total gastos</p>
              <p className="font-semibold text-stone-800">{COP(actual.total_gastos)}</p>
            </div>
            <div>
              <p className="text-stone-400 mb-0.5">Utilidad neta</p>
              <p className="font-semibold text-stone-800">{COP(actual.utilidad_neta)}</p>
            </div>
            <div>
              <p className="text-stone-400 mb-0.5">Tu comisión (10%)</p>
              <p className="font-semibold text-[#d49a3a]">{COP(actual.comision_admin)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Link Instagram */}
      <div className="mt-6 text-center">
        <a
          href="https://www.instagram.com/casatoro.co"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-700 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
            <circle cx="12" cy="12" r="4"/>
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
          </svg>
          @casatoro.co
        </a>
      </div>
    </div>
  )
}
