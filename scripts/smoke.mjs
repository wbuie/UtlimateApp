// End-to-end smoke test: drives the full game flow (team → roster → game →
// line gate → tracking → undo → substitution → end game → stats) against a
// running build. Fresh browser profile each run, so it starts from empty data.
//
//   npm run build && npm run preview &   # serve the production build
//   node scripts/smoke.mjs               # BASE_URL / SHOT_DIR env to override
import { chromium } from 'playwright-core'

import { mkdirSync } from 'node:fs'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const SCRATCH = process.env.SHOT_DIR ?? './e2e-shots'
mkdirSync(SCRATCH, { recursive: true })
const shots = []
let step = 0

// CHROMIUM_PATH overrides when the provisioned browser doesn't match this
// playwright-core version (e.g. preinstalled CI images)
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--no-sandbox'],
})
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }) // iPhone-ish
const errors = []
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`) })

async function shot(name) {
  step++
  const f = `${SCRATCH}/e2e-${String(step).padStart(2, '0')}-${name}.png`
  await page.screenshot({ path: f })
  shots.push(f)
}
const ok = (msg) => console.log(`✓ ${msg}`)

await page.goto(`${BASE}/`)

// ── Create team ──
await page.click('text=+ New Team')
await page.fill('input[placeholder="Team name"]', 'Portland Rain')
await page.click('button:has-text("Create")')
await page.waitForSelector('text=Portland Rain')
ok('team created')

// ── Roster ──
await page.click('text=Portland Rain')
for (const [name, num] of [['Alice','1'],['Bob','2'],['Carol','3'],['Dana','4'],['Eve','5'],['Frank','6'],['Grace','7'],['Hank','8']]) {
  await page.click('text=+ Add Player')
  await page.fill('input[placeholder="Name"]', name)
  await page.fill('input[placeholder="#"]', num)
  await page.click('form button[type="submit"]')
  await page.waitForSelector(`span:text-is("${name}")`)
}
ok('8 players added')
await shot('roster')

// ── Create game (target 15) ──
await page.click('button:has-text("games")')
await page.click('text=+ New Game')
await page.fill('input[placeholder="Opponent name"]', 'Seattle Sockeye')
await page.click('form button:has-text("15")')
await page.click('button:has-text("Start Game")')

// ── Line gate: first point, O start ──
await page.waitForSelector('text=First point')
ok('line gate shown for first point')
await page.click('button:has-text("Offense · Receive")')
for (const n of ['Alice','Bob','Carol','Dana','Eve','Frank','Grace']) {
  await page.click(`button:has(span:text-is("${n}"))`)
}
await shot('line-gate')
await page.click('button:has-text("Start Point — We Receive")')

// ── O point: pickup, passes, goal ──
await page.waitForSelector('text=Tap to set disc holder')
ok('O point started with our possession (offense panel visible)')
await page.click('button:has(span:text-is("Alice"))')
await page.click('button:has(span:text-is("Bob"))')
await page.click('button:has(span:text-is("Carol"))')
await shot('offense-flow')
await page.click('button:has-text("🏆 Goal")')

// ── After goal: gate suggests D (we pull), same line preselected ──
await page.waitForSelector('text=Point 2')
const scoreUs = await page.textContent('div.text-6xl >> nth=0')
if (scoreUs.trim() !== '1') throw new Error(`expected score 1, got ${scoreUs}`)
ok('goal scored, score 1-0, gate suggests next point')
await shot('gate-after-goal')

// ── Undo across the point boundary: reopens point 1 ──
await page.click('button:has-text("↩ Undo")')
await page.waitForSelector('text=Their passes', { timeout: 5000 }).catch(() => {})
const scoreAfterUndo = await page.textContent('div.text-6xl >> nth=0')
if (scoreAfterUndo.trim() !== '0') throw new Error(`undo failed: score ${scoreAfterUndo}`)
// Carol should have the disc again (offense panel, "Carol has the disc")
await page.waitForSelector('text=Carol has the disc')
ok('undo reopened the point: score 0-0, Carol holds the disc again')
await shot('after-undo')

// ── Re-score the goal ──
await page.click('button:has-text("🏆 Goal")')
await page.waitForSelector('text=Point 2')
ok('goal re-logged')

// ── Point 2: D line (auto-suggested), defense panel ──
await page.click('button:has-text("Start Point — We Pull")')
await page.waitForSelector('text=Their passes')
ok('D point: defense panel with pass counter')
await page.click('button:has-text("+1")')
await page.click('button:has-text("+1")')
await page.click('button:has-text("D Block")')
await page.click(`div[role="dialog"] button:has(span:text-is("Dana"))`)
await page.waitForSelector('text=Tap to set disc holder, text=has the disc', { timeout: 3000 }).catch(() => {})
await shot('after-d-block')
// Dana has it; pass and score
await page.click('button:has(span:text-is("Eve"))')
await page.click('button:has-text("🏆 Goal")')
await page.waitForSelector('text=Point 3')
ok('D-line break scored: 2-0')

// ── Point 3: their goal ──
await page.click('button:has-text("Start Point — We Pull")')
await page.click('button:has-text("Their Goal")')
await page.waitForSelector('text=Point 4')
ok('their goal logged')

// ── Substitution mid-point ──
await page.click('button:has-text("Start Point — We Receive")')
await page.click('button:has(span:text-is("Alice"))')  // pickup so point has events
await page.click('button:has-text("⇄ Sub")')
await page.click(`div[role="dialog"] button:has(span:text-is("Grace"))`)  // Grace off
await page.click(`div[role="dialog"] button:has(span:text-is("Hank"))`)   // Hank on
await page.click('div[role="dialog"] button:has-text("Done")')
ok('mid-point substitution')

// ── End game ──
await page.click('button:has-text("End Game")')
await page.click('button:has-text("Yes, End Game")')
await page.waitForSelector('text=Game complete')
await shot('game-complete')
ok('game ended, read-only panel shown')

// ── Stats page: chart + table + timeline ──
await page.click('text=View Final Stats')
await page.waitForSelector('text=O-Hold%')
await page.waitForSelector('.recharts-wrapper')
await shot('stats-chart')
ok('stats page with player bar chart rendered')
await page.click('button:has-text("Goals")')
await shot('stats-goals')
await page.click('button:has-text("Table")')
await page.waitForSelector('text=Tap column to sort')
await page.click('button:has-text("Timeline")')
await page.waitForSelector('text=Point 1')
ok('table and timeline tabs render')

// ── Reload mid-game resume check: reopen tracker of a NEW game and reload mid-point ──
await page.goto(`${BASE}/`)
await page.click('text=Portland Rain')
await page.click('button:has-text("games")')
await page.click('text=+ New Game')
await page.fill('input[placeholder="Opponent name"]', 'Resume Test')
await page.click('button:has-text("Start Game")')
await page.waitForSelector('text=First point')
await page.click('button:has-text("Offense · Receive")')
for (const n of ['Alice','Bob','Carol','Dana','Eve','Frank','Grace']) {
  await page.click(`button:has(span:text-is("${n}"))`)
}
await page.click('button:has-text("Start Point — We Receive")')
await page.click('button:has(span:text-is("Alice"))')
await page.waitForSelector('text=Alice has the disc')
await page.click('button:has(span:text-is("Bob"))')
await page.waitForSelector('text=Bob has the disc')
// reload mid-point
await page.reload()
await page.waitForSelector('text=Bob has the disc')
ok('RESUME: after reload, Bob still has the disc, possession intact')
const warn = await page.locator('text=/7 players on field').count()
if (warn > 0) throw new Error('resume lost the on-field line')
ok('RESUME: on-field line restored (no 0/7 warning)')
await shot('resume-mid-point')

// ── Season stats ──
await page.goto(`${BASE}/`)
await page.click('text=Portland Rain')
await page.click('text=Season Stats')
await page.waitForSelector('.recharts-wrapper')
const title = await page.textContent('h1')
if (!title.includes('Portland Rain')) throw new Error(`season title wrong: ${title}`)
ok('season stats: team name resolves on deep-link, chart renders')
await shot('season-stats')

// ── LIVE badge on home ──
await page.goto(`${BASE}/`)
await page.waitForSelector('text=● Live')
ok('LIVE badge for in-progress game')

console.log('\nERRORS:', errors.length ? errors : 'none')
console.log('SHOTS:', shots.join('\n'))
await browser.close()
