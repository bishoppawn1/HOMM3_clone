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
  MAX_COMMANDER_STACKS,
  MAX_TROOPS_PER_STACK,
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
  finishCombatTurn,
  moveCombatStack,
  performEnemyCombatTurn,
  recruitFromCity,
  retreatCombat,
  resolveBattle,
  startCombat,
  waitCombatTurn,
  routeCommand,
  scoutEnemyForce,
  moveAlongPath,
  producerAt,
  settlementAt,
  cityDefense,
  eraReadiness,
  eraVisualFamily,
  isTerrainPassable,
  unitForEra,
  unitsForEra,
  armyStackCount,
  assessBattleThreat,
  banditGuardAt,
  banditGuardZone,
  maxRecruitableIntoArmy,
} from "./game-core.js";

const MAP_PAN_STEP = 210;
const MAP_PAN_DIRECTIONS: Record<string, readonly [number, number]> = {
  w: [0, -MAP_PAN_STEP], a: [-MAP_PAN_STEP, 0], s: [0, MAP_PAN_STEP], d: [MAP_PAN_STEP, 0],
};

const adventureRoads = [
  "M 5 13.3 C 12 12.1 19 13.8 27 13.2 C 38 12.2 50 12.4 66 13.4",
  "M 4 33.8 C 13 32.5 23 33.4 32 33 C 43 32.4 54 34.1 66 33.4",
  "M 18.2 8 C 19.1 14 17.2 20 18.1 26 C 18.7 30 18.4 32 18.3 33.2",
  "M 8 8.2 C 11 9.1 14.7 11 18.3 13.1",
  "M 41 13 C 40.2 19 41.8 25 41.1 31 C 40.8 34 41.2 36 41 38",
  "M 61 10 C 60.2 16 61.7 22 61.1 28 C 60.8 31 61.1 32.5 61 33.6",
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
];

const mountainFootprint = BOARD.flatMap((terrain, tile) => terrain === "mountain"
  ? [`M ${tile % MAP_WIDTH} ${Math.floor(tile / MAP_WIDTH)} h 1 v 1 h -1 Z`]
  : []).join(" ");

