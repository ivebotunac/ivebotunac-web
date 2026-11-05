// The six sub-agents: who they are, where they hide, and their 16x16 sprites drawn onto the fx canvas.
import { CYAN, INK, ORANGE, PAPER, YELLOW } from './config'
import type { Pxl, AgentRole } from './types'

export interface RoleInfo { label: string, section: string | null, where: string, c: string }

export const ROLES: readonly AgentRole[] = ['planner', 'researcher', 'analyst', 'reviewer', 'coder', 'deployer']

// `section` is the CV section id the agent hides in; the Deployer is earned by popping the robot.
export const ROLE_INFO: Record<AgentRole, RoleInfo> = {
  planner: { label: 'Planner', section: 'experience', where: 'Experience', c: '#36c6e0' },
  researcher: { label: 'Researcher', section: 'publications', where: 'Publications', c: '#0b6bcb' },
  analyst: { label: 'Analyst', section: 'education', where: 'Education', c: '#9b6bff' },
  reviewer: { label: 'Reviewer', section: 'certifications', where: 'Certifications', c: '#ff5a1f' },
  coder: { label: 'Coder', section: 'skills', where: 'Skills', c: '#213b54' },
  deployer: { label: 'Deployer', section: null, where: 'a popped robot', c: '#ffd23b' }
}

interface Look { body: string, dark: string, eye: string }

const LOOK: Record<AgentRole, Look> = {
  planner: { body: CYAN, dark: '#1fa9c2', eye: PAPER },
  researcher: { body: '#0b6bcb', dark: '#0a559e', eye: CYAN },
  analyst: { body: '#9b6bff', dark: '#6f45d9', eye: PAPER },
  reviewer: { body: ORANGE, dark: '#bf3f0b', eye: YELLOW },
  coder: { body: '#213b54', dark: INK, eye: CYAN },
  deployer: { body: YELLOW, dark: '#c99a16', eye: ORANGE }
}

// The shared chassis: a screen-faced head, a small torso and two hover jets.
function chassis(P: Pxl, k: Look, blink: boolean, jets: boolean, flick: boolean): void {
  P(4, 3, 8, 6, k.body); P(4, 8, 8, 1, k.dark)
  P(5, 4, 6, 3, INK)
  if (blink) { P(6, 6, 1, 1, k.eye); P(9, 6, 1, 1, k.eye) } else { P(6, 5, 1, 1, k.eye); P(9, 5, 1, 1, k.eye) }
  P(5, 9, 6, 3, k.body); P(5, 12, 6, 1, k.dark)
  P(4, 10, 1, 2, k.dark); P(11, 10, 1, 2, k.dark)
  if (jets) { P(6, 13, 1, 1, k.dark); P(9, 13, 1, 1, k.dark); if (flick) { P(6, 14, 1, 1, CYAN); P(9, 14, 1, 1, CYAN) } }
}

// Planner: a flag antenna and a clipboard.
function planner(P: Pxl, k: Look, blink: boolean, t: number): void {
  chassis(P, k, blink, true, t % 8 < 4)
  P(7, 0, 1, 3, k.dark); P(8, 0, 2, 1, ORANGE); P(8, 1, 1, 1, ORANGE)
  P(12, 8, 3, 4, '#ffffff'); P(13, 8, 1, 1, INK); P(12, 9, 2, 1, '#93a8bc'); P(12, 10, 3, 1, '#93a8bc')
}

// Researcher: a bulb antenna and a magnifying glass.
function researcher(P: Pxl, k: Look, blink: boolean, t: number): void {
  chassis(P, k, blink, true, t % 8 < 4)
  P(8, 1, 1, 2, k.dark); P(8, 0, 1, 1, t % 50 < 30 ? CYAN : PAPER)
  P(13, 6, 2, 1, INK); P(12, 7, 1, 2, INK); P(15, 7, 1, 2, INK); P(13, 9, 2, 1, INK)
  P(13, 7, 2, 2, '#bfeaf3'); P(12, 10, 1, 1, INK)
}

