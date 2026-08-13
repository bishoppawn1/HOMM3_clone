# Through the Ages — Game Specification

## 1. Product vision

Through the Ages is a browser-based, turn-based strategy game inspired by the adventure-map, city-development, and tactical-combat structure of *Heroes of Might and Magic III*. It replaces fantasy creatures and magic with grounded armies, engineering, logistics, scholarship, economics, and historical technological development.

The player explores a world map with commanders, develops multiple cities, collects resources, researches technologies, fights stack-based tactical battles, and advances a civilization through successive historical ages.

This document is the source of truth for intended behavior. Features marked **Prototype** exist in the current vertical slice. Features marked **Planned** define later work.

## 2. Design pillars

1. **A civilization must demonstrate progress.** Era advancement requires both research and observable development.
2. **Exploration accelerates progress but cannot replace it.** Knowledge Huts improve research only; they never waive readiness requirements.
3. **Months support tactics; years support history.** One player turn is one month and twelve turns form a year.
4. **The world persists.** One-time rewards stay collected. Recurring production comes from controlled locations rather than arbitrary weekly resets.
5. **Combat remains legible and tactical.** Armies use stacks, positioning, retaliation, morale, terrain, and sieges without supernatural systems.
6. **Requirements are systemic, not scripted.** Advancement may require cities, infrastructure, military experience, population, or economic strength, but never defeating a particular named opponent.

## 3. Campaign calendar

### 3.1 Turns and months — Prototype

- A turn represents one calendar month.
- The calendar advances through twelve named months.
- Ending December advances the year and starts January.
- Commanders regain movement at the start of a month.
- Cities generate monthly income and research.
- Buildings may modify monthly production.

### 3.2 Annual systems — Planned

Year-end processing will handle population growth, demographic pressure, large diplomatic changes, upkeep review, and major world events. The annual boundary must not respawn consumed pickups.

## 4. Adventure map

### 4.1 Movement — Prototype

- The map is a dense tile grid of small adventure-map squares; the final map may use a hex or isometric topology.
- A commander spends one movement point to enter an orthogonally adjacent passable tile.
- Water is impassable without an appropriate transport capability.
- A commander currently has 16 movement points, within the intended 10–20 range, and movement refreshes each month.

### 4.2 Map sites — Prototype

- **Knowledge Hut:** consumed on visit and presents two eligible research bonuses.
- **Resource pickup:** consumed on visit and grants a small immediate resource amount.
- **Neutral city:** is a persistent settlement, never a pickup. Entering its tile begins a fight against its garrison; only victory transfers control.
- **Hostile army:** resolves a placeholder victory in the prototype and will later open tactical combat.

Consumed sites do not reappear merely because a month or year passes.

### 4.3 Persistent producers — Planned

Mines, farms, timber camps, ports, trade posts, and similar controlled sites will generate recurring monthly resources. Ownership may change through conquest.

## 5. Resources — Prototype

- **Gold:** construction, recruitment, upkeep, and commerce.
- **Timber:** buildings, ships, and equipment.
- **Stone:** buildings, defenses, roads, and major civic works.
- **Magical dust:** a rare special resource collected from the map and reserved for exceptional technologies and late-game construction.
- **Research:** progress through the current age's technology tree.

Food is not a player-managed resource. Additional strategic materials may appear in later ages, but each must have a clear purpose and should not create needless bookkeeping.

## 6. Research and technology

### 6.1 Research projects — Prototype

Each age has technologies with economic, civic, military, and logistical branches. Technologies unlock buildings, units, capabilities, or passive improvements.

The player selects one technology as the active research project. Monthly research points are automatically applied to that project's individual cost. If no technology is selected, new points remain in an unspent pool and never expire. Selecting a project immediately applies any stored points to it, up to its remaining cost. There is no combined age-wide progress meter; progress is displayed separately on each technology.

The prototype contains Surveying, Bronze Working, and Written Records as its first Ancient Age technologies.

### 6.2 Knowledge Huts — Prototype

Visiting a Knowledge Hut:

1. Permanently consumes the hut.
2. Selects two eligible technologies the player has not received from a hut.
3. Pauses map movement while the choice is open.
4. Lets the player choose exactly one research bonus.
5. Adds research progress and records the chosen field.

A hut cannot award an advancement waiver, readiness token, city, building, military victory, or any equivalent substitute for a concrete era requirement.

## 7. Era advancement

### 7.1 General rule

Advancement requires both:

