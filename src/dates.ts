/** Fechas de calendario del negocio. Cuba; si el motor no soporta la zona, se usa la del sistema. */
export const ZONA_HORARIA = 'America/Havana'

export type Ymd = { year: number; month: number; day: number }

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function partsInZone(date: Date, timeZone: string): Ymd {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
  const parts = fmt.formatToParts(date)
  const num = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(p => p.type === type)?.value)
  return { year: num('year'), month: num('month'), day: num('day') }
}

export function nowHavana(date = new Date()): Ymd {
  try {
    return partsInZone(date, ZONA_HORARIA)
  } catch {
    return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() }
  }
}

export function toISODate(parts: Ymd): string {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

export function todayISO(date = new Date()): string {
  return toISODate(nowHavana(date))
}

export function addDaysISO(days: number, from = new Date()): string {
  const { year, month, day } = nowHavana(from)
  return todayISO(new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0)))
}

export function parseISODate(iso: string): Ymd | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

export function formatFecha(iso: string): string {
  const parts = parseISODate(iso)
  if (!parts) return iso
  return `${pad(parts.day)}/${pad(parts.month)}/${parts.year}`
}

export function formatFechaLarga(date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('es-CU', {
      timeZone: ZONA_HORARIA,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  } catch {
    return date.toLocaleDateString('es-CU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }
}

export function addMonths(year: number, month: number, delta: number): Ymd {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: 1 }
}

function ymdFromUtcDay(year: number, month: number, day: number): Ymd {
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

export function addDaysToISO(iso: string, days: number): string {
  const parts = parseISODate(iso)
  if (!parts) return iso
  return toISODate(ymdFromUtcDay(parts.year, parts.month, parts.day + days))
}

/** Lunes de la semana que contiene `iso` (semana laboral). */
export function startOfWeekISO(iso: string): string {
  const parts = parseISODate(iso)
  if (!parts) return iso
  const dow = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0)).getUTCDay()
  const offset = dow === 0 ? -6 : 1 - dow
  return addDaysToISO(iso, offset)
}

export function endOfWeekISO(iso: string): string {
  return addDaysToISO(startOfWeekISO(iso), 6)
}

export function inRangeISO(iso: string, from: string, to: string): boolean {
  return iso >= from && iso <= to
}
