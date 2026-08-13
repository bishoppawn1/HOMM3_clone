"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BOARD,
  BUILDINGS,
  COMBAT_HEIGHT,
  COMBAT_WIDTH,
  MAP_HEIGHT,
  MAP_WIDTH,
  MAX_MOVEMENT,
  RESEARCH,
  UNITS,
  createGame,
  advanceMonth,
  advanceEra,
  chooseResearch,
  startResearch,
  buildInCity,
  attackCombatStack,
  combatCanAttack,
  combatMovementRemaining,
  combatReachable,
  declineBattle,
  defendCombatTurn,
  moveCombatStack,
  performEnemyCombatTurn,
  recruitFromCity,
  retreatCombat,
  resolveBattle,
  startCombat,
  waitCombatTurn,
  routeCommand,
  moveAlongPath,
  producerAt,
  settlementAt,
  cityDefense,
  eraReadiness,
  eraVisualFamily,
  isTerrainPassable,
  unitForEra,
  unitsForEra,
} from "./game-core.js";

const tileGlyph: Record<string, string> = { hill: "▲" };
const MAP_PAN_STEP = 210;
const MAP_PAN_DIRECTIONS: Record<string, readonly [number, number]> = {
  w: [0, -MAP_PAN_STEP], a: [-MAP_PAN_STEP, 0], s: [0, MAP_PAN_STEP], d: [MAP_PAN_STEP, 0],
};

const adventureRoads = [
  "M 6 13 C 14 11 22 14.5 31 13 S 48 11.5 64 13",
  "M 4 34 C 14 35.5 23 31 34 33 S 52 35.5 64 33",
  "M 18 8 C 20 15 16.5 24 18.5 34",
  "M 8 8 C 10 9 13 10.5 18 11.5",
  "M 8 8 C 7.5 10 9 12 10 13",
  "M 41 13 C 39.5 20 43 29 41 38",
  "M 61 10 C 59.5 17 63 25 61 35",
];

const terrainArtwork = [
  { kind: "forest", col: -2, row: -2, size: 9, turn: -8 },
  { kind: "forest", col: 5, row: -1, size: 8, turn: 5 },
  { kind: "forest", col: 12, row: 1, size: 7, turn: -4 },
  { kind: "forest", col: -3, row: 6, size: 8, turn: 4 },
  { kind: "forest", col: 3, row: 7, size: 7, turn: -7 },
  { kind: "forest", col: -3, row: 21, size: 8, turn: -5 },
  { kind: "forest", col: 5, row: 22, size: 8, turn: 6 },
  { kind: "forest", col: 13, row: 21, size: 7, turn: -4 },
  { kind: "forest", col: 20, row: 22, size: 7, turn: 7 },
  { kind: "forest", col: -2, row: 37, size: 9, turn: 4 },
  { kind: "forest", col: 7, row: 39, size: 8, turn: -7 },
  { kind: "forest", col: 15, row: 38, size: 8, turn: 5 },
  { kind: "forest", col: 53, row: 18, size: 7, turn: -6 },
  { kind: "forest", col: 58, row: 21, size: 7, turn: 5 },
  { kind: "forest", col: 63, row: 18, size: 5, turn: -5 },
  { kind: "forest", col: 54, row: 37, size: 8, turn: 6 },
  { kind: "forest", col: 60, row: 39, size: 7, turn: -7 },
  ...[-2, 3, 8, 16, 21, 26, 35, 40].flatMap((row, index) => [
    { kind: "mountain", col: 26 + [1, 2, 3, 1, -1, 0, 2, 1][index], row, size: 5, turn: [-8, -3, 5, 8, 3, -5, -8, 4][index] },
    { kind: "mountain", col: 50 + [2, 0, -1, -2, 0, 2, 1, -1][index], row, size: 5, turn: [6, 2, -6, -9, -3, 5, 8, -4][index] },
  ]),
];

type ResearchChoice = { id: string; name: string; icon: string; cost: number; bonus: number; description: string };
type Settlement = { id: string; name: string; tile: number; footprint?: number[]; territory?: number[][]; blockedBy?: number | null; owner: string; population: number; defenders: number; recruits: Record<string, number>; garrison?: number };
type Producer = { id: string; name: string; kind: string; resource: string; amount: number; footprint: number[]; entrance: number; owner: string; garrison: number };
type CombatStack = { id: string; side: "player" | "enemy"; unitId: string; era?: string; position: number; totalHealth: number; shots: number; waited: boolean; defending: boolean; retaliated: boolean; done: boolean; movementUsed: number };
type CombatState = {
  width: number; height: number; round: number; activeStackId: string | null; result: "victory" | "defeat" | "retreat" | null;
  battle: {type: string; settlementId?: string; producerId?: string; name: string; strength: number; returnTile?: number};
  stacks: CombatStack[]; obstacles: {tile: number; kind: string}[]; log: string[];
  actionSerial: number;
  lastAction: {id: number; type: "move" | "melee" | "ranged"; stackId: string; from: number; to: number; target?: number; path?: number[]} | null;
};
type GameState = {
  year: number; month: number; monthName: string; era: string; hero: number; moves: number;
  gold: number; wood: number; stone: number; magicDust: number; research: number; cities: number; victories: number;
  army: Record<string, number>; techs: string[]; buildings: Record<string, string[]>; activeResearch: string | null;
  constructionThisTurn: Record<string, boolean>;
  techProgress: Record<string, number>; researchChoice: ResearchChoice[] | null;
  pendingBattle: {type: string; settlementId?: string; producerId?: string; name: string; strength: number; returnTile?: number} | null;
  combat: CombatState | null;
  settlements: Record<string, Settlement>; sites: Record<number, string>;
  producers: Record<string, Producer>;
  pickups: Record<number, string>; pickupGuards: Record<number, number>; notice: string; log: string[];
};

