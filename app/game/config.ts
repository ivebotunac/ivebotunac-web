// Tuning constants, palette and every text bank; pure data plus two pure helpers.

// 'robot', or the key of a critter sprite in critters/.
export type FormName = string

export type Mood = 'idle' | 'happy' | 'attack' | 'mad' | 'knock'

export interface Palette {
  body: string
  body2: string
  screen: string
  eye: string
  dizzy: string
  spark: string[]
}

// 220px canvas; the robot is drawn and scaled in-canvas so it stays crisp.
export const U = 3
export const CX = 110
export const CY = 110
export const HALF = 110
// Size, bubble gap and hit radius all derive from DS, so BASE rescales them together.
export const BASE = 1.56
// Morph "poof" duration in frames.
export const MORPH = 20
// Largest drawn size, random growth plus inflation, that still fits the 220px canvas.
export const MAX_SIZE = 2.6

export const col: Palette = {
  body: '#3b7cc0',
  body2: '#285a8c',
  screen: '#0c2236',
  eye: '#ff5a1f',
  dizzy: '#9fb3c6',
  spark: ['#ff5a1f', '#36c6e0', '#ffffff']
}

// Responsive floor 0.9 keeps it clearly visible on phones.
export function dispScale(W: number): number {
  return BASE * Math.max(0.9, Math.min(1, W / 720))
}

