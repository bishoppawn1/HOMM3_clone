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

- The Western Marches use a larger, scrollable 32-by-20 logical map. Its central field is one region within a broader landscape of woodland, hills, roads, and water, all rendered as continuous terrain without visible grid lines or per-cell texture seams.
- A commander spends one movement point to enter an orthogonally adjacent passable tile.
- Water is impassable without an appropriate transport capability.
- Forest and hill artwork is currently decorative and does not impose a movement penalty.
- The first right-click on any passable destination previews the shortest available route. A second right-click on that same destination executes travel; right-clicking elsewhere replaces the preview.
- A route may extend beyond the commander's remaining movement. The portion traversable this month is yellow and the future portion is gray. Confirming a long route moves only across the yellow portion and spends the available movement; the destination can be plotted again after movement refreshes.
- Travel stops early if it encounters a battle or a Knowledge Hut choice.
- A commander currently has 16 movement points, within the intended 10–20 range, and movement refreshes each month.

### 4.2 Map sites — Prototype

- **Knowledge Hut:** consumed on visit and presents two eligible research bonuses.
- **Resource pickup:** consumed on visit and grants a small immediate resource amount.
- **Neutral city:** is a persistent settlement, never a pickup. Entering its tile begins a fight against its garrison; only victory transfers control.
- **Hostile army:** opens the tactical hex battlefield. Victory removes the hostile site and awards its listed spoils; retreat or defeat leaves it in place.

Consumed sites do not reappear merely because a month or year passes.

### 4.3 Persistent producers — Prototype

The Western Marches contain a sawmill that produces 10 timber per month, a quarry that produces 8 stone per month, and a mineral-dust works that produces 2 magical dust per month. Each producer occupies a multi-cell footprint with one passable entrance; route selection anywhere on its artwork resolves to that entrance. A neutral guarding force must be defeated before the site transfers to the player and begins monthly production. Producers persist after capture and are not consumed like pickups.

Producer and settlement landmarks use grounded, detailed artwork rather than symbolic map glyphs. Their presentation is era-aware: ancient and medieval development retains timber, stone, and fortified forms, while industrial and modern ages add visibly later architectural and industrial treatments. Ownership and production remain unchanged when the visual family changes.

Future maps may add farms, ports, trade posts, and similar controlled locations whose ownership can change through conquest.

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

The Cities tab first lists every settlement currently controlled by the player. Selecting a city leaves the adventure map and opens a dedicated full-screen city management view. Returning from that screen restores the map. Each city owns buildings, recruits, population, permanent defenders, and monthly production. Buildings cost resources, may require prior buildings or technologies, and may unlock new units or production bonuses.

The prototype contains a five-tier construction tree with more than twenty-five structures across economy, civic, military, and defense branches. The visible tree includes foundational buildings, city-tier upgrades, production buildings, research institutions, recruitment buildings, walls, and late-city capstones.

Each military recruitment building generates its own stock of available troops over time. The city screen identifies the source building for every unit and provides minus, plus, direct numeric entry, and maximum controls so the player can choose an exact quantity before paying the combined cost. A commander must physically occupy that city's adventure-map entrance to recruit from those buildings and transfer troops into their field army. Merely owning or opening a distant city's screen does not permit recruitment.

### 8.2 Building tree — Prototype

Construction is presented as a branching, spatial prerequisite tree in the style of a classic adventure-strategy city screen. A building can be purchased only when all parent nodes are complete and the city has every listed resource. Built, available, unaffordable, and prerequisite-locked nodes must be visually distinct.

Each city may complete at most one building per turn. Constructing in one city does not consume another owned city's construction opportunity. The construction limit resets for every city when the player ends the month, and the city screen must clearly show whether that city's construction opportunity is available or already used.

The economy branch runs from Market, Mason's Yard, Warehouse, and Bank toward Trade Guild, Foundry, and Treasury. The civic branch runs from Town Hall through Archive and City Hall toward Workshop, Academy, Monument, Great Library, and Civic Forum. The City Hall explicitly upgrades a settlement to city tier II and gates advanced development. The Mason's Yard costs gold and timber, never the stone it is intended to produce.

The military branch contains separate recruitment sources: Militia Yard for Spearmen, Archery Range for Slingers, Scout Camp for Scouts, Tier II Barracks for Swordsmen, and Stable for Horsemen. It continues through Training Grounds, Siege Workshop, War College, and Cavalry School. Constructing a recruitment building seeds its first recruit pool; later months add more troops. Units remain visible but locked until their source building exists.

The defense branch includes Palisade, Garrison, Stone Walls, and Citadel. A Garrison creates a small permanent city guard. Those defenders contribute only when an enemy attacks the city: they never appear as a recruitable field unit and cannot be transferred into a hero's army. The guard grows slowly and remains intentionally small; fortifications add separate defense strength.

## 9. Armies and tactical combat — Prototype

