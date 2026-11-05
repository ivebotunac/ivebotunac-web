// The robot's pixel-art recipe; no game state. The critter forms are JSON sprites drawn by critters.ts.
import type { Mood, Palette } from './config'
import type { Pxl } from './types'

export function drawRobot(pxl: Pxl, col: Palette, t: number, state: Mood, blink: boolean, moving: boolean): void {
  pxl(3, 8, 1, 3, col.body2); pxl(12, 8, 1, 3, col.body2);
  const lp = moving ? (Math.floor(t * 0.28) % 2) : -1;
  pxl(5, 12, 2, lp === 0 ? 1 : 2, col.body2); pxl(9, 12, 2, lp === 1 ? 1 : 2, col.body2);
  pxl(5, 8, 6, 4, col.body); pxl(7, 9, 2, 1, col.eye);
  pxl(4, 3, 8, 5, col.body); pxl(5, 4, 6, 3, col.screen);
  if (state === 'knock') { pxl(6, 4, 1, 1, col.dizzy); pxl(7, 5, 1, 1, col.dizzy); pxl(6, 6, 1, 1, col.dizzy); pxl(9, 4, 1, 1, col.dizzy); pxl(10, 5, 1, 1, col.dizzy); pxl(9, 6, 1, 1, col.dizzy); }
  else if (blink) { pxl(6, 6, 1, 1, col.eye); pxl(9, 6, 1, 1, col.eye); }
  else if (state === 'mad') { pxl(5, 4, 1, 1, col.eye); pxl(6, 5, 1, 1, col.eye); pxl(10, 4, 1, 1, col.eye); pxl(9, 5, 1, 1, col.eye); pxl(7, 7, 2, 1, col.eye); }
  else if (state === 'attack') { pxl(6, 4, 1, 2, col.eye); pxl(9, 4, 1, 2, col.eye); }
  else if (state === 'happy') { pxl(6, 4, 1, 2, col.eye); pxl(9, 4, 1, 2, col.eye); pxl(7, 6, 2, 1, col.eye); }
  else { pxl(6, 5, 1, 1, col.eye); pxl(9, 5, 1, 1, col.eye); }
  pxl(8, 1, 1, 2, col.body2); pxl(7, 0, 2, 1, (t % 60 < 40) ? col.eye : '#9c5a3a');
}