type ResearchChoice = { id: string; name: string; icon: string; cost: number; bonus: number; description: string };
type Settlement = { id: string; name: string; tile: number; footprint?: number[]; territory?: number[][]; blockedBy?: number | null; owner: string; population: number; defenders: number; recruits: Record<string, number>; garrison?: number };
type Producer = { id: string; name: string; kind: string; resource: string; amount: number; footprint: number[]; entrance: number; owner: string; garrison: number };
type CombatStack = { id: string; side: "player" | "enemy"; unitId: string; era?: string; position: number; totalHealth: number; maxHealth?: number; shots: number; waited: boolean; defending: boolean; retaliated: boolean; done: boolean; movementUsed: number };
type CombatState = {
  width: number; height: number; round: number; activeStackId: string | null; result: "victory" | "defeat" | "retreat" | null;
  battle: {type: string; settlementId?: string; producerId?: string; siteTile?: number; name: string; strength: number; returnTile?: number};
  stacks: CombatStack[]; obstacles: {tile: number; kind: string}[]; log: string[];
  actionSerial: number;
  lastAction: {id: number; type: "move" | "melee" | "ranged"; stackId: string; from: number; to: number; target?: number; path?: number[]} | null;
};
type ForceEstimate = NonNullable<ReturnType<typeof scoutEnemyForce>>;
type GameState = {
  year: number; month: number; monthName: string; era: string; hero: number; moves: number;
  gold: number; wood: number; stone: number; magicDust: number; research: number; cities: number; victories: number;
  army: Record<string, number>; techs: string[]; buildings: Record<string, string[]>; activeResearch: string | null;
  constructionThisTurn: Record<string, boolean>;
  techProgress: Record<string, number>; researchChoice: ResearchChoice[] | null;
  pendingBattle: {type: string; settlementId?: string; producerId?: string; siteTile?: number; name: string; strength: number; returnTile?: number} | null;
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
  const [scoutedForce, setScoutedForce] = useState<ForceEstimate | null>(null);
  const mapViewport = useRef<HTMLDivElement>(null);
  const readiness = useMemo(() => eraReadiness(game), [game]);
  const currentResearch = useMemo(() => RESEARCH.filter(technology => technology.era === game.era), [game.era]);
  const currentUnits = useMemo(() => unitsForEra(game.era).filter((unit): unit is NonNullable<typeof unit> => unit !== null), [game.era]);
  const battleThreat = useMemo(() => assessBattleThreat(game), [game]);
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
      setScoutedForce(null);
      return;
    }
    if (command.type === "preview") {
      setPlannedPath(command.path);
      setPlannedTarget(command.target);
      setScoutedForce(command.scouting as ForceEstimate | null);
      if (command.notice) setGame({...game, notice: command.notice});
      return;
    }
    const city = settlementAt(game, command.target) as Settlement | null;
    const moved = moveAlongPath(game, command.path);
    setGame(moved);
    setPlannedPath([]);
    setPlannedTarget(null);
    setScoutedForce(null);
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
            <p className="section-kicker">Field Army · {armyStackCount(game.army)}/{MAX_COMMANDER_STACKS} stacks</p>
            {currentUnits.map(unit => game.army[unit.id] > 0 && <Army key={unit.id} name={unit.name} count={game.army[unit.id]} unitId={unit.id} era={game.era} />)}
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
              <path className="hill-ground" d="M 30.5 0 C 35 1.2 39 -0.6 44 .4 C 48 1.4 51 4.5 50.2 8.8 C 45 10.8 38.5 9.7 32 10.2 C 29.8 7 29.3 3.2 30.5 0 Z" />
              <path className="hill-ground" d="M 31 29 C 36 27.8 42 29.7 47 28.9 C 51 31.7 53 36.2 52.2 45 L 31.2 45 C 29.8 40 30.4 34.7 31 29 Z" />
              <path className="river-bank" d="M 67 0 C 69 6 65 11 67 17 C 69 23 64.5 28 66.5 34 C 68.5 39 65 42 67 45 L 72 45 L 72 0 Z" />
              <path className="river-shine" d="M 68.2 0 C 70 6 66.4 12 68 18 C 69.5 24 66 29 67.7 35 C 69 40 66.5 42 68 45" />
              {Object.values(game.settlements).map((city) => city.territory && <polygon key={`territory-fill-${city.id}`} className={`territory-fill ${city.owner}`} points={city.territory.map(([x, y]) => `${x},${y}`).join(" ")} />)}
            </svg>
            <div className="terrain-patches" aria-hidden="true">
              {terrainArtwork.map((patch, index) => <img key={`${patch.kind}-${index}`} className={`terrain-patch ${patch.kind}`} style={terrainPatchBounds(patch)} src={`assets/map-v2/terrain-${patch.kind}.webp`} alt="" />)}
            </div>
            <svg className="mountain-layer" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <pattern id="mountain-art" width="5" height="4.49" patternUnits="userSpaceOnUse">
                  <rect width="5" height="4.49" className="mountain-ground" />
                  <image href="assets/map-v2/terrain-mountain.webp" width="5" height="4.49" preserveAspectRatio="xMidYMid slice" />
                </pattern>
              </defs>
              <path className="mountain-footprint" d={mountainFootprint} />
            </svg>
            <svg className="road-layer" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
              {adventureRoads.map((path) => <path key={`shadow-${path}`} className="road-shadow" d={path} />)}
              {adventureRoads.map((path) => <path key={`road-${path}`} className="road-ribbon" d={path} />)}
              {adventureRoads.map((path) => <path key={`rut-${path}`} className="road-rut" d={path} />)}
            </svg>
            {Object.entries(game.sites).filter(([, site]) => site === "raiders" || site === "freehaven-bandits").map(([tile]) => <div key={`guard-zone-${tile}`} className="bandit-control-zone" style={producerBounds(banditGuardZone(Number(tile)))} aria-hidden="true"><span>Bandit-controlled</span></div>)}
            {BOARD.map((tile, index) => {
              const pickup = game.pickups[index];
              const guardedPickup = pickup && game.pickupGuards[index] !== undefined && game.sites[game.pickupGuards[index]] !== undefined;
              const site = game.sites[index];
              const city = settlementAt(game, index) as Settlement | null;
              const producer = producerAt(game, index) as Producer | null;
              const controllingBandit = banditGuardAt(game, index);
              const onPath = plannedPath.includes(index);
              const passable = isTerrainPassable(index);
              const terrainName = tile.replace("dense-forest", "dense forest");
              const description = `${terrainName}${passable ? "" : ", impassable"}${pickup ? `, ${pickup}${guardedPickup ? ", guarded by nearby bandits" : ""}` : ""}${city ? `, ${city.name}${city.owner === "neutral" ? ", guarded" : ""}` : ""}${site ? ", raiders" : controllingBandit !== null ? ", bandit-controlled ground" : ""}${producer ? `, ${producer.name}, ${producer.owner === "neutral" ? "guarded" : "controlled"}` : ""}`;
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
                  aria-label={`Map position ${index + 1}, ${description}. ${passable ? "Press Enter or right-click once to preview the route and any hostile force; repeat to travel." : "Travel is blocked here."}`}
                >
                  {pickup === "knowledge" && <span className="site knowledge" aria-hidden="true"><b>⌂</b></span>}
                  {pickup && pickup !== "knowledge" && <span className={`site pickup ${pickup}`} aria-hidden="true"><img src={`assets/map-v2/pickup-${pickup}.webp`} alt="" /></span>}
                  {(site === "raiders" || site === "freehaven-bandits") && <span className="site enemy" aria-hidden="true"><img src="assets/map-v2/enemy-bandit-unit.png" alt="" /></span>}
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
            </div>)}
            {Object.values(game.producers).filter((producer) => producer.owner === "neutral").map((producer) => <div key={`guard-${producer.id}`} className="producer-guard" style={producerBounds([producer.entrance])} aria-hidden="true">
              <img src="assets/map-v2/enemy-bandit-unit.png" alt="" />
            </div>)}
          </div>
          </div>
          {scoutedForce && <aside className="force-preview" role="status" aria-live="polite">
            <span className="section-kicker">Scouting estimate</span>
            <b>{scoutedForce.name}</b>
            <ul>{scoutedForce.units.map((unit) => <li key={unit.unitId}><span>{unit.minimum}{unit.maximum === null ? "+" : `–${unit.maximum}`}</span> {unit.name}</li>)}</ul>
            <small>Approximate force · right-click again to advance</small>
          </aside>}
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
              <p className="muted">Research the marked age technologies to advance. Cities, buildings, territory, and battles are not requirements.</p>
              <div className="research-guidance"><b>{game.research} stored · +35 base each month</b><span>{game.activeResearch ? "New points go to the selected study." : "No active study. Points are being saved."}</span></div>
              <div className="tech-list">
                {currentResearch.map((tech) => {
                  const completed = game.techs.includes(tech.id);
                  const active = game.activeResearch === tech.id;
                  const progress = game.techProgress[tech.id] ?? 0;
                  const required = readiness.requiredTechIds.includes(tech.id);
                  return <button key={tech.id} disabled={completed} onClick={() => setGame(g => startResearch(g, tech.id))} className={`tech ${completed ? "done" : ""} ${active ? "active-tech" : ""}`}>
                    <span>{completed ? "✓" : tech.icon}</span>
                    <div><b>{tech.name}</b><small className={required ? "tech-requirement required" : "tech-requirement"}>{required ? `Required for ${readiness.nextEra} Age` : "Optional discovery"}</small><small>{tech.description}</small><i><u style={{width: `${Math.min(100, progress / tech.cost * 100)}%`}} /></i><em>{completed ? "Completed" : active ? `${progress}/${tech.cost} · Researching` : `${progress}/${tech.cost} · Select`}</em></div>
                  </button>;
                })}
              </div>
              <p className="section-kicker readiness-title">Technologies required to advance</p>
              <ul className="checklist">{readiness.checks.map((item: {technologyId: string; label: string; met: boolean}) => <li key={item.technologyId} className={item.met ? "met" : ""}><span>{item.met ? "✓" : "○"}</span>{item.label}</li>)}</ul>
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
        <button onClick={() => { setGame(advanceMonth); setPlannedPath([]); setPlannedTarget(null); setScoutedForce(null); }}><span>End {game.monthName}</span><small>Begin the next month →</small></button>
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
            {battleThreat && <div className={`threat-rating ${battleThreat.level}`} role="status" aria-label={`${battleThreat.level} threat: ${battleThreat.label}`}>
              <span><i aria-hidden="true" />{battleThreat.level} threat</span>
              <b>{battleThreat.label}</b>
              <small>{battleThreat.description}</small>
            </div>}
            <p>Enemy strength: {game.pendingBattle.strength}. This estimate compares your current army with the force ahead. Deploy to fight, or hold outside the enemy position and choose another action.</p>
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
          return <span key={stack.id} className={`${stack.side} ${stack.id === combat.activeStackId ? "active" : ""} ${stack.done ? "done" : ""}`} title={`${stack.side === "player" ? "Marcellus" : "Guard"} ${unit.name}, initiative ${unit.initiative}`}><img src={unitPortrait(stack.unitId, stack.era ?? game.era)} alt="" /><b>{stackCount(stack)}</b></span>;
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
          {combat.result ? "The engagement is over." : active && activeUnit ? active.side === "player" ? <><b>Selected: {activeUnit.name}.</b> {combatMovementRemaining(combat, active.id)} movement left. Right-click a yellow hex to move, right-click a red target{activeUnit.ranged ? ` within ${activeUnit.range} hexes` : ""} to attack, or finish the turn.</> : <><b>Enemy selected: {activeUnit.name}.</b> Watch its action.</> : "Selecting the next stack…"}
        </div>
        <div className="hex-battlefield" onContextMenu={(event) => event.preventDefault()}>
          {showMovement && movementAction && movingStack && movingUnit && <span key={movementAction.id} className="combat-moving-token" style={combatMovementStyle(movementAction.from, movementAction.to)} aria-hidden="true"><CombatUnitToken stack={movingStack} selected /></span>}
          {Array.from({length: COMBAT_WIDTH * COMBAT_HEIGHT}, (_, tile) => {
            const row = Math.floor(tile / COMBAT_WIDTH), col = tile % COMBAT_WIDTH;
            const stack = stackAt.get(tile);
            const obstacle = obstacles.get(tile);
            const canAttack = stack ? attackable.has(stack.id) : false;
            const canMove = !stack && reachable.has(tile);
            const unit = stack ? unitForEra(stack.unitId, stack.era ?? game.era)! : null;
            const label = stack && unit ? `${stack.side === "player" ? "Allied" : "Enemy"} ${unit.name}, ${stackCount(stack)} remaining${canAttack ? ", attack available" : ""}` : obstacle ? `${activeUnit?.flying && canMove ? "Fly over" : "Impassable"} ${obstacle}${canMove ? ", movement available" : ""}` : `Battlefield hex ${tile + 1}${canMove ? ", movement available" : ""}`;
            return <button
              key={tile}
              className={`combat-hex ${canMove ? "reachable" : ""} ${canAttack ? "attackable" : ""} ${stack?.id === combat.activeStackId ? "active-stack" : ""} ${obstacle && !canMove && !canAttack ? "blocked" : ""}`}
              style={combatHexPosition(row, col)}
              onClick={(event) => event.preventDefault()}
              onContextMenu={(event) => { event.preventDefault(); handleHex(tile, stack); }}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handleHex(tile, stack); } }}
              aria-label={label}
              disabled={Boolean(combat.result) || (!canMove && !canAttack)}
              title={label}
            >
              {obstacle && <span className={`combat-obstacle ${obstacle}`} aria-hidden="true">{obstacleGlyph[obstacle]}</span>}
              {stack && unit && <CombatUnitToken stack={stack} selected={stack.id === combat.activeStackId} hidden={showMovement && stack.id === movingStack?.id} />}
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
      <div>{active && activeUnit && !combat.result ? <><span><img src={unitPortrait(active.unitId, active.era ?? game.era)} alt="" /></span><b>{activeUnit.name}</b><small>Movement {combatMovementRemaining(combat, active.id)}/{activeUnit.speed} · Attack {activeUnit.attack} · Defense {activeUnit.defense}{activeUnit.ranged ? ` · Range ${activeUnit.range} · ${active.shots} shots` : ""}{activeUnit.longRange ? " · Long range" : ""}{activeUnit.armored ? " · Armored" : ""}{activeUnit.flying ? " · Flying" : ""}</small></> : <><span>⚔</span><b>Battle resolved</b><small>Review the result before returning to the campaign.</small></>}</div>
      <button disabled={!active || active.side !== "player" || active.waited || (active.movementUsed ?? 0) > 0 || Boolean(combat.result)} onClick={() => updateGame(waitCombatTurn)}>⌛ Wait</button>
      <button disabled={!active || active.side !== "player" || Boolean(combat.result)} onClick={() => updateGame(finishCombatTurn)}>✓ Finish Turn</button>
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

function unitPortrait(unitId: string, era: string) {
  return `assets/units/${eraVisualFamily(era)}-${unitId}.png`;
}

function stackHealthPercent(stack: CombatStack) {
  const maximum = stack.maxHealth ?? stack.totalHealth;
  return maximum > 0 ? Math.max(0, Math.min(100, stack.totalHealth / maximum * 100)) : 0;
}

function CombatUnitToken({stack, selected = false, hidden = false}: {stack: CombatStack; selected?: boolean; hidden?: boolean}) {
  const maximum = stack.maxHealth ?? stack.totalHealth;
  return <span className={`combat-unit ${stack.side} ${selected ? "selected" : ""} ${hidden ? "movement-hidden" : ""}`} aria-hidden="true">
    <img src={unitPortrait(stack.unitId, stack.era ?? "Ancient")} alt="" />
    <b>{stackCount(stack)}</b>
    <span className="unit-health"><i><u style={{width: `${stackHealthPercent(stack)}%`}} /></i><small>{stack.totalHealth}/{maximum}</small></span>
    {stack.defending && <em>⛨</em>}{stack.waited && !stack.done && <em>⌛</em>}
  </span>;
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
    <span><img src={unitPortrait(stack.unitId, stack.era ?? "Ancient")} alt="" /></span><div><b>{unit.name}</b><small>{count > 0 ? `${count} troops · ${stack.totalHealth}/${stack.maxHealth ?? stack.totalHealth} stack health · front rank ${topHealth}/${unit.health}` : "Stack defeated"}</small><i><u style={{width: `${stackHealthPercent(stack)}%`}} /></i></div>
    {unit.ranged && <em>{stack.shots} shots</em>}
  </article>;
}

function Resource({icon, value, label}: {icon: string; value: number; label: string}) {
  return <div title={label}><span>{icon}</span><b>{value.toLocaleString()}</b><small>{label}</small></div>;
}
function Stat({value, label}: {value: string; label: string}) { return <div><b>{value}</b><span>{label}</span></div>; }
function Army({name, count, unitId, era}: {name: string; count: number; unitId: string; era: string}) { return <div className="army-row"><span><img src={unitPortrait(unitId, era)} alt="" /></span><div><b>{name}</b><small>{count} troops · {Math.ceil(count / MAX_TROOPS_PER_STACK)} {Math.ceil(count / MAX_TROOPS_PER_STACK) === 1 ? "stack" : "stacks"}</small></div></div>; }

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
  const usedStacks = armyStackCount(game.army);
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
        <p className="city-rule">{present ? `Recruitment transfers troops into stacks of up to ${MAX_TROOPS_PER_STACK}. Marcellus currently commands ${usedStacks}/${MAX_COMMANDER_STACKS} stacks.` : "A hero must stand on the city tile before any recruitment building can transfer troops."}</p>
        <div className="recruit-buildings">{recruitableUnits.map(unit => {
          const source = BUILDINGS.find(building => building.id === unit.requires);
          const unlocked = cityBuildings.includes(unit.requires);
          const stackCapacity = maxRecruitableIntoArmy(game.army, unit.id);
          const maximum = Math.min(city.recruits[unit.id], Math.floor(game.gold / unit.cost), stackCapacity);
          const amount = Math.min(Math.max(1, recruitAmounts[unit.id] ?? 1), Math.max(1, maximum));
          const chooseAmount = (value: number) => setRecruitAmounts((current) => ({...current, [unit.id]: Math.min(Math.max(1, value), Math.max(1, maximum))}));
          return <article key={unit.id} className={!unlocked ? "locked" : ""}>
            <header><span>{source?.icon}</span><div><b>{source?.name}</b><small>{unlocked ? "Operational" : "Not constructed"}</small></div></header>
            <button type="button" className={`recruit-unit ${selectedUnitId === unit.id ? "selected" : ""}`} aria-expanded={selectedUnitId === unit.id} onClick={() => setSelectedUnitId(current => current === unit.id ? null : unit.id)}><span><img src={unitPortrait(unit.id, game.era)} alt="" /></span><div><b>{unit.name}</b><small>Tier {unit.tier} · {city.recruits[unit.id]} available · Click for details</small></div></button>
            {selectedUnitId === unit.id && <div className="unit-inspector" role="region" aria-label={`${unit.name} statistics`}>
              <p>{unit.role}</p>
              <div><span><b>{unit.attack}</b>Attack</span><span><b>{unit.defense}</b>Defense</span><span><b>{unit.damage[0]}–{unit.damage[1]}</b>Damage</span><span><b>{unit.health}</b>Health</span><span><b>{unit.speed}</b>Speed</span><span><b>{unit.initiative}</b>Initiative</span></div>
              <small>{unit.ranged ? `Ranged · Range ${unit.range} · ${unit.shots} shots per battle` : "Melee unit"}{unit.longRange ? " · Long range" : ""}{unit.armored ? " · Armored" : ""}{unit.flying ? " · Flying over obstacles" : ""} · {unit.cost} gold each</small>
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
