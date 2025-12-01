# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MiTempo is a zero-dependency PWA interval timer built with vanilla JavaScript. It's designed for offline-first operation with localStorage persistence and uses Web Audio API for auditory feedback.

Stack: Vanilla JS (ES6+), HTML5, CSS3, PWA manifest

## Development Commands

No build process exists. Run directly with a local server:

```bash
# Python
python -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

Then open `http://localhost:8000`

For deployment to GitHub Pages: Push to `main` branch and enable Pages in repo Settings → Pages → Deploy from branch → main (root)

## Architecture

### State Management

All state lives in global variables in `src/main.js` - no framework, no store pattern. Key state:
- `cycles` (array) - all saved routines loaded from localStorage
- `currentCycle` (object) - active routine being displayed/running
- `isRunning` (bool), `currentIntervalIndex`, `timeLeft` - timer state
- `timerInterval` - setInterval reference

State flow: `UI Event → Handler → State Mutation → Render → localStorage.setItem()`

The app uses **inline event handlers exposed on window** for dynamic HTML (`window.selectCycle`, `window.deleteCycle`, `window.openEditor`). Direct event listeners are used for static elements.

### Data Model

localStorage key: `mitempo_cycles` (JSON array)

```javascript
// Cycle structure
{
  id: string,           // Date.now() timestamp
  name: string,
  intervals: [
    { name: string, duration: number, type: string }
    // type is "work" or "rest" but currently unused in UI
  ]
}
```

### Timer Architecture

Core timer loop in `src/main.js:144-189`:
- `startTimer()` creates setInterval (1s), resumes AudioContext
- Each tick decrements `timeLeft` and calls `updateDisplay()`
- When `timeLeft` reaches 0, `nextInterval()` advances or finishes cycle
- Audio tones via Web Audio API oscillators (880Hz start, 600Hz triangle wave on finish)

Progress ring animation uses SVG `stroke-dashoffset` (`CIRCUMFERENCE = 2π * 140px`). Offset decreases from full circumference to 0 as time elapses.

### View Management

Three main views toggled via `.hidden-view` class (display: none):
1. **Timer View** (default) - countdown display, progress ring, interval dots
2. **Cycles View** - overlay with list of all routines, edit/delete actions
3. **Editor Modal** - bottom sheet for creating/editing cycles with dynamic interval inputs

Modal uses `.modal-content` with `slideUp` animation from bottom of screen.

## Coding Conventions

- Functions: camelCase (`startTimer`, `renderCyclesList`)
- Constants: UPPER_SNAKE_CASE (`DEFAULT_CYCLE`, `CIRCUMFERENCE`)
- HTML IDs: kebab-case (`timer-view`, `cycle-name-input`)
- CSS classes: kebab-case (`.top-nav`, `.interval-dot`)

### Pattern: Window-exposed Functions

Dynamically generated HTML uses inline event handlers that reference global functions:
```javascript
window.selectCycle = function(id) { /* ... */ }
```
```html
<div onclick="selectCycle('${cycle.id}')">...</div>
```

This pattern is used for `selectCycle`, `deleteCycle`, and `openEditor` since these are called from `.innerHTML`-injected markup.

## Key Constraints

- **No build step**: All code must run directly in browser (ES6+ modules supported)
- **No dependencies**: No npm packages, bundlers, or frameworks
- **localStorage only**: All persistence is client-side; deleting browser data loses all cycles
- **Audio context gotcha**: Web Audio API requires user interaction before first sound on iOS/Safari
- **interval.type field unused**: The "work"/"rest" type exists in data model but doesn't affect UI currently

## Design System

CSS custom properties in `src/style.css:33-44`:
- Primary: `#00E5FF` (cyan) - accents, buttons
- Background: `#121212` (near-black)
- Surface: `#1E1E1E` (cards)

Typography: Inter font family loaded via `@font-face` from `src/fonts/` (weights: 300, 400, 600, 800)
