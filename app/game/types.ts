// The elements the component renders and hands to start().
export interface GameRefs {
  pet: HTMLElement
  canvas: HTMLCanvasElement
  bubble: HTMLElement
  trend: HTMLElement
  fx: HTMLCanvasElement
  rage: HTMLElement
}

export type Mode = 'held' | 'knock' | 'chase' | 'attack' | 'idle'
export type AttackKind = 'bullets' | 'beam' | 'melee' | 'ball'
export type AttackPhase = 'approach' | 'return'

export interface Point { x: number, y: number }

export interface Spark { x: number, y: number, vx: number, vy: number, life: number, max: number, c: string }
export interface Beam { x1: number, y1: number, x2: number, y2: number, life: number, max: number, c: string }
export interface Bullet { x: number, y: number, vx: number, vy: number, life: number, max: number }
export interface Ball { x: number, y: number, vx: number, vy: number, spin: number, dspin: number, life: number, max: number }
export interface Debris { x: number, y: number, vx: number, vy: number, sz: number, c: string, life: number, max: number, landed: boolean }
export interface Ring { x: number, y: number, life: number, max: number, c?: string }
export interface Popup { x: number, y: number, text: string, life: number, max: number, c?: string, size?: number }
export interface Trend { x: number, baseY: number, y: number, vx: number, tt: number, label: string, hits: number }
// A press that landed on the robot: becomes a grab once it moves, a throw when released.
export interface Press { sx: number, sy: number, x: number, y: number, ox: number, oy: number, t0: number, moved: boolean, hist: { x: number, y: number, ms: number }[] }
