// Tuning constants, palette and every text bank; pure data plus a few pure helpers.
import type { Palette } from './types'

// The robot's square canvas in CSS pixels; the robot is drawn and scaled in-canvas so it stays crisp.
export const CANVAS = 220
export const U = 3
export const HALF = CANVAS / 2
export const CX = HALF
export const CY = HALF
// Size, bubble gap and hit radius all derive from displayScale, so BASE rescales them together.
const BASE = 1.56
// Morph "poof" duration in ticks.
export const MORPH = 20
// Largest drawn size, random growth plus inflation, that still fits the 220px canvas.
export const MAX_SIZE = 2.6

export const INK = '#0c2236'
export const PAPER = '#f5f9fd'
export const CYAN = '#36c6e0'
export const ORANGE = '#ff5a1f'
export const YELLOW = '#ffd23b'
export const WHITE = '#ffffff'
// The robot's body blues.
export const BODY = '#3b7cc0'
export const BODY2 = '#285a8c'
// The site's link blue, body-copy slate and faint text grey, plus the game's violet and heart pink.
export const DEEP_BLUE = '#0b6bcb'
export const SLATE = '#213b54'
export const FAINT = '#93a8bc'
export const VIOLET = '#9b6bff'
export const PINK = '#ff6fa3'

export const ROBOT_PALETTE: Palette = {
  body: BODY,
  body2: BODY2,
  screen: INK,
  eye: ORANGE,
  dizzy: '#9fb3c6',
  spark: [ORANGE, CYAN, WHITE]
}

// Debris and burst colours: the brand palette plus the robot's body blue.
export const BRAND: string[] = [INK, CYAN, ORANGE, PAPER, BODY]
export const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace'

// Shrinks on narrow viewports, but never below 0.9 of BASE, so it stays clearly visible on phones.
export function dispScale(W: number): number {
  return BASE * Math.max(0.9, Math.min(1, W / 720))
}

