import type { Role, YearMonth } from '~/types/cv'

const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const parse = (ym: YearMonth): [number, number] => {
  const [y, m] = ym.split('-').map(Number)
  return [y ?? 0, m ?? 1]
}

export const toYearMonth = (date: Date): YearMonth =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` as YearMonth

// Inclusive of both months, as LinkedIn counts: Dec 2020 to Nov 2021 is 1 yr.
export const monthsBetween = (start: YearMonth, end: YearMonth): number => {
  const [sy, sm] = parse(start)
  const [ey, em] = parse(end)
  return Math.max(1, (ey - sy) * 12 + (em - sm) + 1)
}

// "1 yr 5 mos", "7 mos", "8 yrs".
export const formatDuration = (start: YearMonth, end: YearMonth | 'present', now: YearMonth): string => {
  const total = monthsBetween(start, end === 'present' ? now : end)
  const yrs = Math.floor(total / 12)
  const mos = total % 12
  const parts: string[] = []
  if (yrs) parts.push(`${yrs} ${yrs === 1 ? 'yr' : 'yrs'}`)
  if (mos) parts.push(`${mos} ${mos === 1 ? 'mo' : 'mos'}`)
  return parts.join(' ')
}

// "Jul 2025", or "Present".
export const formatMonth = (ym: YearMonth | 'present'): string => {
  if (ym === 'present') return 'Present'
  const [y, m] = parse(ym)
  return `${SHORT[m - 1]} ${y}`
}

// "Jul 2025 – Present".
export const formatRange = (start: YearMonth, end: YearMonth | 'present'): string =>
  `${formatMonth(start)} – ${formatMonth(end)}`

// An org's tenure runs from its earliest role start to its latest role end.
export const orgSpan = (roles: Role[]): { start: YearMonth, end: YearMonth | 'present' } => {
  const starts = roles.map(r => r.start).sort()
  const end = roles.some(r => r.end === 'present')
    ? 'present'
    : roles.map(r => r.end as YearMonth).sort().at(-1)
  return { start: starts[0] as YearMonth, end: end as YearMonth | 'present' }
}

// "October 2026", for the rail's "Last updated".
export const formatUpdated = (ym: YearMonth): string => {
  const [y, m] = parse(ym)
  return `${LONG[m - 1]}\u00A0${y}`
}
