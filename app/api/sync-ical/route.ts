import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase con service role para escritura sin RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const icalUrl = process.env.AIRBNB_ICAL_URL

  if (!icalUrl) {
    return NextResponse.json({
      ok: false,
      message: 'URL iCal no configurada. Agrégala en las variables de entorno (AIRBNB_ICAL_URL).'
    }, { status: 400 })
  }

  try {
    // Descargar el archivo iCal
    const res = await fetch(icalUrl, {
      headers: { 'User-Agent': 'CasaToro-Dashboard/1.0' },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      return NextResponse.json({ ok: false, message: 'No se pudo descargar el calendario de Airbnb' }, { status: 502 })
    }

    const text = await res.text()

    // Parsear iCal manualmente (formato estándar)
    const eventos = parseIcal(text)

    if (eventos.length === 0) {
      return NextResponse.json({ ok: true, message: 'Calendario vacío o sin reservas', inserted: 0 })
    }

    // Insertar en Supabase (ignorar duplicados por airbnb_uid)
    let inserted = 0
    for (const ev of eventos) {
      const { error } = await supabase
        .from('reservas')
        .upsert({
          airbnb_uid: ev.uid,
          huesped: ev.summary || 'Reservado',
          fecha_llegada: ev.dtstart,
          fecha_salida: ev.dtend,
          estado: ev.summary?.toLowerCase().includes('not available') ? 'cancelada' : 'confirmada',
        }, {
          onConflict: 'airbnb_uid',
          ignoreDuplicates: false,
        })

      if (!error) inserted++
    }

    return NextResponse.json({
      ok: true,
      message: `Sincronizado: ${inserted} eventos procesados`,
      inserted,
      total: eventos.length,
    })

  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 })
  }
}

// Parser iCal básico — extrae VEVENT
function parseIcal(text: string) {
  const events: { uid: string; summary: string; dtstart: string; dtend: string }[] = []
  const blocks = text.split('BEGIN:VEVENT')

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i]
    const uid     = extract(block, 'UID')
    const summary = extract(block, 'SUMMARY')
    const dtstart = parseDate(extract(block, 'DTSTART'))
    const dtend   = parseDate(extract(block, 'DTEND'))

    if (uid && dtstart && dtend) {
      events.push({ uid, summary, dtstart, dtend })
    }
  }

  return events
}

function extract(block: string, key: string): string {
  const match = block.match(new RegExp(`${key}[^:]*:([^\\r\\n]+)`))
  return match ? match[1].trim() : ''
}

function parseDate(raw: string): string {
  // Formato YYYYMMDD o YYYYMMDDTHHMMSSZ
  const clean = raw.replace(/T.*/, '')
  if (clean.length === 8) {
    return `${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}`
  }
  return ''
}
