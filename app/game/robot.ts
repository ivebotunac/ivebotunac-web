// The robot's pixel-art recipe; no game state. The critter forms are JSON sprites drawn by critters.ts.
import type { Mood, Palette, Pxl } from './types'

type Rect = [x: number, y: number, w: number, h: number]

// The eye cells of each face; a knocked-out robot shows dizzy eyes, and a blink beats every other mood.
const FACES: Record<Mood | 'blink', Rect[]> = {
  knock: [[6, 4, 1, 1], [7, 5, 1, 1], [6, 6, 1, 1], [9, 4, 1, 1], [10, 5, 1, 1], [9, 6, 1, 1]],
  blink: [[6, 6, 1, 1], [9, 6, 1, 1]],
  mad: [[5, 4, 1, 1], [6, 5, 1, 1], [10, 4, 1, 1], [9, 5, 1, 1], [7, 7, 2, 1]],
  attack: [[6, 4, 1, 2], [9, 4, 1, 2]],
  happy: [[6, 4, 1, 2], [9, 4, 1, 2], [7, 6, 2, 1]],
  idle: [[6, 5, 1, 1], [9, 5, 1, 1]]
}

export function drawRobot(pxl: Pxl, pal: Palette, t: number, state: Mood, blink: boolean, moving: boolean): void {
  pxl(3, 8, 1, 3, pal.body2); pxl(12, 8, 1, 3, pal.body2)
  const lp = moving ? (Math.floor(t * 0.28) % 2) : -1
  pxl(5, 12, 2, lp === 0 ? 1 : 2, pal.body2); pxl(9, 12, 2, lp === 1 ? 1 : 2, pal.body2)
  pxl(5, 8, 6, 4, pal.body); pxl(7, 9, 2, 1, pal.eye)
  pxl(4, 3, 8, 5, pal.body); pxl(5, 4, 6, 3, pal.screen)
  const face = state === 'knock' ? 'knock' : blink ? 'blink' : state
  const c = face === 'knock' ? pal.dizzy : pal.eye
  for (const [x, y, w, h] of FACES[face]) pxl(x, y, w, h, c)
  pxl(8, 1, 1, 2, pal.body2); pxl(7, 0, 2, 1, (t % 60 < 40) ? pal.eye : '#9c5a3a')
}
