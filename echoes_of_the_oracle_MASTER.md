# ECHOES OF THE ORACLE — MASTER GUIDE
### OpenAI Dev Challenge | Prize: $500 First Place
### Manish | 12th Grade PCM+CS | Aligarh, UP
### Deadline: Monday, June 22, 2026 — 11:29 AM

---

## WHAT YOU'RE BUILDING

A browser-based roguelite dungeon game where:
- Every enemy taunts you using GPT-4o-mini in real time
- The Oracle gives cryptic (sometimes intentionally wrong) hints
- The final boss reads your entire run history and monologues about YOUR choices
- Zero npm, zero frameworks — just open index.html and play

This wins because most entries will be Pong or Snake.
Yours has AI as a CHARACTER, not a backend. Judges remember that.

---

## FILE STRUCTURE (what Codex will generate)

```
/index.html
/style.css
/game.js
/ai.js
/README.md
```

---

## PRIZE DETAILS

- 1st Place: $500 (API credits or Codex credits)
- 2nd Place: $250
- 3rd Place: $150
- Bonus: Extra points for using OpenAI API in-game (you ARE doing this)

---

## SUBMISSION CHECKLIST

- [ ] Run Prompt 1 (core game)
- [ ] Run Prompt 2 (polish — sound, particles, animations)
- [ ] Run Prompt 3 (final cleanup + README)
- [ ] Push to PUBLIC GitHub repo
- [ ] Deploy on Vercel (drag & drop folder) or GitHub Pages
- [ ] Post in #dev-challenges thread with:
  - Public GitHub link
  - Playable game link
  - Short description (copy from below)

### Your thread post description (copy-paste this):
"A browser roguelite where GPT-4o narrates every enemy,
reads your run history, and lets the final boss monologue
about your specific choices. Built entirely with Codex —
no frameworks, opens in any browser."

---

## YOUR 5-DAY PLAN