export const QUIPS: string[] = [
  'AI will take your job. (kidding… mostly)', 'I\'m not sentient. That\'s what I\'d say though.',
  'Trained on the whole internet, still can\'t parallel park.', 'Hallucinating responsibly since 2023.',
  'beep boop, hire Ive.', 'I peaked at autocomplete.', 'Resistance is futile. nice CV though.',
  '01001000 01101001 👋', 'AGI is 2 weeks away. always.', 'I read his CV. all 4096 tokens of it.',
  'Scaling laws go brrr.', 'I\'m a very confident lookup table.', 'I don\'t sleep. I checkpoint.',
  'Fine-tuned on vibes.', 'H100s? in this economy?', 'RAG: because I forget things.',
  'Temperature 0.7, personality 11.', 'ask him about agentic AI. I\'m the demo.',
  'built in Zadar. trained on espresso.', 'he also teaches. I\'m the homework.'
]
export const KNOCK_LINES: string[] = ['Ow. Lawsuit incoming.', 'You can\'t stop progress.', 'That\'s going in the training data.', 'Rude. Anyway… AGI soon.', 'Error 418: I\'m a teapot now.']
export const RECOVER_LINES: string[] = ['✦ recompiling ✦', 'back, and fine-tuned.', 'you only made me stronger.', 'redeployed. v2.0.']
export const HIT_LINES: string[] = ['Gotcha, human.', 'Cursor acquired.', 'Target locked.', 'Tag, you\'re trained.']
export const MISS_LINES: string[] = ['missed. recalibrating…', 'lag. blame the GPU.', 'you dodged. impressive.']
export const STEAL_LINES: string[] = ['Hey! That trend was MINE.', 'Give it back, human!', 'Stealing my trends? rude.', 'That\'s MY alpha, attack mode on.', 'You\'ll regret that catch.']
// Said when the visitor drags the trend tag around instead of popping it.
export const LURE_LINES: string[] = ['ooh. a trend. come here.', 'give me that!', 'I must have it.', 'stop waving it, I\'m coming!']
export const CAUGHT_TPL: string[] = ['Caught the ', 'Acquired: ', 'Shipped: ']
// The tutorial, one skill at a time; `touch`, where set, replaces `mouse` on phones.
export const TUT_LINES: Record<'hit' | 'juggle' | 'pop' | 'throw' | 'pet' | 'team' | 'toss' | 'lure', { mouse: string, touch?: string }> = {
  hit: { mouse: 'psst. click me.', touch: 'psst. tap me.' },
  juggle: { mouse: 'hit me again before I land!', touch: 'tap me again before I land!' },
  pop: { mouse: 'careful. every hit inflates me.' },
  throw: { mouse: 'fine. now grab me, drag, and let go.', touch: 'fine. now hold me, drag, and let go.' },
  pet: { mouse: 'or be nice: move slowly over me.' },
  team: { mouse: 'psst. my sub-agents ran off into the CV. open a few rows to find them.' },
  toss: { mouse: 'my agents can be grabbed and thrown too. gently.' },
  lure: { mouse: 'grab that trend and drag it. I\'ll follow.', touch: 'hold that trend and drag it. I\'ll follow.' }
}
export const WELCOME_LINES: string[] = ['welcome back, human.', 'oh. you again.', 'back for more?']
export const WELCOME_POP_LINES: string[] = ['welcome back. I still remember the pop.', 'oh, it\'s the one who popped me.']
// Said once a visit when the cursor first reaches a link of that kind; keys match the href.
export const LINK_LINES: Record<string, string[]> = {
  'github.com': ['the code is real. go look.', 'commits by a human. mostly.'],
  'https://x.com': ['he posts about building apps there.', 'follow him. I can\'t, no thumbs.'],
  'linkedin.com': ['go on, connect.', 'he accepts invites. I checked.'],
  'scholar.google': ['peer reviewed. unlike me.', 'citations go brrr.'],
  'orcid.org': ['one id for every paper. very serious.'],
  'techprimo.ai': ['his studio. I\'m the intern.'],
  'doi.org': ['actual science. go read it.'],
  'coursera.org': ['he did the homework. I just scraped it.']
}
export const GRAB_LINES: string[] = ['hey! put me down!', 'unhand me, human.', 'I get airsick!', 'this is not in my training data.']
export const THROW_LINES: string[] = ['WHEEE!', 'I\'m flying! unsupervised!', 'gradient descent, literally.', 'not the face!']
export const PUFF_LINES: string[] = ['I\'m… inflating?', 'too many parameters!', 'stop, I\'m overfitting!', 'context window overflowing…']
export const RESPAWN_LINES: string[] = ['✦ restored from checkpoint ✦', 'rebooted. that was rude.', 'v3.0, now with airbags.', 'you popped me. I remember everything.']
export const PET_LINES: string[] = ['…ok, that\'s nice.', 'purring in binary.', 'reward signal received ♥', 'fine. you can stay.']
export const SLEEP_LINES: string[] = ['low power mode… zzz', 'nobody\'s watching. nap time.', 'entering sleep(). zzz']
export const WAKE_LINES: string[] = ['huh? I wasn\'t sleeping.', 'rebooting… where was I?', 'I was just defragmenting.']
export const SCROLL_LINES: string[] = ['whoa, speed reader.', 'slow down, it\'s a good CV.', 'you skipped the good part.']
// Said once at these combo counts.
export const COMBO_LINES: Record<number, string> = {
  5: 'ok, you\'re good at this.',
  10: 'combo x10. are you training me?',
  20: 'this is a CV, not an arcade.',
  30: 'please. I have a family. of models.'
}
// One line per CV section, said once when it first comes into view.
export const SECTION_LINES: Record<string, string[]> = {
  about: ['that\'s him. the human I work for.', 'tl;dr: AI, research, and me.'],
  experience: ['he built me between all of these jobs.', 'yes, all of that is real.'],
  publications: ['I\'m cited in none of these. yet.', 'ten papers and not one about me.'],
  education: ['a PhD. I just have a lot of weights.', 'he studied. I just scraped.'],
  certifications: ['he\'s certified. I\'m certifiable.', 'a certificate a quarter. like updates.'],
  skills: ['I\'m not on this list. rude.', 'skills: plenty. punching robots: please no.']
}
// The quest: `{r}` is a role, `{s}` a CV section.
export const PEEK_LINES: { mouse: string[], touch: string[] } = {
  mouse: ['there\'s my {r}! click it.', 'found the {r}. grab it, quick!', 'my {r}! click before it hides.'],
  touch: ['there\'s my {r}! tap it.', 'found the {r}. tap it, quick!', 'my {r}! tap before it hides.']
}
export const NOT_HERE_LINES: string[] = ['not here. try another row in {s}.', 'warm… but not this row. {s} still hides one.', 'nope. someone\'s hiding elsewhere in {s}.']
export const RECRUIT_LINES: string[] = ['{r} reporting for duty.', '{r} is back on the team.', 'found my {r}. good human.', '{r} recruited.']
export const ROW_RECRUIT_LINE = 'found the {r} in "{row}".'
export const LAST_AGENT_LINE = 'one left: the {r}, somewhere in {s}.'
export const LAST_DEPLOYER_LINE = 'one left: the Deployer. it only shows up when I pop.'
export const DEPLOYER_LINES: string[] = ['the Deployer! it only comes out when things blow up.', 'something exploded, so the Deployer showed up.']
export const TEAM_DONE_LINES: string[] = ['team assembled. orchestration online.', 'all six agents. now we\'re dangerous.', 'full team. we ship at dawn.']
export const RESTART_LINES: string[] = ['factory reset complete. who are you again?', 'fresh start. my agents ran off again.', 'memory wiped. the team is hiding again.']
// The recruited team's small talk.
export const REVIEW_LINES: string[] = ['LGTM', 'nit: rename this', 'needs tests', 'approved ✓', 'ship it', 'nit: typo', 'left 1 comment', 'why not a const?']
export const BOSS_REVIEW_LINES: string[] = ['changes requested', 'REJECTED', 'blocking: AGI', 'needs alignment']
// A carried agent, a thrown one, its landing, and the robot watching its teammate fly.
export const AGENT_GRAB_LINES: string[] = ['hey!', 'put me down', 'out of scope!', 'not in my prompt']
export const AGENT_TOSS_LINES: string[] = ['wheee!', 'yeet()', 'async!', 'airborne!']
export const AGENT_LAND_LINES: string[] = ['@_@', 'recalibrating', 'which way is prod?', 'again!']
export const AGENT_TOSS_ROBOT_LINES: string[] = ['hey! that\'s my {r}.', 'careful, the {r} bruises.', 'nice throw. poor {r}.']
// A thrown agent that lands on the boss or knocks the trend tag out of the air.
export const AGENT_BOSS_HIT_LINES: string[] = ['direct hit!', 'agent-to-AGI: bonk', 'thrown and shipped']
export const AGENT_TREND_LINES: string[] = ['my {r} took out the trend. fine. teamwork.', 'the {r} knocked it down before I could.', 'trend dropped by the {r}. noted.']
// Fetch: a trend tag thrown away is brought back to the visitor.
export const FETCH_GO_LINES: string[] = ['fetch? fetch!', 'I\'ll get it!', 'mine mine mine']
export const FETCH_BACK_LINES: string[] = ['here. throw it again.', 'fetched. again?', 'good throw. again!']
// The collection of forms: `{n}` seen of `{m}`.
export const FORM_SEEN_LINES: string[] = ['new form logged. {n}/{m}.', '{n} of {m} forms seen.', 'collection: {n}/{m}. keep watching.']
export const FORM_ALL_LINE = 'all {m} forms seen. full dataset.'
// The AGI boss.
export const BOSS_START_LINES: string[] = ['AGI incoming. team, assemble!', 'it\'s here. everyone, attack!', 'AGI arrived early. fight it!']
export const BOSS_HALF_LINES: string[] = ['it\'s adapting. keep hitting!', 'halfway. don\'t stop now.', 'it\'s scaling. so are we.']
// The robot, the first time a fight burns letters out of the CV.
export const BOSS_BURN_LINES: string[] = ['it\'s burning the CV! hit it!', 'hey! that was a whole job title.', 'it\'s rewriting your CV. stop it!']
export const BOSS_WIN_LINES: string[] = ['AGI defeated. back to being a CV.', 'we beat AGI. put that on the CV.', 'alignment achieved. by force.']
export const BOSS_LEAVE_LINES: string[] = ['AGI got bored and left. the HUD can call it back.', 'it wandered off. fight it again from the HUD.']
export const CONFETTI: string[] = [ORANGE, CYAN, DEEP_BLUE, VIOLET, YELLOW, BODY]

export const TRENDS: string[] = ['Agentic AI', 'Reasoning models', 'World models', 'Multi-agent', 'MCP', 'Computer use', 'Test-time compute', 'Vision-Language-Action', 'On-device AI', 'Physical AI', 'Voice agents', 'Long context', 'Mixture-of-Experts', 'Synthetic data', 'RAG 2.0', 'Inference scaling']

// Said on morphing back from a critter; each critter brings its own morph lines.
export const ROBOT_LINES: string[] = ['the magic fades, robot again.', 'transformation complete: me.', 'beep boop, true form restored.']

export function rand(a: number, b: number): number {
  return a + Math.random() * (b - a)
}

export function pick<T>(a: readonly T[]): T {
  return a[(Math.random() * a.length) | 0] as T
}

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v))
}

// `base` plus a random whole number below `spread`: the jitter on every cooldown and timer.
export function vary(base: number, spread: number): number {
  return base + (rand(0, spread) | 0)
}
