# Echoes of the Oracle
> *A browser roguelite where the dungeon remembers everything you do.*

## Play Now
- Live: https://echoes-of-the-oracle.vercel.app
- GitHub: https://github.com/manish121597/echoes-of-the-oracle

## What I Built
A fully browser-based roguelite dungeon game where GPT-4o-mini
is not just a backend — it is a character. Every enemy taunts you
personally. The Oracle gives cryptic hints (sometimes lies).
The final boss reads your entire run history before the fight
and monologues about YOUR specific choices.

No npm. No frameworks. Open index.html and play.

## How Codex Helped
Codex generated the entire project from a structured build brief:
- HTML5 Canvas renderer (dungeon rooms, HP bars, emoji characters)
- Turn-based combat engine (attack, defend, potion, flee with crit system)
- Web Audio API sound synthesis (8 programmatic sounds, zero audio files)
- Particle system (enemy death bursts, heal sparkles, boss explosion)
- BackgroundRenderer class (animated fog/embers/stars per floor theme)
- FloatingTextSystem (damage numbers, crits, healing floaters)
- OpenAI integration layer in ai.js (4 AI functions with fallbacks)
- Screen shake, HP tweening, floor transitions, scanline overlay
- Procedural ambient music engine (drone oscillators + LFO modulation)

## How to Play
1. Open the link above in any browser
2. Paste your OpenAI API key for live AI narration (optional)
3. Click BEGIN RUN

Controls:
- ATTACK (A) — Strike the enemy
- DEFEND (D) — Take half damage this turn
- USE ITEM (I) — Drink a health potion (+30 HP)
- FLEE (F) — 40% chance to escape

Every 5 floors: face a BOSS that reads your run history and taunts you personally.

## Tech Stack
- Vanilla JavaScript (zero dependencies)
- HTML5 Canvas API
- Web Audio API (procedural sound + music)
- OpenAI API — gpt-4o-mini
- Deployed on Vercel

## What Makes It Different
Most game jam entries are Pong or Snake clones. This game has AI as a
CHARACTER — the dungeon narrates, the Oracle hints, the boss remembers.
Every run feels different because the AI responds to YOUR stats and choices.

## File Structure
index.html — game shell + OG tags
style.css  — pixel aesthetic, floor themes, animations
game.js    — engine, combat, audio, particles, canvas renderer
ai.js      — OpenAI integration with fallback dialogue

## Built with Codex
![Built with Codex](https://img.shields.io/badge/Built%20with-Codex-412991?style=flat-square)
![OpenAI API](https://img.shields.io/badge/OpenAI-GPT--4o--mini-00A67E?style=flat-square)
![Vanilla JS](https://img.shields.io/badge/Vanilla-JavaScript-F7DF1E?style=flat-square)
![Deployed on Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=flat-square)

## Known Limitations & Future Ideas
- API key entered client-side (kept in memory only, never stored)
- Future: seeded daily runs, persistent leaderboard, share image card