- completion of the relevant research track; and
- satisfaction of visible, systemic readiness requirements.

The final requirements for each age transition will be tuned during development. Examples in conversation are illustrative and are not automatically binding rules.

### 7.2 Requirement categories

Possible requirement categories include territorial administration, city infrastructure, economic capacity, population, military experience, and cultural or scientific development. Requirements should scale where map size or scenario settings would otherwise make them unfair.

Requirements must never identify a particular AI player, scripted opponent, or mandatory named target. Players should be able to satisfy military requirements through any qualifying enemies and territorial requirements through any qualifying settlements.

### 7.3 Prototype Ancient readiness

The current vertical slice temporarily demonstrates the system with four requirements:

- complete the prototype Ancient research list;
- administer two settlements;
- construct a Civic Workshop; and
- win one field engagement.

These are prototype tuning values, not final progression design.

### 7.4 Planned ages

The working progression is Ancient, Classical, Medieval, Gunpowder, Industrial, and Modern. Names and boundaries may change as the technology tree is researched and balanced.

Cities belong to the civilization but must construct local infrastructure before using every new-age capability. Old units remain usable, allowing technological transitions to reshape armies gradually.

## 8. Cities and construction

### 8.1 Cities screen — Prototype

The Cities tab first lists every settlement currently controlled by the player. Selecting a city opens that city's own management view. Each city owns buildings, recruits, population, and monthly production. Buildings cost resources, may require prior buildings or technologies, and may unlock new units or production bonuses.

The prototype cities can build a Mason's Yard, Civic Workshop, and Scribes' Archive.

Each owned city generates a stock of available troops over time. A commander must physically occupy that city's adventure-map tile to transfer available troops into their field army. Merely owning or opening a distant city's screen does not permit recruitment into that commander.

### 8.2 Building tree — Planned

The full tree will include civic administration, scholarship, trade, stone production, industry, defenses, and multiple military branches. Cities should develop distinct roles rather than all converging on one optimal build order.

## 9. Armies and tactical combat — Planned

- Battles take place on a discrete battlefield, expected to use hexes.
- Units fight in stacks and have count, health, attack, defense, damage, movement, initiative, and morale.
- Positioning, terrain, line of sight, retaliation, formations, ranged attacks, and siege defenses matter.
- Commanders provide leadership, logistics, doctrines, and limited battlefield orders.
- Engineering, medicine, artillery, espionage, and tactics replace spellcasting.
- Armies contain historically grounded human soldiers and equipment; there are no mythical creatures.

The prototype adventure-map raider encounter currently resolves automatically. This is explicitly a placeholder for the tactical battle system.

### 9.1 Settlement placement

Every settlement must occupy passable terrain and be reachable using an appropriate movement mode. The capital must be visibly represented on the adventure map. The prototype capital, Aurum, is a prominent central landmark. Freehaven is a guarded neutral city on traversable land and remains visible after conquest.

## 10. Interface and controls — Prototype

- Click an adjacent highlighted map tile to move.
- Use Research and Cities tabs to switch the side panel.
- Select an owned city from the Cities list to enter its management view.
- Move a commander onto an owned city before recruiting its available troops.
- Select one of two options when a Knowledge Hut opens.
- Use End Month to advance the calendar and refresh movement.
- Open the Campaign Chronicle to review recent events.

The interface must remain usable on desktop and mobile layouts and expose meaningful accessible labels.

## 11. Save, AI, scenarios, and multiplayer — Planned

- Deterministic save/load state with versioned migrations.
- Computer opponents using the same public rules as players.
- Random and authored maps with configurable size, climate, resources, and opponents.
- Victory conditions defined per scenario, separate from era advancement.
- Multiplayer will be considered after the single-player rules and deterministic simulation stabilize.

## 12. Technical architecture

- Next.js and React provide the static browser interface.
- The site exports as static assets for GitHub Pages. A generated root snapshot supports the repository's current branch-based Pages source, and `.nojekyll` preserves Next.js asset directories.
- Pure game rules live in `app/game-core.js` and are exercised by Node's built-in test runner.
- Interface code lives in `app/page.tsx`; visual styling lives in `app/globals.css`.
- Automated coverage lives in `automated-tests/`.
- GitHub Actions builds and deploys every verified update to `main`.

## 13. Testing requirements

Automated tests must cover calendar rollover, monthly production, movement legality, pickup persistence, Knowledge Hut choice constraints, building costs, and era readiness. New systems must add focused deterministic tests before being considered complete. The production static build must also pass before a push.
