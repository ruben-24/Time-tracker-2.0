import type { SessionType, WorkBreak } from '../stores/timerStore'

export interface ImportedSessionInput {
  type: SessionType
  startedAt: number
  endedAt: number | null
  note?: string
  address?: string | null
  manual?: boolean
  breaks?: Array<
    Partial<WorkBreak> & {
      startedAt: number
      endedAt: number
      type?: 'break' | 'cigarette'
      duration?: number
    }
  >
}

export interface SpreadsheetParseResult {
  entries: ImportedSessionInput[]
  errors: string[]
  warnings: string[]
}

type CanonicalKey = 'date' | 'start' | 'end' | 'type' | 'note' | 'address' | 'duration'

const HEADER_MAP: Record<string, CanonicalKey> = {
  date: 'date',
  data: 'date',
  'data zilei': 'date',
  zi: 'date',
  ziua: 'date',
  day: 'date',
  'work date': 'date',
  start: 'start',
  'ora start': 'start',
  'ora inceput': 'start',
  'start time': 'start',
  'inceput': 'start',
  'ora intrare': 'start',
  'start hour': 'start',
  end: 'end',
  'stop': 'end',
  'sfarsit': 'end',
  'ora sfarsit': 'end',
  'ora final': 'end',
  'end time': 'end',
  'finish': 'end',
  'ora iesire': 'end',
  'type': 'type',
  'tip': 'type',
  'categorie': 'type',
  'category': 'type',
  'note': 'note',
  'notita': 'note',
  'nota': 'note',
  'observatii': 'note',
  'observatie': 'note',
  'obs': 'note',
  'comentariu': 'note',
  'comment': 'note',
  'address': 'address',
  'adresa': 'address',
  'locatie': 'address',
  'loc': 'address',
  'location': 'address',
  'duration': 'duration',
  'durata': 'duration',
  'duration minutes': 'duration',
  'durata minute': 'duration',
  'minutes': 'duration',
  'minute': 'duration',
  'min': 'duration',
  'duration (minutes)': 'duration'
}

interface NormalizedRow {
  __rowNum__?: number
  date?: unknown
  start?: unknown
  end?: unknown
  type?: unknown
  note?: unknown
  address?: unknown
  duration?: unknown
  [key: string]: unknown
}

const EXCEL_EPOCH = Date.UTC(1899, 11, 30)
const MS_IN_DAY = 24 * 60 * 60 * 1000

export function parseSpreadsheetRows(rows: Array<Record<string, any>>): SpreadsheetParseResult {
  const entries: ImportedSessionInput[] = []
  const errors: string[] = []
  const warnings: string[] = []

  rows.forEach((rawRow, idx) => {
    const row = normalizeRow(rawRow)
    const rowLabel = getRowLabel(row, idx)

    const sessionType = parseType(row.type)
    if (!sessionType.valid) {
      warnings.push(`Rând ${rowLabel}: tip necunoscut („${sessionType.original}”). Am folosit „work”.`)
    }
    const resolvedType = sessionType.type

    const { startedAt, note: startNote } = resolveStart(row)
    if (startNote) {
      warnings.push(`Rând ${rowLabel}: ${startNote}`)
    }
    if (startedAt == null || Number.isNaN(startedAt)) {
      errors.push(`Rând ${rowLabel}: nu am putut interpreta momentul de început.`)
      return
    }

    const { endedAt, note: endNote } = resolveEnd(row, startedAt)
    if (endNote) {
      warnings.push(`Rând ${rowLabel}: ${endNote}`)
    }
    if (endedAt !== null && endedAt !== undefined && endedAt <= startedAt) {
      errors.push(`Rând ${rowLabel}: sfârșitul este înainte de început.`)
      return
    }

    const note = parseOptionalString(row.note)
    const address = parseOptionalString(row.address)

    entries.push({
      type: resolvedType,
      startedAt,
      endedAt: endedAt ?? null,
      note,
      address: address ?? undefined,
      manual: true
    })
  })

  return { entries, errors, warnings }
}

function normalizeRow(row: Record<string, any>): NormalizedRow {
  const normalized: NormalizedRow = {}
  for (const [rawKey, value] of Object.entries(row)) {
    if (rawKey === '__rowNum__') {
      normalized.__rowNum__ = typeof value === 'number' ? value : undefined
      continue
    }
    const canonical = HEADER_MAP[normalizeKey(rawKey)]
    if (canonical && !(canonical in normalized)) {
      normalized[canonical] = value
    }
  }
  return normalized
}

function normalizeKey(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^0-9a-zA-Z]+/g, ' ')
    .trim()
    .toLowerCase()
}

function getRowLabel(row: NormalizedRow, idx: number): number {
  if (typeof row.__rowNum__ === 'number') {
    // Header is row 0 internally, show 1-based index in UI
    return row.__rowNum__ + 1
  }
  // Default: +2 because header occupies the first row
  return idx + 2
}

function parseType(rawType: unknown): { type: SessionType; valid: boolean; original?: string } {
  if (rawType == null || rawType === '') {
    return { type: 'work', valid: true }
  }
  const normalized = String(rawType).trim().toLowerCase()
  const ascii = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const map: Record<string, SessionType> = {
    work: 'work',
    lucru: 'work',
    munca: 'work',
    pauza: 'break',
    break: 'break',
    tigara: 'cigarette',
    cigarette: 'cigarette'
  }
  const cleaned = ascii.replace(/\s+/g, '')
  const resolved = map[normalized] ?? map[ascii] ?? map[cleaned]
  if (resolved) {
    return { type: resolved, valid: true }
  }
  return { type: 'work', valid: false, original: normalized }
}