export const quips: string[] = [
  'AI will take your job. (kidding… mostly)', 'I\'m not sentient. That\'s what I\'d say though.',
  'Trained on the whole internet, still can\'t parallel park.', 'Hallucinating responsibly since 2023.',
  'beep boop, hire Ive.', 'I peaked at autocomplete.', 'Resistance is futile. nice CV though.',
  '01001000 01101001 👋', 'AGI is 2 weeks away. always.', 'I read his CV. all 4096 tokens of it.',
  'Scaling laws go brrr.', 'I\'m a very confident lookup table.', 'I don\'t sleep. I checkpoint.',
  'Fine-tuned on vibes.', 'H100s? in this economy?', 'RAG: because I forget things.',
  'Temperature 0.7, personality 11.', 'ask him about agentic AI. I\'m the demo.',
  'built in Zadar. trained on espresso.', 'he also teaches. I\'m the homework.'
]
export const knockLines: string[] = ['Ow. Lawsuit incoming.', 'You can\'t stop progress.', 'That\'s going in the training data.', 'Rude. Anyway… AGI soon.', 'Error 418: I\'m a teapot now.']
export const recoverLines: string[] = ['✦ recompiling ✦', 'back, and fine-tuned.', 'you only made me stronger.', 'redeployed. v2.0.']
export const hitLines: string[] = ['Gotcha, human.', 'Cursor acquired.', 'Target locked.', 'Tag, you\'re trained.']
export const missLines: string[] = ['missed. recalibrating…', 'lag. blame the GPU.', 'you dodged. impressive.']
export const stealLines: string[] = ['Hey! That trend was MINE.', 'Give it back, human!', 'Stealing my trends? rude.', 'That\'s MY alpha, attack mode on.', 'You\'ll regret that catch.']
// Said when the visitor drags the trend tag around instead of popping it.
export const lureLines: string[] = ['ooh. a trend. come here.', 'give me that!', 'I must have it.', 'stop waving it, I\'m coming!']
export const caughtTpl: string[] = ['Caught the ', 'Acquired: ', 'Shipped: ']
// The tutorial, one skill at a time; `touch` replaces `mouse` on phones.
export const TUT_LINES: Record<'hit' | 'juggle' | 'pop' | 'throw' | 'pet' | 'team' | 'toss' | 'lure', { mouse: string, touch: string }> = {
  hit: { mouse: 'psst. click me.', touch: 'psst. tap me.' },
  juggle: { mouse: 'hit me again before I land!', touch: 'tap me again before I land!' },
  pop: { mouse: 'careful. every hit inflates me.', touch: 'careful. every hit inflates me.' },
  throw: { mouse: 'fine. now grab me, drag, and let go.', touch: 'fine. now hold me, drag, and let go.' },
  pet: { mouse: 'or be nice: move slowly over me.', touch: '' },
  team: { mouse: 'psst. my sub-agents ran off into the CV. open a few rows to find them.', touch: 'psst. my sub-agents ran off into the CV. open a few rows to find them.' },
  toss: { mouse: 'my agents can be grabbed and thrown too. gently.', touch: 'my agents can be grabbed and thrown too. gently.' },
  lure: { mouse: 'grab that trend and drag it. I\'ll follow.', touch: 'hold that trend and drag it. I\'ll follow.' }
}
export const welcomeLines: string[] = ['welcome back, human.', 'oh. you again.', 'back for more?']
export const welcomePopLines: string[] = ['welcome back. I still remember the pop.', 'oh, it\'s the one who popped me.']
// Said once a visit when the cursor first reaches a link of that kind; keys match the href.
export const LINK_LINES: Record<string, string[]> = {
  'github.com': ['the code is real. go look.', 'commits by a human. mostly.'],
  'https://x.com': ['he posts about building apps there.', 'follow him. I can\'t, no thumbs.'],
  'linkedin.com': ['go on, connect.', 'he accepts invites. I checked.'],
  'scholar.google': ['peer reviewed. unlike me.', 'citations go brrr.'],
  'croris': ['the official record. very serious.'],
  'techprimo.ai': ['his studio. I\'m the intern.'],
  'doi.org': ['actual science. go read it.'],
  'coursera.org': ['he did the homework. I just scraped it.']
}
export const grabLines: string[] = ['hey! put me down!', 'unhand me, human.', 'I get airsick!', 'this is not in my training data.']
export const throwLines: string[] = ['WHEEE!', 'I\'m flying! unsupervised!', 'gradient descent, literally.', 'not the face!']
export const puffLines: string[] = ['I\'m… inflating?', 'too many parameters!', 'stop, I\'m overfitting!', 'context window overflowing…']
export const respawnLines: string[] = ['✦ restored from checkpoint ✦', 'rebooted. that was rude.', 'v3.0, now with airbags.', 'you popped me. I remember everything.']
export const petLines: string[] = ['…ok, that\'s nice.', 'purring in binary.', 'reward signal received ♥', 'fine. you can stay.']
export const sleepLines: string[] = ['low power mode… zzz', 'nobody\'s watching. nap time.', 'entering sleep(). zzz']
export const wakeLines: string[] = ['huh? I wasn\'t sleeping.', 'rebooting… where was I?', 'I was just defragmenting.']
export const scrollLines: string[] = ['whoa, speed reader.', 'slow down, it\'s a good CV.', 'you skipped the good part.']
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
  certifications: ['he\'s certified. I\'m certifiable.', 'gotta collect them all.'],
  skills: ['I\'m not on this list. rude.', 'skills: plenty. punching robots: please no.']
}
// The quest: `{r}` is a role, `{s}` a CV section.
export const peekLines: { mouse: string[], touch: string[] } = {
  mouse: ['there\'s my {r}! click it.', 'found the {r}. grab it, quick!', 'my {r}! click before it hides.'],
  touch: ['there\'s my {r}! tap it.', 'found the {r}. tap it, quick!', 'my {r}! tap before it hides.']
}
export const notHereLines: string[] = ['not here. try another row in {s}.', 'warm… but not this row. {s} still hides one.', 'nope. someone\'s hiding elsewhere in {s}.']
export const recruitLines: string[] = ['{r} reporting for duty.', '{r} is back on the team.', 'found my {r}. good human.', '{r} recruited.']
export const lastAgentLine = 'one left: the {r}, somewhere in {s}.'
export const lastDeployerLine = 'one left: the Deployer. it only shows up when I pop.'
export const deployerLines: string[] = ['the Deployer! it only comes out when things blow up.', 'something exploded, so the Deployer showed up.']
export const teamDoneLines: string[] = ['team assembled. orchestration online.', 'all six agents. now we\'re dangerous.', 'full team. we ship at dawn.']
export const restartLines: string[] = ['factory reset complete. who are you again?', 'fresh start. my agents ran off again.', 'memory wiped. the team is hiding again.']
// The recruited team's small talk.
export const reviewLines: string[] = ['LGTM', 'nit: rename this', 'needs tests', 'approved ✓', 'ship it', 'nit: typo', 'left 1 comment', 'why not a const?']
export const bossReviewLines: string[] = ['changes requested', 'REJECTED', 'blocking: AGI', 'needs alignment']
// A carried agent, a thrown one, its landing, and the robot watching its teammate fly.
export const agentGrabLines: string[] = ['hey!', 'put me down', 'out of scope!', 'not in my prompt']
export const agentTossLines: string[] = ['wheee!', 'yeet()', 'async!', 'airborne!']
export const agentLandLines: string[] = ['@_@', 'recalibrating', 'which way is prod?', 'again!']
export const agentTossRobotLines: string[] = ['hey! that\'s my {r}.', 'careful, the {r} bruises.', 'nice throw. poor {r}.']
// The AGI boss.
export const bossStartLines: string[] = ['AGI incoming. team, assemble!', 'it\'s here. everyone, attack!', 'AGI arrived early. fight it!']
export const bossHalfLines: string[] = ['it\'s adapting. keep hitting!', 'half way. don\'t stop now.', 'it\'s scaling. so are we.']
// The robot, the first time a fight burns letters out of the CV.
export const bossBurnLines: string[] = ['it\'s burning the CV! hit it!', 'hey! that was a whole job title.', 'it\'s rewriting your CV. stop it!']
export const bossWinLines: string[] = ['AGI defeated. back to being a CV.', 'we beat AGI. put that on the CV.', 'alignment achieved. by force.']
export const bossLeaveLines: string[] = ['AGI got bored and left. the HUD can call it back.', 'it wandered off. fight it again from the HUD.']
export const CONFETTI: string[] =['#ff5a1f', '#36c6e0', '#0b6bcb', '#9b6bff', '#ffd23b', '#3b7cc0']

export const trends: string[] = ['Agentic AI', 'Reasoning models', 'World models', 'Multi-agent', 'MCP', 'Computer use', 'Test-time compute', 'Vision-Language-Action', 'On-device AI', 'Physical AI', 'Voice agents', 'Long context', 'Mixture-of-Experts', 'Synthetic data', 'RAG 2.0', 'Inference scaling']

// Said on morphing back from a critter; each critter brings its own morph lines.
export const ROBOT_LINES: string[] = ['the magic fades, robot again.', 'transformation complete: me.', 'beep boop, true form restored.']

export function rand(a: number, b: number): number {
  return a + Math.random() * (b - a)
}

export function pick<T>(a: readonly T[]): T {
  return a[(Math.random() * a.length) | 0] as T
}