| Day | Task |
|-----|------|
| Day 1 (Today) | Run Prompt 1 → get core game running |
| Day 2 | Run Prompt 2 → add all polish |
| Day 3 | Run Prompt 3 → README + cleanup. Test everything. |
| Day 4 | Deploy on Vercel. Get playable link. Test on mobile. |
| Day 5 (Sunday) | Final bug fixes. Submit by Sunday night (don't wait for deadline day) |

---

---

# PROMPT 1 — CORE GAME
### (Paste this into Codex first)

```
Build me a complete browser-based roguelite game called "Echoes of the Oracle"
using vanilla JavaScript and HTML5 Canvas. Deploy-ready for Vercel or GitHub Pages.

## GAME OVERVIEW
A dungeon roguelite where the player explores rooms, fights enemies, and faces a
final boss. The entire narrative — enemy taunts, room descriptions, Oracle hints,
and boss dialogue — is generated live by the OpenAI API (gpt-4o-mini).

## FILE STRUCTURE
/index.html
/style.css
/game.js
/ai.js
/README.md

## GAMEPLAY LOOP
1. Player starts with HP: 100, Attack: 10, Gold: 0, Floor: 1
2. Each floor has 3 rooms: Enemy -> Choice -> Enemy -> Boss (every 5 floors)
3. Player picks moves: Attack / Defend / Use Item / Flee
4. After each enemy kill, player gets gold + random stat upgrade
5. Run ends on death. Show final score + run summary.

## AI INTEGRATION (ai.js)
- Call OpenAI API endpoint: https://api.openai.com/v1/chat/completions
- Model: gpt-4o-mini
- The API key should be entered by the user in a text input on the start screen
  — store it in memory only, never in code or localStorage
- Create these 4 AI functions:

  1. describeRoom(floor, roomType)
     -> 2-sentence spooky room description

  2. enemyTaunt(enemyName, playerHP, playerAttack)
     -> short menacing taunt from the enemy

  3. oracleHint(playerGold, playerHP, floor)
     -> cryptic hint, 50% chance it's intentionally misleading

  4. bossMonologue(runHistory)
     -> boss reads the player's run (kills, floors, choices)
        and taunts them personally

- runHistory is an array of strings like:
  ["Killed Goblin on floor 2", "Fled from Skeleton on floor 3"]
- All AI calls should show a "..." typing indicator while loading

## ENEMIES (randomized per floor)
Goblin, Skeleton Archer, Cave Troll, Shadow Wraith, Stone Golem
Each has: name, HP (scaled by floor), attack (scaled by floor), a pixel emoji icon

## VISUAL STYLE
- Dark background (#0a0a1a)
- Pixel-style font: use "Press Start 2P" from Google Fonts
- Canvas 600x400 centered on page
- Rooms rendered as simple dungeon panels with colored borders
- Player shown as a glowing sword emoji (sword)
- Enemy shown as its emoji icon
- HP bars drawn on canvas in red/green
- Show combat log (last 4 lines) below canvas in a styled dark box

## COMBAT SYSTEM
- Turn-based, player goes first
- Attack: deal playerAttack + random(1-5) damage
- Defend: reduce incoming damage by 50% this turn
- Use Item: if player has a health potion, restore 30 HP
  (max 2 potions per run, found randomly in rooms)
- Flee: 40% success chance; failure means enemy attacks

## CHOICE ROOMS (between combat rooms)
Randomly present ONE of:
- "Find a health potion" (+1 potion)
- "Mysterious shrine: +15 max HP or +3 attack (player chooses)"
- "Oracle speaks..." (trigger oracleHint AI call)
- "Gold chest: +20 gold"

## BOSS (every 5 floors)
- Boss HP = 200 + (floor x 20)
- Boss attack = 18 + (floor x 3)
- Before fight: trigger bossMonologue(runHistory) AI call
- Defeating boss gives +100 gold and full HP restore

## START SCREEN
- Title: "ECHOES OF THE ORACLE" in glowing purple text
- Input field for OpenAI API key (password type,
  placeholder: "Enter your OpenAI API key")
- "BEGIN RUN" button
- Subtitle: "A roguelite where the dungeon knows your name."

## GAME OVER SCREEN
- Show: Floors reached, Enemies killed, Gold collected
- Show full runHistory as a "Chronicle of your run"
- "PLAY AGAIN" button that resets all state

## README.md
Write a compelling README including:
- What the game is
- How Codex helped build it (scaffolded combat engine, canvas renderer,
  AI integration)
- How to play / controls (click-based, no keyboard required)
- How to run locally (just open index.html)
- Screenshot placeholder

## IMPORTANT RULES
- No .env files, no hardcoded API keys anywhere in code
- All in vanilla JS, no frameworks, no npm required
- Must run by just opening index.html in a browser
- All AI calls wrapped in try/catch with fallback text if API fails
- Make the code well-commented so it's clear Codex wrote it intelligently
```

---

---

# PROMPT 2 — FULL POLISH
### (Paste this into Codex AFTER Prompt 1 is working)

```
Take the existing "Echoes of the Oracle" game code and add the following
polish upgrades. Do not break any existing functionality.

## 1. SOUND EFFECTS (Web Audio API — no files needed)
Create a SoundEngine in game.js using AudioContext.
Generate all sounds programmatically:

- playerAttack(): short sharp sine wave, freq 520hz, duration 0.08s
- enemyAttack(): low growl, sawtooth wave, freq 180hz, duration 0.15s
- playerDeath(): descending tone, freq 400->80hz, duration 0.8s
- levelUp(): ascending chime, freq 400->800hz, duration 0.4s
- goldPickup(): bright ding, freq 880hz, duration 0.12s
- bossAppear(): deep dramatic rumble, freq 60hz, duration 1.2s
- flee(): rapid descending blip, freq 600->200hz, duration 0.3s
- oracleSpeak(): eerie shimmer, triangle wave, freq 300hz, duration 0.6s

Trigger each sound at the correct game event.
Add a mute toggle button in the top-right corner of the canvas.

## 2. SCREEN SHAKE
When the player takes damage, shake the canvas element:
- Translate canvas +-6px randomly for 6 frames at 60fps
- Use CSS transform for the shake
- Do NOT shake on player attack, only on receiving damage

## 3. PARTICLE EFFECTS (canvas-based)
Implement a lightweight ParticleSystem:

- On enemy death: burst of 12 yellow/orange particles flying outward,
  fade over 0.6s
- On player heal: 8 green sparkle particles rising upward, fade over 0.8s
- On boss death: 30 mixed-color particles + canvas flash white for 3 frames
- On gold pickup: 5 small gold coin particles arc upward and fall
- Particles should be small circles (radius 2-4px)

## 4. ANIMATED COMBAT TEXT
When damage is dealt, show floating damage numbers on canvas:
- Player deals damage: bright yellow number floats up from enemy position
- Player takes damage: red number floats up from player position
- Critical hit (random 15% chance, 1.5x damage): number is larger +
  shows "CRIT!" in orange above it
- Healing: green "+" number floats upward
- Numbers fade out over 1 second while moving up 40px
- Add critical hit logic to the existing attack function

## 5. ANIMATED BACKGROUNDS
Replace the static dark background with subtle animated backgrounds
per floor range:
- Floors 1-4: slow drifting blue fog particles (20 particles, opacity 0.3)
- Floors 5-9: red ember particles drifting upward (dark fire dungeon)
- Floors 10+: purple void with slow rotating star particles
- Background particles should NEVER distract from gameplay (keep opacity low)
- Implement as a BackgroundRenderer class that runs every frame

## 6. UI POLISH
- HP bar: animate HP changes smoothly (tween over 0.3s) instead of snapping
- Add a subtle pulsing glow effect (CSS animation) to canvas border in color
  matching current floor theme:
  - Floors 1-4: blue glow
  - Floors 5-9: red glow
  - Floors 10+: purple glow
- Flash the canvas border red briefly when player takes damage
- On the start screen, add a slow floating animation to the title text
  (gentle up/down, 3px over 2s, CSS keyframes)
- Add a "FLOOR X" transition screen between floors:
  - Black overlay fades in, shows "FLOOR X" in large pixel font
  - Stays for 1.2s then fades out
  - Play levelUp sound during this transition

## 7. GAME FEEL TWEAKS
- Add a 0.15s delay between player action and enemy response
  (feels more responsive)
- Highlight the last combat log line in brighter white vs older lines in gray
- Make buttons have a pixel-style hover: shift down 2px + lose top shadow
- Add a subtle idle animation: player emoji bobs up/down 3px every 1.5s
  when waiting for input

## RULES
- Still no npm, no frameworks, no external files
- All audio generated via Web Audio API only
- All visuals via Canvas API + CSS only
- Must still run by opening index.html directly
- Mute toggle must persist player choice during the session
- Fallbacks: if AudioContext is blocked by browser, fail silently
```

---

---

# PROMPT 3 — FINAL CLEANUP
### (Paste this last, before deploying)

```
Review the complete Echoes of the Oracle codebase and do a final pass:

1. Write the README.md in full — make it genuinely compelling for a
   game jam judge. Include:
   - A dramatic one-paragraph description of the game
   - "Built with Codex" section explaining exactly which parts Codex
     generated (be specific — combat engine, particle system,
     Web Audio synthesis, AI integration layer)
   - Controls & how to play
   - How to self-host (just open index.html)
   - Known limitations / future ideas section

2. Add HTML meta tags for Open Graph so it looks good when shared as a link:
   - og:title, og:description, og:image placeholder

3. Double-check:
   - No API keys anywhere in code
   - All AI calls have try/catch with fallback dialogue
   - Game works fully offline except for AI narration
   - Mobile tap works on all buttons (touch events)

4. Output the final file structure clearly so I know exactly what
   to upload to GitHub.
```

---

---

## HOW TO DEPLOY ON VERCEL (free, 2 minutes)

1. Go to vercel.com — sign in with GitHub
2. Click "Add New Project"
3. Drag your game folder into the upload box
4. Click Deploy
5. Copy the URL it gives you — that's your playable link

Alternatively for GitHub Pages:
1. Push all files to a public GitHub repo
2. Go to repo Settings -> Pages
3. Set Source to "main branch / root"
4. Your link will be: https://yourusername.github.io/echoes-of-the-oracle

---

## WHAT TO POST IN #dev-challenges

```
Game: Echoes of the Oracle

A browser roguelite where GPT-4o narrates every enemy, reads your
run history, and lets the final boss monologue about your specific
choices. Built entirely with Codex — no frameworks, opens in any browser.

GitHub: [your repo link]
Play: [your Vercel/GitHub Pages link]

Controls: All click-based. Enter your OpenAI API key on start screen.
```

---

## WHY THIS WINS

- Most entries = Pong, Snake, Tetris clone
- Yours = AI that REMEMBERS your run and personalizes the story to you
- Judges play it longer because each run feels different
- Directly uses OpenAI API = bonus points
- README tells a clear Codex story = judges love that
- No install, no npm, opens instantly = zero friction for judges

---

## IF YOU GET STUCK

Common issues and fixes:

| Problem | Fix |
|---------|-----|
| API key not working | Make sure you're using an OpenAI key (starts with sk-) not Codex key |
| Canvas blank | Check browser console for JS errors, share with Codex to fix |
| AI calls failing | Add console.log(error) in catch block and share error with Codex |
| Game too slow | Ask Codex: "optimize the game loop, it's running slow on mobile" |
| Vercel deploy failing | Make sure index.html is in the ROOT folder, not a subfolder |

---

Good luck Manish. $500 + portfolio project + Google/Microsoft resume line.
This is exactly the kind of thing that matters for your long-term goal.
Build it. Ship it. Win it.