Adventure-map encounters deploy both armies onto a 15-by-9 odd-row-offset hex battlefield. Each troop type forms one stack, and each stack tracks its troop count through total health. A unit definition provides health per troop, attack, defense, minimum and maximum damage, speed, initiative, ranged capability, and ammunition. Damage uses the deterministic midpoint of the unit's damage range so identical battle states always produce identical results.

### 9.1 Turn order and orders — Prototype

- Living stacks act in descending initiative order. Player stacks win ties against enemy stacks.
- A stack may move to a reachable empty hex, attack an eligible enemy, wait once for the later initiative phase, or defend.
- Movement uses shortest-path traversal across adjacent hexes and cannot exceed the active stack's speed.
- Waiting postpones the stack until all non-waiting stacks have acted. Waiting stacks then act from lower to higher initiative.
- Defending ends the stack's action and adds 3 defense until the next round.
- When every living stack has acted, a new round resets retaliation, waiting, and defense state.
- Enemy stacks use the same movement, attack, and obstacle rules as the player. Enemy actions resolve one stack at a time so the active enemy and its movement remain visible instead of the whole AI phase completing instantly.

### 9.2 Battlefield positioning — Prototype

Field, producer, and settlement encounters use distinct fixed obstacle arrangements. Trees, boulders, stored timber, carts, rubble, and barricades mark impassable hexes. Living stacks also occupy and block their own hex. Reachable player movement is highlighted in gold, eligible enemy targets are highlighted in red, and every hex exposes an accessible description.

Melee stacks may move up to their full speed into a free hex adjacent to a target and attack in the same action. A surviving melee defender retaliates immediately, but only once per round. A stack killed by the initial strike cannot retaliate.

Ranged stacks begin with a limited number of shots. While they have ammunition and are not engaged by an adjacent enemy, they may target any living enemy stack anywhere on the battlefield; they are not restricted to straight-line targets. Ranged damage is halved beyond ten hexes. An engaged ranged stack may make a melee attack at half damage.

The currently acting stack is identified in the initiative strip, its army card, its battlefield hex, and the instruction banner for both player and enemy turns. Movement is animated from the origin hex to the destination hex, including movement performed automatically by enemy stacks and movement that precedes a melee strike. Reduced-motion preferences shorten these animations.

### 9.3 Outcomes — Prototype

Victory transfers a guarded settlement or producer to the player, or removes a defeated hostile field site, and writes surviving player stack counts back to the campaign army. Retreat preserves current survivors, returns the commander to Aurum, and leaves the enemy location under neutral or hostile control. Defeat follows the same campaign return but may leave no surviving troops. A commander with no field troops cannot deploy.

Morale, formations, elevation, destructible siege defenses, commander abilities, engineering, medicine, artillery, and more advanced enemy tactics remain planned. These systems must remain historically grounded and replace rather than imitate spellcasting. Armies contain human soldiers and equipment; there are no mythical creatures.

### 9.4 Settlement placement

Every settlement occupies a multi-cell visual footprint with one passable entrance and must be reachable using an appropriate movement mode. The capital must be visibly represented on the adventure map as an actual city rather than a castle symbol. The prototype capital, Aurum, is a prominent central landmark. Freehaven is a guarded neutral city on traversable land and remains visible after conquest.

## 10. Interface and controls — Prototype

- Right-click a passable location once to preview its route and right-click the same destination again to travel. Right-clicking another location replots the route. Yellow route segments are available now; gray segments exceed current movement.
- Left-clicking the map does not move the commander. Keyboard users can focus a map position and press Enter or Space twice for the same preview-and-confirm behavior.
- Adventure-map objects use recognizable artwork without permanent nameplates. Their names and state remain available through hover text and accessible labels.
- Use Research and Cities tabs to switch the side panel.
- Select an owned city from the Cities list to enter its management view.
- Move a commander onto an owned city before recruiting its available troops.
- Select one of two options when a Knowledge Hut opens.
- Use End Month to advance the calendar and refresh movement.
- Open the Campaign Chronicle to review recent events.
- At a guarded encounter, choose **Deploy on the battlefield** to enter tactical combat, or **Hold position** to step back to the previous map tile without engaging. Holding position does not refund movement already spent approaching the enemy, and the enemy remains in control.
- On the battlefield, select a gold hex to move or a red enemy stack to attack. Use **Wait**, **Defend**, or **Retreat** for the other available orders.

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

Automated tests must cover calendar rollover, monthly production, movement legality, route preview and confirmation, pickup persistence, Knowledge Hut choice constraints, guarded producer capture, building costs, era readiness, hex adjacency and distance, battlefield pathfinding and obstacles, unrestricted ranged targeting and ammunition, animatable combat actions, enemy turn pacing, retaliation, wait and defend state, retreat, and tactical battle outcomes. New systems must add focused deterministic tests before being considered complete. The production static build must also pass before a push.
