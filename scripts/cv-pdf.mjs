// Prints built /cv-print to public/ive-botunac-cv.pdf in headless Chromium; run after `npm run build`.
import { spawn } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { createServer } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const serverEntry = path.join(root, '.output/server/index.mjs')
const out = path.join(root, 'public/ive-botunac-cv.pdf')

// PLAYWRIGHT_CHROMIUM_PATH, then the newest build in the macOS Playwright cache, else playwright-core's own.
function findChromium() {
  const own = process.env.PLAYWRIGHT_CHROMIUM_PATH
  if (own) return own
  const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright')
  if (!existsSync(cache)) return null
  const builds = [
    ['chromium_headless_shell-', 'chrome-headless-shell-mac-arm64/chrome-headless-shell'],
    ['chromium-', 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'],
  ]
  for (const [prefix, bin] of builds) {
    const found = readdirSync(cache)
      .filter(d => d.startsWith(prefix) && /^\d+$/.test(d.slice(prefix.length)))
      .sort((a, b) => Number(b.slice(prefix.length)) - Number(a.slice(prefix.length)))
      .map(d => path.join(cache, d, bin))
      .find(p => existsSync(p))
    if (found) return found
  }
  return null
}

function freePort(preferred) {
  const tryPort = port => new Promise((resolve) => {
    const s = createServer()
    s.once('error', () => resolve(null))
    s.listen(port, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)) })
  })
  return tryPort(preferred).then(p => p ?? tryPort(0))
}

async function waitFor(url, ms) {
  const end = Date.now() + ms
  while (Date.now() < end) {
    try {
      if ((await fetch(url)).ok) return
    } catch { /* not listening yet */ }
    await new Promise(r => setTimeout(r, 250))
  }
  throw new Error(`Server did not answer at ${url}`)
}

async function main() {
  if (!existsSync(serverEntry)) throw new Error('No .output/server/index.mjs: run npm run build first')
  const executablePath = findChromium() || undefined

  const port = await freePort(Number(process.env.CV_PDF_PORT) || 3011)
  const origin = `http://127.0.0.1:${port}`
  // A dead emulator address keeps the local server away from the production game counters.
  const server = spawn(process.execPath, [serverEntry], {
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', FIRESTORE_EMULATOR_HOST: '127.0.0.1:9' },
    stdio: ['ignore', 'ignore', 'inherit'],
  })

  let browser
  try {
    await waitFor(origin + '/', 30000)
    browser = await chromium.launch({ executablePath, headless: true })
    const page = await browser.newPage({ viewport: { width: 1240, height: 1754 } })
    // Only the local server: no analytics hit leaves the machine.
    await page.route('**/*', r => (r.request().url().startsWith(origin) ? r.continue() : r.abort()))
    await page.goto(origin + '/cv-print', { waitUntil: 'networkidle' })
    await page.emulateMedia({ media: 'print' })
    await page.evaluate(() => document.fonts.ready)
    // Page size and margins come from the page's @page rule; the footer numbers the pages.
    await page.pdf({
      path: out,
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: '<div style="width:100%;padding:0 13mm;font:6.5pt Menlo,monospace;color:#6f879e;display:flex;justify-content:space-between"><span>Ive Botunac · CV · ivebotunac.com</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
    })
    console.log(`Wrote ${path.relative(root, out)} (${Math.round(statSync(out).size / 1024)} KB)`)
  } finally {
    await browser?.close()
    server.kill()
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
