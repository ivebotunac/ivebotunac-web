const pad = (n: number) => String(n).padStart(2, '0')

// 3:42 under an hour, 1:02:03 under a day, then whole days.
export function formatClock(ms: number): string {
  const s = Math.round(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
  if (h >= 24) { const d = Math.round(h / 24); return `${d} ${d === 1 ? 'day' : 'days'}` }
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`
}