// Analyst: round goggles and a bar chart on the chest.
function analyst(P: Pxl, k: Look, blink: boolean, t: number): void {
  chassis(P, k, blink, true, t % 8 < 4)
  P(3, 4, 1, 3, k.dark); P(12, 4, 1, 3, k.dark)
  if (blink) { P(5, 5, 2, 1, PAPER); P(9, 5, 2, 1, PAPER) } else { P(5, 4, 2, 2, PAPER); P(9, 4, 2, 2, PAPER); P(7, 4, 2, 1, PAPER); P(6, 5, 1, 1, INK); P(10, 5, 1, 1, INK) }
  P(6, 9, 4, 3, PAPER); P(6, 11, 1, 1, CYAN); P(7, 10, 1, 2, ORANGE); P(8, 11, 1, 1, CYAN); P(9, 9, 1, 3, '#0b6bcb')
}

// Reviewer: a check mark on the chest and a pen in hand.
function reviewer(P: Pxl, k: Look, blink: boolean, t: number): void {
  chassis(P, k, blink, true, t % 8 < 4)
  P(8, 1, 1, 2, k.dark); P(8, 0, 1, 1, '#ffffff')
  P(6, 10, 1, 1, '#ffffff'); P(7, 11, 1, 1, '#ffffff'); P(8, 10, 1, 1, '#ffffff'); P(9, 9, 1, 1, '#ffffff')
  P(12, 7, 1, 1, PAPER); P(12, 8, 1, 4, YELLOW); P(12, 12, 1, 1, INK)
}

// Coder: headphones and a blinking prompt on the chest.
function coder(P: Pxl, k: Look, blink: boolean, t: number): void {
  chassis(P, k, blink, true, t % 8 < 4)
  P(4, 2, 8, 1, ORANGE); P(3, 3, 1, 1, ORANGE); P(12, 3, 1, 1, ORANGE); P(3, 4, 1, 3, ORANGE); P(12, 4, 1, 3, ORANGE)
  P(6, 9, 1, 1, CYAN); P(7, 10, 1, 1, CYAN); P(6, 11, 1, 1, CYAN)
  if (t % 40 < 22) P(8, 11, 2, 1, CYAN)
}

// Deployer: a striped helmet, side fins and a rocket flame instead of jets.
function deployer(P: Pxl, k: Look, blink: boolean, t: number): void {
  chassis(P, k, blink, false, false)
  P(4, 3, 8, 1, ORANGE); P(8, 1, 1, 2, k.dark); P(7, 0, 3, 1, ORANGE)
  P(3, 9, 1, 3, ORANGE); P(12, 9, 1, 3, ORANGE)
  P(6, 13, 4, 1, ORANGE); P(7, 14, 2, 1, t % 6 < 3 ? '#ffffff' : YELLOW)
  if (t % 6 < 3) P(7, 15, 2, 1, ORANGE)
}

const RECIPE: Record<AgentRole, (P: Pxl, k: Look, blink: boolean, t: number) => void> = { planner, researcher, analyst, reviewer, coder, deployer }

// Centred on (cx, cy) at `p` screen pixels per grid cell; dir -1 mirrors it. `seed` staggers blinks.
export function drawAgent(c: CanvasRenderingContext2D, role: AgentRole, cx: number, cy: number, p: number, dir: number, t: number, seed: number): void {
  const x0 = Math.round(cx - 8 * p), y0 = Math.round(cy - 8 * p)
  const P: Pxl = dir < 0
    ? (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x0 + Math.round((16 - x - w) * p), y0 + Math.round(y * p), Math.ceil(w * p), Math.ceil(h * p)) }
    : (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x0 + Math.round(x * p), y0 + Math.round(y * p), Math.ceil(w * p), Math.ceil(h * p)) }
  const blink = (t + seed * 53) % 190 < 7
  RECIPE[role](P, LOOK[role], blink, t)
}