function resolveStart(row: NormalizedRow): { startedAt: number | null; note?: string } {
  const { date, start } = row
  if (start != null && start !== '') {
    const fromExplicit = combineDateAndTime(date, start)
    if (fromExplicit != null) {
      return { startedAt: fromExplicit }
    }
    const datetime = parseDateTimeValue(start)
    if (datetime != null) {
      return { startedAt: datetime }
    }
  }

  if (date != null && date !== '') {
    const onlyDate = parseDateCell(date)
    if (onlyDate != null) {
      return {
        startedAt: onlyDate,
        note: 'lipsește ora de început — am folosit 00:00'
      }
    }
  }

  return { startedAt: null }
}

function resolveEnd(row: NormalizedRow, startTimestamp: number): { endedAt: number | null; note?: string } {
  const { date, end, duration } = row
  if (end != null && end !== '') {
    const fromExplicit = combineDateAndTime(date ?? null, end, startTimestamp)
    if (fromExplicit != null) {
      return { endedAt: fromExplicit }
    }
    const datetime = parseDateTimeValue(end)
    if (datetime != null) {
      return { endedAt: datetime }
    }
  }

  if (duration != null && duration !== '') {
    const minutes = parseNumber(duration)
    if (!Number.isNaN(minutes)) {
      const durationMs =
        minutes > 24 ? minutes * 60 * 1000 : minutes * 60 * 60 * 1000
      return {
        endedAt: startTimestamp + durationMs,
        note: 'sfârșit derivat din durată'
      }
    }
  }

  return {
    endedAt: null,
    note: 'lipsește sfârșitul — sesiunea este considerată încă în desfășurare'
  }
}

function combineDateAndTime(dateValue: unknown, timeValue: unknown, fallbackDate?: number): number | null {
  const dateTimestamp = parseDateCell(dateValue)
  const timeOffset = parseTimeCell(timeValue)

  if (dateTimestamp != null && timeOffset != null) {
    return dateTimestamp + timeOffset
  }

  if (timeOffset != null && fallbackDate != null) {
    const baseDate = startOfDay(fallbackDate)
    return baseDate + timeOffset
  }

  if (dateTimestamp != null) {
    return dateTimestamp
  }

  return null
}

function parseDateCell(value: unknown): number | null {
  if (value == null || value === '') return null

  if (typeof value === 'number') {
    if (Number.isNaN(value)) return null
    if (value === 0) return null
    return EXCEL_EPOCH + value * MS_IN_DAY
  }

  if (value instanceof Date) {
    return value.getTime()
  }

  const str = String(value).trim()
  if (!str) return null

  // ISO or ISO-like
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (isoMatch) {
    const [, y, m, d, hh = '0', mm = '0', ss = '0'] = isoMatch
    return new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      Number(ss)
    ).getTime()
  }

  // Romanian format dd.mm.yyyy
  const roMatch = str.match(/^(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if (roMatch) {
    const [, d, m, y, hh = '0', mm = '0', ss = '0'] = roMatch
    return new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      Number(ss)
    ).getTime()
  }

  const parsed = Date.parse(str)
  if (!Number.isNaN(parsed)) {
    return parsed
  }

  return null
}

function parseTimeCell(value: unknown): number | null {
  if (value == null || value === '') return null

  if (typeof value === 'number') {
    if (Number.isNaN(value)) return null
    if (value >= 1440) {
      const fractional = value - Math.floor(value)
      return fractional > 0 ? Math.round(fractional * MS_IN_DAY) : 0
    }
    if (value > 24) {
      return Math.round(value * 60 * 1000)
    }
    if (value >= 1) {
      return Math.round(value * 60 * 60 * 1000)
    }
    return Math.round(value * MS_IN_DAY)
  }

  const str = String(value).trim()
  if (!str) return null

  // HH:MM[:SS]
  const timeMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (timeMatch) {
    const [, hh, mm, ss = '0'] = timeMatch
    const hours = Number(hh)
    const minutes = Number(mm)
    const seconds = Number(ss)
    return ((hours * 60 + minutes) * 60 + seconds) * 1000
  }

  // HH.MM or HH,MM (treat decimals as minutes)
  const decimalMatch = str.match(/^(\d{1,2})[.,](\d{1,2})$/)
  if (decimalMatch) {
    const [, hh, mm] = decimalMatch
    const hours = Number(hh)
    const fraction = Number(`0.${mm}`)
    return Math.round((hours + fraction) * 60 * 60 * 1000)
  }

  // Try parsing as datetime
  const parsed = parseDateTimeValue(str)
  if (parsed != null) {
    return parsed - startOfDay(parsed)
  }

  return null
}

function parseDateTimeValue(value: unknown): number | null {
  if (value == null || value === '') return null

  if (typeof value === 'number') {
    if (Number.isNaN(value)) return null
    return EXCEL_EPOCH + value * MS_IN_DAY
  }

  if (value instanceof Date) {
    return value.getTime()
  }

  const str = String(value).trim()
  if (!str) return null

  const parsed = Date.parse(str)
  if (!Number.isNaN(parsed)) {
    return parsed
  }

  const roMatch = str.match(/^(\d{1,2})[.\-](\d{1,2})[.\-](\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (roMatch) {
    const [, d, m, y, hh, mm, ss = '0'] = roMatch
    return new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      Number(ss)
    ).getTime()
  }

  return null
}

function parseOptionalString(value: unknown): string | undefined {
  if (value == null) return undefined
  const text = String(value).trim()
  return text.length > 0 ? text : undefined
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value
  }
  if (value == null) return NaN
  const raw = String(value).trim()
  if (!raw) return NaN
  const timeMatch = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (timeMatch) {
    const [, hh, mm] = timeMatch
    return Number(hh) * 60 + Number(mm)
  }
  const normalized = raw.replace(',', '.')
  return Number(normalized)
}

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}