export default function Home() {
  const [game, setGame] = useState<GameState>(() => createGame());
  const [panel, setPanel] = useState<"research" | "cities">("research");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [plannedPath, setPlannedPath] = useState<number[]>([]);
  const [plannedTarget, setPlannedTarget] = useState<number | null>(null);
  const mapViewport = useRef<HTMLDivElement>(null);
  const readiness = useMemo(() => eraReadiness(game), [game]);
  const currentResearch = useMemo(() => RESEARCH.filter(technology => technology.era === game.era), [game.era]);
  const currentUnits = useMemo(() => unitsForEra(game.era).filter((unit): unit is NonNullable<typeof unit> => unit !== null), [game.era]);
  const banditCamps = useMemo(() => [...new Set(Object.values(game.pickupGuards))].map((guard) => ({
    guard,
    footprint: [guard, ...Object.entries(game.pickupGuards).filter(([, camp]) => camp === guard).map(([tile]) => Number(tile))],
  })), [game.pickupGuards]);
  const visualEra = eraVisualFamily(game.era);
  const activeCity = panel === "cities" && selectedCity ? game.settlements[selectedCity] : null;

  useEffect(() => {
    const viewport = mapViewport.current;
    if (!viewport) return;
    const column = game.hero % MAP_WIDTH;
    const row = Math.floor(game.hero / MAP_WIDTH);
    viewport.scrollLeft = Math.max(0, column / MAP_WIDTH * viewport.scrollWidth - viewport.clientWidth / 2);
    viewport.scrollTop = Math.max(0, row / MAP_HEIGHT * viewport.scrollHeight - viewport.clientHeight / 2);
  }, []);

  useEffect(() => {
    function panMap(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.matches("input, textarea, select") || target.isContentEditable)) return;
      const direction = MAP_PAN_DIRECTIONS[event.key.toLowerCase()];
      const viewport = mapViewport.current;
      if (!direction || !viewport) return;
      event.preventDefault();
      viewport.scrollBy({ left: direction[0], top: direction[1], behavior: event.repeat ? "auto" : "smooth" });
    }
    window.addEventListener("keydown", panMap);
    return () => window.removeEventListener("keydown", panMap);
  }, []);

  function handleRoute(index: number) {
    const command = routeCommand(game, plannedTarget, index);
    if (command.type === "invalid") {
      setPlannedPath([]);
      setPlannedTarget(null);
      return;
    }
    if (command.type === "preview") {
      setPlannedPath(command.path);
      setPlannedTarget(command.target);
      return;
    }
    const city = settlementAt(game, command.target) as Settlement | null;
    const moved = moveAlongPath(game, command.path);
    setGame(moved);
    setPlannedPath([]);
    setPlannedTarget(null);
    if (city?.owner === "player" && moved.hero === city.tile) { setPanel("cities"); setSelectedCity(city.id); }
  }

  return (
    <main className="game-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="seal">TA</div>
          <div><span className="eyebrow">A turn-based strategy prototype</span><h1>Through the Ages</h1></div>
        </div>
        <div className="calendar" aria-label={`Year ${game.year}, ${game.monthName}`}>
          <span className="calendar-label">THE CAMPAIGN CALENDAR</span>
          <strong>{game.monthName}</strong>
          <span>Year {game.year} · Turn {game.month}/12</span>
        </div>
        <div className="resources" aria-label="Resources">
          <Resource icon="◆" value={game.gold} label="Gold" />
          <Resource icon="▰" value={game.wood} label="Timber" />
          <Resource icon="⬟" value={game.stone} label="Stone" />
          <Resource icon="✧" value={game.magicDust} label="Magical dust" />
          <Resource icon="✦" value={game.research} label="Research" />
        </div>
      </header>

      {game.combat ? (
        <CombatScreen game={game} updateGame={setGame} />
      ) : activeCity?.owner === "player" ? (
        <CityScreen game={game} city={activeCity} updateGame={setGame} exitCity={() => setSelectedCity(null)} />
      ) : (
      <section className="world">
        <aside className="left-rail parchment-panel">
          <p className="section-kicker">Commander</p>
          <div className="portrait" aria-label="Commander portrait"><span>COMMANDER</span></div>
          <h2>Marcellus Vale</h2>
          <p className="muted">Governor of Aurum</p>
          <div className="commander-stats">
            <Stat value="2" label="Command" /><Stat value="1" label="Logistics" /><Stat value="3" label="Learning" />
          </div>
          <div className="army">
            <p className="section-kicker">Field Army</p>
            {currentUnits.map(unit => game.army[unit.id] > 0 && <Army key={unit.id} name={unit.name} count={game.army[unit.id]} icon={unit.icon} />)}
          </div>
          <div className="movement">
            <span>Movement</span><strong>{game.moves}/{MAX_MOVEMENT}</strong>
            <div><i style={{ width: `${game.moves / MAX_MOVEMENT * 100}%` }} /></div>
          </div>
          <button className="ghost-button" onClick={() => setLogOpen(!logOpen)}>Campaign chronicle</button>
          {logOpen && <ol className="chronicle">{game.log.slice(-5).reverse().map((entry, i) => <li key={i}>{entry}</li>)}</ol>}
        </aside>

        <section className="map-wrap" aria-label="Campaign map">
          <div className="map-caption"><span>THE WESTERN MARCHES</span><b>WASD to pan · Early Spring · Clear skies</b></div>
          <div className="map-viewport" ref={mapViewport}>
          <div className={`map-grid era-${visualEra}`} style={{gridTemplateColumns: `repeat(${MAP_WIDTH}, 1fr)`, gridTemplateRows: `repeat(${MAP_HEIGHT}, 1fr)`}} onContextMenu={(event) => event.preventDefault()}>
            <svg className="terrain-layer" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
              <path className="river-bank" d="M 67 0 C 69 6 65 11 67 17 C 69 23 64.5 28 66.5 34 C 68.5 39 65 42 67 45 L 72 45 L 72 0 Z" />
              <path className="river-shine" d="M 68.2 0 C 70 6 66.4 12 68 18 C 69.5 24 66 29 67.7 35 C 69 40 66.5 42 68 45" />
              {Object.values(game.settlements).map((city) => city.territory && <polygon key={`territory-fill-${city.id}`} className={`territory-fill ${city.owner}`} points={city.territory.map(([x, y]) => `${x},${y}`).join(" ")} />)}
            </svg>
            <div className="terrain-patches" aria-hidden="true">
              {terrainArtwork.map((patch, index) => <img key={`${patch.kind}-${index}`} className={`terrain-patch ${patch.kind}`} style={terrainPatchBounds(patch)} src={`assets/map-v2/terrain-${patch.kind}.webp`} alt="" />)}
            </div>
            <svg className="road-layer" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
              {adventureRoads.map((path) => <path key={`shadow-${path}`} className="road-shadow" d={path} />)}
              {adventureRoads.map((path) => <path key={`road-${path}`} className="road-ribbon" d={path} />)}
            </svg>
            {banditCamps.map((camp) => <div key={`camp-${camp.guard}`} className={`map-bandit-camp ${game.sites[camp.guard] ? "occupied" : "cleared"}`} style={producerBounds(camp.footprint)} aria-hidden="true"><span>Bandit camp spoils</span></div>)}
            {BOARD.map((tile, index) => {
              const pickup = game.pickups[index];
              const guardedPickup = pickup && game.pickupGuards[index] !== undefined && game.sites[game.pickupGuards[index]] !== undefined;
              const site = game.sites[index];
              const city = settlementAt(game, index) as Settlement | null;
              const producer = producerAt(game, index) as Producer | null;
              const onPath = plannedPath.includes(index);
              const passable = isTerrainPassable(index);
              const terrainName = tile.replace("dense-forest", "dense forest");
              const description = `${terrainName}${passable ? "" : ", impassable"}${pickup ? `, ${pickup}${guardedPickup ? ", inside an occupied bandit camp" : ""}` : ""}${city ? `, ${city.name}${city.owner === "neutral" ? ", guarded" : ""}` : ""}${site ? ", raiders" : ""}${producer ? `, ${producer.name}, ${producer.owner === "neutral" ? "guarded" : "controlled"}` : ""}`;
              return (
                <button
                  key={index}
                  data-tile={index}
                  className={`map-tile ${tile} ${onPath ? "path-step" : ""} ${plannedTarget === index ? "path-target" : ""} ${game.hero === index ? "hero-tile" : ""}`}
                  onClick={(event) => event.preventDefault()}
                  onContextMenu={(event) => { event.preventDefault(); handleRoute(index); }}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handleRoute(index); } }}
                  title={description}
                  aria-disabled={!passable}
                  aria-label={`Map position ${index + 1}, ${description}. ${passable ? "Press Enter twice or right-click twice to travel here." : "Travel is blocked here."}`}
                >
                  {tileGlyph[tile] && index % 3 === 0 && <span className="terrain-glyph" aria-hidden="true">{tileGlyph[tile]}</span>}
                  {pickup === "knowledge" && <span className="site knowledge" aria-hidden="true"><b>⌂</b></span>}
                  {pickup && pickup !== "knowledge" && <span className={`site pickup ${pickup}`} aria-hidden="true"><img src={`assets/map-v2/pickup-${pickup}.webp`} alt="" /></span>}
                  {(site === "raiders" || site === "freehaven-bandits") && <span className="site enemy" aria-hidden="true"><img src="assets/map-v2/enemy-bandits.webp" alt="" /></span>}
                  {game.hero === index && <span className="hero" aria-hidden="true"><b>♞</b></span>}
                </button>
              );
            })}
            {plannedPath.length > 0 && <svg className="route-layer" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
              {routeSegment(game.hero, plannedPath.slice(0, game.moves), "route-now")}
              {routeSegment(plannedPath[Math.min(game.moves, plannedPath.length) - 1] ?? game.hero, plannedPath.slice(game.moves), "route-later")}
            </svg>}
            {Object.values(game.settlements).map((city) => <div key={city.id} className={`map-city ${city.owner} ${city.id}`} style={producerBounds(city.footprint ?? [city.tile])} aria-hidden="true">
              <img src={`assets/map-v2/city-${visualEra}.webp`} alt="" />
            </div>)}
            {Object.values(game.producers).map((producer) => <div key={producer.id} className={`map-producer ${producer.kind} ${producer.owner} visual-${visualEra}`} style={producerBounds(producer.footprint)} aria-hidden="true">
              <img src={`assets/map-v2/${producer.kind}-${visualEra}.webp`} alt="" />
              {producer.owner === "neutral" && <i>⚑</i>}
            </div>)}
          </div>
          </div>
          <div className="legend" aria-live="polite"><span><i className="route-swatch" />{plannedPath.length ? `${Math.min(plannedPath.length, game.moves)} now · ${Math.max(0, plannedPath.length - game.moves)} later` : "Right-click once to plot a route"}</span><span><i className="future-swatch" />Gray continues next month</span><span>Mountains and dense forest block travel</span></div>
        </section>

        <aside className="right-rail parchment-panel">
          <div className="tabs">
            <button className={panel === "research" ? "active" : ""} onClick={() => setPanel("research")}>Research</button>
            <button className={panel === "cities" ? "active" : ""} onClick={() => {setPanel("cities");setSelectedCity(null)}}>Cities</button>
          </div>
          {panel === "research" ? (
            <>
              <p className="section-kicker">Current age</p>
              <h2>{game.era} Age</h2>
              <p className="muted">Complete the age&apos;s knowledge and prove your civilization is ready to advance.</p>
              <div className="research-guidance"><b>{game.research} stored · +35 base each month</b><span>{game.activeResearch ? "New points go to the selected study." : "No active study. Points are being saved."}</span></div>
              <div className="tech-list">
                {currentResearch.map((tech) => {
                  const completed = game.techs.includes(tech.id);
                  const active = game.activeResearch === tech.id;
                  const progress = game.techProgress[tech.id] ?? 0;
                  return <button key={tech.id} disabled={completed} onClick={() => setGame(g => startResearch(g, tech.id))} className={`tech ${completed ? "done" : ""} ${active ? "active-tech" : ""}`}>
                    <span>{completed ? "✓" : tech.icon}</span>
                    <div><b>{tech.name}</b><small>{tech.description}</small><i><u style={{width: `${Math.min(100, progress / tech.cost * 100)}%`}} /></i><em>{completed ? "Completed" : active ? `${progress}/${tech.cost} · Researching` : `${progress}/${tech.cost} · Select`}</em></div>
                  </button>;
                })}
              </div>
              <p className="section-kicker readiness-title">Era readiness</p>
              <ul className="checklist">{readiness.checks.map((item) => <li key={item.label} className={item.met ? "met" : ""}><span>{item.met ? "✓" : "○"}</span>{item.label}</li>)}</ul>
              <button className="advance-button" disabled={!readiness.ready} onClick={() => setGame(advanceEra)}>{readiness.nextEra ? `Advance to the ${readiness.nextEra} Age` : "Modern Age reached"}</button>
            </>
          ) : (
            <CitiesPanel game={game} selectCity={setSelectedCity} />
          )}
        </aside>
      </section>
      )}

      {!game.combat && <footer className="turnbar">
        <div><span className="section-kicker">Month&apos;s report</span><p>{game.notice}</p></div>
        <button onClick={() => { setGame(advanceMonth); setPlannedPath([]); setPlannedTarget(null); }}><span>End {game.monthName}</span><small>Begin the next month →</small></button>
      </footer>}

      {game.researchChoice && (
        <div className="modal-backdrop" role="presentation">
          <section className="choice-modal" role="dialog" aria-modal="true" aria-labelledby="discovery-title">
            <span className="discovery-mark">⌂</span><p className="section-kicker">Knowledge hut discovered</p>
            <h2 id="discovery-title">Choose what the scholars reveal</h2>
            <p>Their records can accelerate one field of study. This bonus advances research only—it cannot satisfy an era-readiness requirement.</p>
            <div className="choice-grid">
              {game.researchChoice.map((choice) => <button key={choice.id} onClick={() => setGame(g => chooseResearch(g, choice.id))}><span>{choice.icon}</span><b>{choice.name}</b><small>+{choice.bonus} research progress</small></button>)}
            </div>
          </section>
        </div>
      )}
      {game.pendingBattle && !game.combat && (
        <div className="modal-backdrop" role="presentation">
          <section className="choice-modal battle-modal" role="dialog" aria-modal="true" aria-labelledby="battle-title">
            <span className="discovery-mark">⚔</span><p className="section-kicker">Battle required</p>
            <h2 id="battle-title">{game.pendingBattle.name} blocks your advance</h2>
            <p>Enemy strength: {game.pendingBattle.strength}. Deploy to fight, or hold outside the enemy position and choose another action.</p>
            <div className="battle-actions">
              <button className="battle-button" onClick={() => setGame(g => startCombat(g))}>Deploy on the battlefield</button>
              <button className="battle-decline-button" onClick={() => setGame(g => declineBattle(g))}>Hold position</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function CombatScreen({game, updateGame}: {game: GameState; updateGame: React.Dispatch<React.SetStateAction<GameState>>}) {
  const combat = game.combat!;
  const [animatingActionId, setAnimatingActionId] = useState<number | null>(null);
  const active = combat.stacks.find(stack => stack.id === combat.activeStackId) ?? null;
  const activeUnit = active ? unitForEra(active.unitId, active.era ?? game.era) : null;
  const reachable = new Set(active?.side === "player" ? combatReachable(combat, active.id) : []);
  const attackable = new Set(combat.stacks
    .filter(stack => active && stack.side !== active.side && stackCount(stack) > 0 && combatCanAttack(combat, active.id, stack.id))
    .map(stack => stack.id));
  const obstacles = new Map(combat.obstacles.map(obstacle => [obstacle.tile, obstacle.kind]));
  const stackAt = new Map(combat.stacks.filter(stack => stackCount(stack) > 0).map(stack => [stack.position, stack]));
  const turnOrder = [...combat.stacks].filter(stack => stackCount(stack) > 0).sort((a, b) => {
    const aUnit = unitForEra(a.unitId, a.era ?? game.era)!;
    const bUnit = unitForEra(b.unitId, b.era ?? game.era)!;
    return bUnit.initiative - aUnit.initiative || (a.side === "player" ? -1 : 1);
  });
  const playerAlive = combat.stacks.filter(stack => stack.side === "player" && stackCount(stack) > 0);
  const enemyAlive = combat.stacks.filter(stack => stack.side === "enemy" && stackCount(stack) > 0);
  const obstacleGlyph: Record<string, string> = { tree: "♣", boulder: "⬟", timber: "▰", cart: "▥", barricade: "╫", rubble: "▦" };
  const movementAction = combat.lastAction && combat.lastAction.from !== combat.lastAction.to ? combat.lastAction : null;
  const movingStack = movementAction ? combat.stacks.find(stack => stack.id === movementAction.stackId) ?? null : null;
  const movingUnit = movingStack ? unitForEra(movingStack.unitId, movingStack.era ?? game.era) : null;
  const showMovement = Boolean(movementAction && movingStack && movingUnit && animatingActionId === movementAction.id);

  useEffect(() => {
    if (!movementAction) return;
    setAnimatingActionId(movementAction.id);
    const timer = window.setTimeout(() => setAnimatingActionId(null), 650);
    return () => window.clearTimeout(timer);
  }, [movementAction?.id]);

  useEffect(() => {
    if (combat.result || active?.side !== "enemy") return;
    const timer = window.setTimeout(() => updateGame(current => performEnemyCombatTurn(current)), 800);
    return () => window.clearTimeout(timer);
  }, [active?.id, combat.result, updateGame]);

  function handleHex(tile: number, stack: CombatStack | undefined) {
    if (combat.result || !active || active.side !== "player") return;
    if (stack && attackable.has(stack.id)) updateGame(current => attackCombatStack(current, stack.id));
    else if (!stack && reachable.has(tile)) updateGame(current => moveCombatStack(current, tile));
  }

  return <section className="combat-screen" aria-label={`Tactical battle at ${combat.battle.name}`}>
    <header className="combat-header">
      <div><span className="section-kicker">Tactical engagement</span><h2>{combat.battle.name}</h2><p>Round {combat.round} · Odd-row hex battlefield</p></div>
      <div className="combat-turn-order" aria-label="Initiative order">
        {turnOrder.map(stack => {
          const unit = unitForEra(stack.unitId, stack.era ?? game.era)!;
          return <span key={stack.id} className={`${stack.side} ${stack.id === combat.activeStackId ? "active" : ""} ${stack.done ? "done" : ""}`} title={`${stack.side === "player" ? "Marcellus" : "Guard"} ${unit.name}, initiative ${unit.initiative}`}>{unit.icon}<b>{stackCount(stack)}</b></span>;
        })}
      </div>
      <div className="round-seal"><span>Round</span><b>{combat.round}</b></div>
    </header>

    <div className="combat-body">
      <aside className="combat-army player-army">
        <p className="section-kicker">Marcellus&apos;s army</p>
        <h3>{playerAlive.reduce((total, stack) => total + stackCount(stack), 0)} troops standing</h3>
        {combat.stacks.filter(stack => stack.side === "player").map(stack => <CombatStackCard key={stack.id} stack={stack} active={stack.id === combat.activeStackId} />)}
      </aside>

      <section className="battlefield-wrap">
        <div className="battlefield-instructions" aria-live="polite">
          {combat.result ? "The engagement is over." : active && activeUnit ? active.side === "player" ? <><b>Selected: {activeUnit.name}.</b> {combatMovementRemaining(combat, active.id)} movement left. Move again, attack a red target{activeUnit.ranged ? ` within ${activeUnit.range} hexes` : ""}, or defend to finish.</> : <><b>Enemy selected: {activeUnit.name}.</b> Watch its action.</> : "Selecting the next stack…"}
        </div>
        <div className="hex-battlefield">
          {showMovement && movementAction && movingStack && movingUnit && <span key={movementAction.id} className="combat-moving-token" style={combatMovementStyle(movementAction.from, movementAction.to)} aria-hidden="true"><span className={`combat-unit ${movingStack.side} selected`}><i>{movingUnit.icon}</i><b>{stackCount(movingStack)}</b></span></span>}
          {Array.from({length: COMBAT_WIDTH * COMBAT_HEIGHT}, (_, tile) => {
            const row = Math.floor(tile / COMBAT_WIDTH), col = tile % COMBAT_WIDTH;
            const stack = stackAt.get(tile);
            const obstacle = obstacles.get(tile);
            const canAttack = stack ? attackable.has(stack.id) : false;
            const canMove = !stack && reachable.has(tile);
            const unit = stack ? unitForEra(stack.unitId, stack.era ?? game.era)! : null;
            const label = obstacle ? `Impassable ${obstacle}` : stack && unit ? `${stack.side === "player" ? "Allied" : "Enemy"} ${unit.name}, ${stackCount(stack)} remaining${canAttack ? ", attack available" : ""}` : `Battlefield hex ${tile + 1}${canMove ? ", movement available" : ""}`;
            return <button
              key={tile}
              className={`combat-hex ${canMove ? "reachable" : ""} ${canAttack ? "attackable" : ""} ${stack?.id === combat.activeStackId ? "active-stack" : ""} ${obstacle ? "blocked" : ""}`}
              style={combatHexPosition(row, col)}
              onClick={() => handleHex(tile, stack)}
              aria-label={label}
              disabled={Boolean(combat.result) || Boolean(obstacle) || (!canMove && !canAttack)}
              title={label}
            >
              {obstacle && <span className={`combat-obstacle ${obstacle}`} aria-hidden="true">{obstacleGlyph[obstacle]}</span>}
              {stack && unit && <span className={`combat-unit ${stack.side} ${stack.id === combat.activeStackId ? "selected" : ""} ${showMovement && stack.id === movingStack?.id ? "movement-hidden" : ""}`} aria-hidden="true"><i>{unit.icon}</i><b>{stackCount(stack)}</b>{stack.defending && <em>⛨</em>}{stack.waited && !stack.done && <em>⌛</em>}{stack.id === combat.activeStackId && <strong className="active-marker">ACTING</strong>}</span>}
            </button>;
          })}
        </div>
        <div className="combat-key"><span><i className="move-key" /> Reachable</span><span><i className="attack-key" /> Attack</span><span><i className="blocked-key" /> Impassable</span></div>
      </section>

      <aside className="combat-army enemy-army">
        <p className="section-kicker">Defending force</p>
        <h3>{enemyAlive.reduce((total, stack) => total + stackCount(stack), 0)} troops standing</h3>
        {combat.stacks.filter(stack => stack.side === "enemy").map(stack => <CombatStackCard key={stack.id} stack={stack} active={stack.id === combat.activeStackId} />)}
        <div className="battle-log"><p className="section-kicker">Battle record</p><ol>{combat.log.slice(-7).reverse().map((entry, index) => <li key={`${entry}-${index}`}>{entry}</li>)}</ol></div>
      </aside>
    </div>

    <footer className="combat-controls">
      <div>{active && activeUnit && !combat.result ? <><span>{activeUnit.icon}</span><b>{activeUnit.name}</b><small>Movement {combatMovementRemaining(combat, active.id)}/{activeUnit.speed} · Attack {activeUnit.attack} · Defense {activeUnit.defense}{activeUnit.ranged ? ` · Range ${activeUnit.range} · ${active.shots} shots` : ""}</small></> : <><span>⚔</span><b>Battle resolved</b><small>Review the result before returning to the campaign.</small></>}</div>
      <button disabled={!active || active.side !== "player" || active.waited || (active.movementUsed ?? 0) > 0 || Boolean(combat.result)} onClick={() => updateGame(waitCombatTurn)}>⌛ Wait</button>
      <button disabled={!active || active.side !== "player" || Boolean(combat.result)} onClick={() => updateGame(defendCombatTurn)}>⛨ Defend</button>
      <button className="retreat-button" disabled={Boolean(combat.result)} onClick={() => updateGame(retreatCombat)}>⚑ Retreat</button>
    </footer>

    {combat.result && <div className="combat-result" role="dialog" aria-modal="true" aria-labelledby="combat-result-title">
      <section>
        <span>{combat.result === "victory" ? "⚔" : "⚑"}</span>
        <p className="section-kicker">Battle concluded</p>
        <h2 id="combat-result-title">{combat.result === "victory" ? "Victory" : combat.result === "retreat" ? "Orderly retreat" : "Defeat"}</h2>
        <p>{combat.result === "victory" ? `${combat.battle.name} has fallen. Surviving stacks will return to the campaign army.` : `Marcellus will return to Aurum with ${playerAlive.reduce((total, stack) => total + stackCount(stack), 0)} surviving troops.`}</p>
        <button onClick={() => updateGame(resolveBattle)}>{combat.result === "victory" ? "Claim the battlefield" : "Return to Aurum"}</button>
      </section>
    </div>}
  </section>;
}

function combatHexPosition(row: number, col: number): React.CSSProperties {
  const horizontalSpan = COMBAT_WIDTH + .5;
  const verticalSpan = 1 + (COMBAT_HEIGHT - 1) * .75;
  return {
    left: `${(col + (row % 2) * .5) / horizontalSpan * 100}%`,
    top: `${row * .75 / verticalSpan * 100}%`,
    width: `calc(${100 / horizontalSpan}% + 1px)`,
    height: `calc(${100 / verticalSpan}% + 1px)`,
  };
}

function stackCount(stack: CombatStack) {
  const unit = unitForEra(stack.unitId, stack.era)!;
  return stack.totalHealth > 0 ? Math.ceil(stack.totalHealth / unit.health) : 0;
}

function combatMovementStyle(from: number, to: number): React.CSSProperties {
  const point = (tile: number) => {
    const row = Math.floor(tile / COMBAT_WIDTH), col = tile % COMBAT_WIDTH;
    const horizontalSpan = COMBAT_WIDTH + .5;
    const verticalSpan = 1 + (COMBAT_HEIGHT - 1) * .75;
    return { x: (col + (row % 2) * .5 + .5) / horizontalSpan * 100, y: (row * .75 + .5) / verticalSpan * 100 };
  };
  const start = point(from), end = point(to);
  return { "--from-x": `${start.x}%`, "--from-y": `${start.y}%`, "--to-x": `${end.x}%`, "--to-y": `${end.y}%` } as React.CSSProperties;
}

function CombatStackCard({stack, active}: {stack: CombatStack; active: boolean}) {
  const unit = unitForEra(stack.unitId, stack.era)!;
  const count = stackCount(stack);
  const topHealth = count > 0 ? stack.totalHealth - (count - 1) * unit.health : 0;
  return <article className={`combat-stack-card ${stack.side} ${active ? "active" : ""} ${count === 0 ? "fallen" : ""}`}>
    <span>{unit.icon}</span><div><b>{unit.name}</b><small>{count > 0 ? `${count} troops · front rank ${topHealth}/${unit.health} health` : "Stack defeated"}</small><i><u style={{width: `${count > 0 ? topHealth / unit.health * 100 : 0}%`}} /></i></div>
    {unit.ranged && <em>{stack.shots} shots</em>}
  </article>;
}

function Resource({icon, value, label}: {icon: string; value: number; label: string}) {
  return <div title={label}><span>{icon}</span><b>{value.toLocaleString()}</b><small>{label}</small></div>;
}
function Stat({value, label}: {value: string; label: string}) { return <div><b>{value}</b><span>{label}</span></div>; }
function Army({name, count, icon}: {name: string; count: number; icon: string}) { return <div className="army-row"><span>{icon}</span><div><b>{name}</b><small>{count} troops</small></div></div>; }

function routeSegment(start: number, path: number[], className: string) {
  if (!path.length) return null;
  const points = [start, ...path].map((tile) => `${tile % MAP_WIDTH + .5},${Math.floor(tile / MAP_WIDTH) + .5}`).join(" ");
  return <g className={className}><polyline points={points} />{path.map((tile) => <circle key={`${className}-${tile}`} cx={tile % MAP_WIDTH + .5} cy={Math.floor(tile / MAP_WIDTH) + .5} r=".09" />)}</g>;
}

function producerBounds(footprint: number[]) {
  const columns = footprint.map((tile) => tile % MAP_WIDTH);
  const rows = footprint.map((tile) => Math.floor(tile / MAP_WIDTH));
  const left = Math.min(...columns), top = Math.min(...rows);
  return {
    left: `${left / MAP_WIDTH * 100}%`,
    top: `${top / MAP_HEIGHT * 100}%`,
    width: `${(Math.max(...columns) - left + 1) / MAP_WIDTH * 100}%`,
    height: `${(Math.max(...rows) - top + 1) / MAP_HEIGHT * 100}%`,
  };
}

function terrainPatchBounds(patch: { col: number; row: number; size: number; turn: number }) {
  return {
    left: `${patch.col / MAP_WIDTH * 100}%`,
    top: `${patch.row / MAP_HEIGHT * 100}%`,
    width: `${patch.size / MAP_WIDTH * 100}%`,
    transform: `rotate(${patch.turn}deg)`,
  };
}

function CitiesPanel({game, selectCity}: {game: GameState; selectCity: (id: string | null) => void}) {
  const owned = Object.values(game.settlements).filter(city => city.owner === "player");
  return <>
    <p className="section-kicker">Your settlements</p><h2>Cities</h2>
    <p className="muted">Select a city to leave the adventure map and enter its full management screen.</p>
    <div className="city-list">{owned.map(item => <button key={item.id} onClick={() => selectCity(item.id)}><span>♜</span><div><b>{item.name}</b><small>Population {item.population.toLocaleString()} · Defense {cityDefense(game, item.id)} · {game.hero === item.tile ? "Commander present" : "Commander away"}</small></div><em>Enter city →</em></button>)}</div>
  </>;
}

function CityScreen({game, city, updateGame, exitCity}: {game: GameState; city: Settlement; updateGame: React.Dispatch<React.SetStateAction<GameState>>; exitCity: () => void}) {
  const [recruitAmounts, setRecruitAmounts] = useState<Record<string, number>>(() => Object.fromEntries(UNITS.map((unit) => [unit.id, 1])));
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const recruitableUnits = unitsForEra(game.era).filter((unit): unit is NonNullable<typeof unit> => unit !== null);
  const cityBuildings = game.buildings[city.id] ?? [];
  const present = game.hero === city.tile;
  const defense = cityDefense(game, city.id);
  const constructionUsed = Boolean(game.constructionThisTurn?.[city.id]);
  const cityTier = cityBuildings.includes("civic-forum") ? 3 : cityBuildings.includes("city-hall") ? 2 : 1;
  return <section className="city-screen" aria-label={`${city.name} city management`}>
    <header className="city-screen-header">
      <button onClick={exitCity}>← Return to adventure map</button>
      <div><span className="section-kicker">City administration · Tier {cityTier}</span><h2>{city.name}</h2><p>Population {city.population.toLocaleString()} · {cityBuildings.length}/{BUILDINGS.length} structures completed</p></div>
      <div className="city-defense"><span>⛨</span><div><b>{defense}</b><small>City defense</small></div></div>
    </header>
    <div className="city-screen-body">
      <aside className="city-recruitment">
        <p className="section-kicker">Hero & recruitment</p>
        <div className={`city-hero-card ${present ? "present" : "away"}`}><span>♞</span><div><b>Marcellus Vale</b><small>{present ? "Inside the city" : "Away on the map"}</small></div></div>
        <p className="city-rule">{present ? "Recruitment buildings can transfer their available troops directly into this hero's army." : "A hero must stand on the city tile before any recruitment building can transfer troops."}</p>
        <div className="recruit-buildings">{recruitableUnits.map(unit => {
          const source = BUILDINGS.find(building => building.id === unit.requires);
          const unlocked = cityBuildings.includes(unit.requires);
          const maximum = Math.min(city.recruits[unit.id], Math.floor(game.gold / unit.cost));
          const amount = Math.min(Math.max(1, recruitAmounts[unit.id] ?? 1), Math.max(1, maximum));
          const chooseAmount = (value: number) => setRecruitAmounts((current) => ({...current, [unit.id]: Math.min(Math.max(1, value), Math.max(1, maximum))}));
          return <article key={unit.id} className={!unlocked ? "locked" : ""}>
            <header><span>{source?.icon}</span><div><b>{source?.name}</b><small>{unlocked ? "Operational" : "Not constructed"}</small></div></header>
            <button type="button" className={`recruit-unit ${selectedUnitId === unit.id ? "selected" : ""}`} aria-expanded={selectedUnitId === unit.id} onClick={() => setSelectedUnitId(current => current === unit.id ? null : unit.id)}><span>{unit.icon}</span><div><b>{unit.name}</b><small>Tier {unit.tier} · {city.recruits[unit.id]} available · Click for details</small></div></button>
            {selectedUnitId === unit.id && <div className="unit-inspector" role="region" aria-label={`${unit.name} statistics`}>
              <p>{unit.role}</p>
              <div><span><b>{unit.attack}</b>Attack</span><span><b>{unit.defense}</b>Defense</span><span><b>{unit.damage[0]}–{unit.damage[1]}</b>Damage</span><span><b>{unit.health}</b>Health</span><span><b>{unit.speed}</b>Speed</span><span><b>{unit.initiative}</b>Initiative</span></div>
              <small>{unit.ranged ? `Ranged · Range ${unit.range} · ${unit.shots} shots per battle` : "Melee unit"} · {unit.cost} gold each</small>
            </div>}
            {unlocked && <div className="recruit-quantity"><button type="button" aria-label={`Recruit one fewer ${unit.name}`} disabled={maximum < 1 || amount <= 1} onClick={() => chooseAmount(amount - 1)}>−</button><input aria-label={`${unit.name} recruitment quantity`} type="number" min="1" max={Math.max(1, maximum)} value={amount} disabled={maximum < 1} onChange={(event) => chooseAmount(Number(event.target.value) || 1)} /><button type="button" aria-label={`Recruit one more ${unit.name}`} disabled={maximum < 1 || amount >= maximum} onClick={() => chooseAmount(amount + 1)}>+</button><button type="button" disabled={maximum < 1} onClick={() => chooseAmount(maximum)}>Max</button></div>}
            <button disabled={!unlocked || !present || maximum < 1} onClick={() => { updateGame(g => recruitFromCity(g, city.id, unit.id, amount)); chooseAmount(1); }}>{unlocked ? `Recruit ${amount} · ${amount * unit.cost} ◆` : "Building required"}</button>
          </article>;
        })}</div>
        <div className="guard-card"><span>⛨</span><div><b>Permanent city guard</b><small>{city.defenders} troops · Cannot join a hero</small></div></div>
      </aside>
      <section className="city-construction">
        <div className="construction-heading"><div><p className="section-kicker">Construction tree</p><h3>Develop {city.name}</h3><p className={`construction-status ${constructionUsed ? "used" : "available"}`}>{constructionUsed ? "Construction complete for this turn. End the month to build again." : "Construction available: this city may complete one building this turn."}</p></div><div className="tree-legend"><span>Economy</span><span>Civic</span><span>Military</span><span>Defense</span></div></div>
        <div className="construction-tree full-tree">
          <svg className="construction-connectors" viewBox="0 0 7 5" preserveAspectRatio="none" aria-hidden="true">
            <defs><marker id="dependency-arrow" markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" /></marker></defs>
            {BUILDINGS.flatMap(building => building.requires.map(requiredId => {
              const required = BUILDINGS.find(item => item.id === requiredId);
              if (!required) return null;
              const complete = cityBuildings.includes(requiredId) && cityBuildings.includes(building.id);
              return <path key={`${requiredId}-${building.id}`} className={`${complete ? "complete" : "pending"} dependency-${building.branch}`} d={buildingConnectorPath(required, building)} markerEnd="url(#dependency-arrow)" />;
            }))}
          </svg>
          {BUILDINGS.map(building => {
          const built = cityBuildings.includes(building.id);
          const prerequisitesMet = building.requires.every(required => cityBuildings.includes(required));
          const affordable = game.gold >= building.gold && game.wood >= building.wood && game.stone >= building.stone;
          const requirementNames = building.requires.map(required => BUILDINGS.find(item => item.id === required)?.name).join(" + ");
          return <article className={`build-node ${building.branch} ${built ? "built" : ""} ${!prerequisitesMet ? "locked" : ""}`} style={{gridColumn: building.x, gridRow: building.y}} key={building.id}>
            <header><span>{building.icon}</span><div><b>{building.name}</b><em>Tier {building.tier}</em></div></header>
            <small>{recruitableUnits.find(unit => unit.requires === building.id) ? `Recruits ${recruitableUnits.find(unit => unit.requires === building.id)?.name}.` : building.description}</small>
            {building.requires.length > 0 && <p className="requirement-label">Requires: {requirementNames}</p>}
            {built ? <strong>✓ Built</strong> : <button className="construction-cost" disabled={constructionUsed || !prerequisitesMet || !affordable} title={constructionUsed ? "This city has already completed a building this turn; the listed cost remains unchanged" : undefined} onClick={() => updateGame(g => buildInCity(g, city.id, building.id))}><span>◆ {building.gold} gold{building.wood > 0 && ` · ▰ ${building.wood} timber`}{building.stone > 0 && ` · ⬟ ${building.stone} stone`}</span>{constructionUsed && <small>Available next turn</small>}</button>}
          </article>;
        })}</div>
      </section>
    </div>
  </section>;
}

function buildingConnectorPath(parent: {x: number; y: number}, child: {x: number; y: number}) {
  const startX = parent.x - .5, startY = parent.y - .5;
  const endX = child.x - .5, endY = child.y - .5;
  if (parent.y === child.y) {
    const direction = Math.sign(endX - startX) || 1;
    const lift = .16 + Math.abs(endX - startX) * .035;
    return `M ${startX + direction * .43} ${startY} C ${startX + direction * .68} ${startY - lift}, ${endX - direction * .68} ${endY - lift}, ${endX - direction * .43} ${endY}`;
  }
  return `M ${startX} ${startY + .43} C ${startX} ${startY + .68}, ${endX} ${endY - .68}, ${endX} ${endY - .43}`;
}
