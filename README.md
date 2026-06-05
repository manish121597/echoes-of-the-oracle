# Echoes of the Oracle

Echoes of the Oracle is a browser-based roguelite dungeon game where the dungeon does more than spawn enemies: it remembers. Each run moves through hostile rooms, strange bargains, and boss floors while GPT-4o-mini generates room descriptions, enemy taunts, Oracle hints, and boss monologues based on the choices you made during that run.

## Built with Codex

Codex generated the complete static game from the master build brief:

- Vanilla HTML, CSS, and JavaScript structure with no npm, bundler, or framework.
- HTML5 Canvas renderer for dungeon rooms, enemies, player state, HP bars, animated backgrounds, floating combat text, and particles.
- Turn-based combat engine with attacking, defending, potions, fleeing, enemy scaling, rewards, stat upgrades, choice rooms, and boss floors.
- OpenAI integration layer in `ai.js` using `gpt-4o-mini` for room narration, enemy taunts, Oracle hints, and run-history boss dialogue.
- Web Audio sound synthesis in `game.js`, including attack sounds, gold pickups, boss rumble, Oracle shimmer, flee blips, death tones, and level-up chimes.
- Final polish including screen shake, canvas border glow, floor transitions, critical hits, animated HP tweening, and mobile-friendly tap controls.

## How to Play

1. Open `index.html` in a browser.
2. Enter an OpenAI API key if you want live AI narration.
3. Press `BEGIN RUN`.
4. Use the click or tap buttons:
   - `ATTACK` damages the current enemy.
   - `DEFEND` halves the next incoming hit.
   - `USE ITEM` drinks a health potion if you have one.
   - `FLEE` has a 40% chance to skip the fight.
5. Survive as many floors as possible. Every fifth floor has a boss that reads your run history before the fight.

The game remains playable without an API key. AI narration falls back to built-in dialogue if the key is missing, the network is unavailable, or the API call fails.

## Run Locally

No install is required.

```text
Open index.html in any modern browser.
```

The folder is ready for GitHub Pages, Vercel drag-and-drop deploys, or any static host.

## Screenshot

![Built with Codex](https://img.shields.io/badge/Built%20with-Codex-412991?style=flat-square)

## File Structure

```text
/index.html
/style.css
/game.js
/ai.js
/README.md
```

## Known Limitations and Future Ideas

- Browser-side API calls require the player to paste their own OpenAI API key; the key is kept in memory only and is never stored.
- If a browser blocks Web Audio until interaction, sounds begin after the first player action.
- Future versions could add persistent unlocks, more enemy families, relics, keyboard controls, seeded daily runs, and a generated share card for completed runs.
