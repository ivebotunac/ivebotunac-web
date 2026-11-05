// Renders critter JSON sprites to PNG with no dependencies.
// node scripts/critter-sheet.mjs <sprite.json> <out.png>: idle, blink, happy, attack, mad, knock, walk
// S=12 node scripts/critter-sheet.mjs --sheet <dir> <out.png>: each *.json idle, 6 a row; S = px/cell
// Exits 1 and prints every problem when a sprite breaks the format.
import { deflateSync } from 'node:zlib'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const N = 24
const BG = [242, 246, 251]
const DIZZY = '#9fb3c6'
const MOODS = ['idle', 'blink', 'happy', 'attack', 'mad', 'knock', 'walk']

const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }

function validate(s) {
  const err = []
  if (!s.key || !/^[a-z]+$/.test(s.key)) err.push('key must be lowercase letters')
  if (!s.label || !/^[A-Z]{3,12}$/.test(s.label)) err.push('label must be 3-12 capital letters')
  const pal = s.palette || {}
  for (const [k, v] of Object.entries(pal)) {
    if (k.length !== 1 || k === '.') err.push(`palette key "${k}" must be one character other than "."`)
    if (!/^#[0-9a-fA-F]{6}$/.test(v)) err.push(`palette "${k}" must be #rrggbb`)
  }
  for (const f of ['idle', 'walk']) {
    const m = s.frames?.[f]
    if (!Array.isArray(m) || m.length !== N) { err.push(`frames.${f} must have ${N} rows`); continue }
    m.forEach((row, y) => {
      if (typeof row !== 'string' || row.length !== N) err.push(`frames.${f} row ${y} must be ${N} chars, is ${row?.length}`)
      else for (const ch of row) if (ch !== '.' && !(ch in pal)) err.push(`frames.${f} row ${y} uses "${ch}" not in palette`)
    })
  }
  for (const side of ['l', 'r']) {
    const e = s.eyes?.[side]
    if (!Array.isArray(e) || e.length !== 2 || e.some(v => !Number.isInteger(v))) err.push(`eyes.${side} must be [x, y]`)
    else if (e[0] < 1 || e[0] > N - 3 || e[1] < 2 || e[1] > N - 2) err.push(`eyes.${side} too close to the edge`)
  }
  if (s.eyes?.color && !/^#[0-9a-fA-F]{6}$/.test(s.eyes.color)) err.push('eyes.color must be #rrggbb')
  if (s.outline && !/^#[0-9a-fA-F]{6}$/.test(s.outline)) err.push('outline must be #rrggbb')
  return err
}

// One 24x24 colour grid (null = transparent): the frame, its auto outline, then the mood's eyes.
function cells(s, mood) {
  const map = s.frames[mood === 'walk' ? 'walk' : 'idle']
  const g = Array.from({ length: N }, (_, y) => Array.from({ length: N }, (_, x) => {
    const ch = map[y][x]
    return ch === '.' ? null : s.palette[ch]
  }))
  const out = s.outline || '#1d2433'
  const filled = (x, y) => x >= 0 && y >= 0 && x < N && y < N && map[y][x] !== '.'
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!filled(x, y) && (filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1))) g[y][x] = out
  }
  const ec = s.eyes.color || '#1a1a1a'
  const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = c }
  for (const side of ['l', 'r']) {
    const [x, y] = s.eyes[side]
    const m = mood === 'walk' ? 'idle' : mood
    // brows slope down toward the face's centre line
    const brow = () => side === 'l' ? (put(x, y - 2, ec), put(x + 1, y - 1, ec)) : (put(x + 1, y - 2, ec), put(x, y - 1, ec))
    if (m === 'idle') { put(x, y, '#ffffff'); put(x + 1, y, ec); put(x, y + 1, ec); put(x + 1, y + 1, ec) } else if (m === 'blink') { put(x, y + 1, ec); put(x + 1, y + 1, ec) } else if (m === 'happy') { put(x, y - 1, '#ffffff'); put(x + 1, y - 1, ec); for (const yy of [y, y + 1]) { put(x, yy, ec); put(x + 1, yy, ec) } } else if (m === 'attack') { brow(); put(x, y, ec); put(x + 1, y, ec); put(x, y + 1, ec); put(x + 1, y + 1, ec) } else if (m === 'mad') { brow(); put(x, y + 1, ec); put(x + 1, y + 1, ec) } else if (m === 'knock') {
      const o = x - 1
      put(o, y - 1, DIZZY); put(o + 2, y - 1, DIZZY); put(o + 1, y, DIZZY); put(o, y + 1, DIZZY); put(o + 2, y + 1, DIZZY)
    }
  }
  return g
}

function png(w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3) }
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0 })
  const crc = (b) => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td))
    return Buffer.concat([len, td, c])
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}

// Tiles of S px per cell with a 2-cell gap; a faint checker marks the 24x24 frame.
function sheet(grids, cols, S) {
  const pad = S * 2, tile = N * S
  const rows = Math.ceil(grids.length / cols)
  const w = cols * tile + (cols + 1) * pad, h = rows * tile + (rows + 1) * pad
  const buf = Buffer.alloc(w * h * 3)
  for (let i = 0; i < w * h; i++) buf.set(BG, i * 3)
  grids.forEach((g, i) => {
    const ox = pad + (i % cols) * (tile + pad), oy = pad + Math.floor(i / cols) * (tile + pad)
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const c = g[y][x] ? hex(g[y][x]) : ((x + y) % 2 ? [232, 238, 246] : [224, 232, 242])
      for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) buf.set(c, ((oy + y * S + yy) * w + ox + x * S + xx) * 3)
    }
  })
  return png(w, h, buf)
}

const [a, b, c] = process.argv.slice(2)
if (a === '--sheet') {
  const files = readdirSync(b).filter(f => f.endsWith('.json')).sort()
  const bad = []
  const grids = files.map((f) => {
    const s = JSON.parse(readFileSync(path.join(b, f), 'utf8'))
    const e = validate(s); if (e.length) { bad.push(`${f}: ${e.join('; ')}`); return null }
    return cells(s, 'idle')
  }).filter(Boolean)
  writeFileSync(c, sheet(grids, Math.min(6, grids.length), +(process.env.S || 6)))
  console.log(`${grids.length} sprites -> ${c}`)
  if (bad.length) { console.error(bad.join('\n')); process.exit(1) }
} else if (a && b) {
  const s = JSON.parse(readFileSync(a, 'utf8'))
  const e = validate(s)
  if (e.length) { console.error(e.join('\n')); process.exit(1) }
  writeFileSync(b, sheet(MOODS.map(m => cells(s, m)), MOODS.length, 8))
  console.log(`${s.key}: ${MOODS.join(', ')} -> ${b}`)
} else {
  console.error('usage: critter-sheet.mjs <sprite.json> <out.png> | --sheet <dir> <out.png>')
  process.exit(2)
}
