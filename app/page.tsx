"use client";

import { useMemo, useState } from "react";
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
  chooseResearch,
  startResearch,
  buildInCity,
  attackCombatStack,
  combatCanAttack,
  combatReachable,
  defendCombatTurn,
  moveCombatStack,
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
} from "./game-core.js";

const tileGlyph: Record<string, string> = { forest: "♣", hill: "▲" };

type ResearchChoice = { id: string; name: string; icon: string; cost: number; bonus: number; description: string };
type Settlement = { id: string; name: string; tile: number; owner: string; population: number; defenders: number; recruits: Record<string, number>; garrison?: number };
type Producer = { id: string; name: string; kind: string; resource: string; amount: number; footprint: number[]; entrance: number; owner: string; garrison: number };
type CombatStack = { id: string; side: "player" | "enemy"; unitId: string; position: number; totalHealth: number; shots: number; waited: boolean; defending: boolean; retaliated: boolean; done: boolean };
type CombatState = {
  width: number; height: number; round: number; activeStackId: string | null; result: "victory" | "defeat" | "retreat" | null;
  battle: {type: string; settlementId?: string; producerId?: string; name: string; strength: number};
  stacks: CombatStack[]; obstacles: {tile: number; kind: string}[]; log: string[];
};
type GameState = {
  year: number; month: number; monthName: string; era: string; hero: number; moves: number;
  gold: number; wood: number; stone: number; magicDust: number; research: number; cities: number; victories: number;
  army: Record<string, number>; techs: string[]; buildings: Record<string, string[]>; activeResearch: string | null;
  constructionThisTurn: Record<string, boolean>;
  techProgress: Record<string, number>; researchChoice: ResearchChoice[] | null;
  pendingBattle: {type: string; settlementId?: string; producerId?: string; name: string; strength: number} | null;
  combat: CombatState | null;
  settlements: Record<string, Settlement>; sites: Record<number, string>;
  producers: Record<string, Producer>;
  pickups: Record<number, string>; notice: string; log: string[];
};

export default function Home() {
  const [game, setGame] = useState<GameState>(() => createGame());
  const [panel, setPanel] = useState<"research" | "cities">("research");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const [plannedPath, setPlannedPath] = useState<number[]>([]);
  const [plannedTarget, setPlannedTarget] = useState<number | null>(null);
  const readiness = useMemo(() => eraReadiness(game), [game]);
  const activeCity = panel === "cities" && selectedCity ? game.settlements[selectedCity] : null;

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
    setGame((current) => moveAlongPath(current, command.path));
    setPlannedPath([]);
    setPlannedTarget(null);
    if (city?.owner === "player") { setPanel("cities"); setSelectedCity(city.id); }
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
            <Army name="Spearmen" count={game.army.spearmen} icon="♙" />
            <Army name="Slingers" count={game.army.slingers} icon="◉" />
            <Army name="Scouts" count={game.army.scouts} icon="♞" />
            {game.army.swordsmen > 0 && <Army name="Swordsmen" count={game.army.swordsmen} icon="⚔" />}
            {game.army.horsemen > 0 && <Army name="Horsemen" count={game.army.horsemen} icon="♞" />}
          </div>
          <div className="movement">
            <span>Movement</span><strong>{game.moves}/{MAX_MOVEMENT}</strong>
            <div><i style={{ width: `${game.moves / MAX_MOVEMENT * 100}%` }} /></div>
          </div>
          <button className="ghost-button" onClick={() => setLogOpen(!logOpen)}>Campaign chronicle</button>
          {logOpen && <ol className="chronicle">{game.log.slice(-5).reverse().map((entry, i) => <li key={i}>{entry}</li>)}</ol>}
        </aside>

        <section className="map-wrap" aria-label="Campaign map">
          <div className="map-caption"><span>THE WESTERN MARCHES</span><b>Early Spring · Clear skies</b></div>
          <div className="map-grid" style={{gridTemplateColumns: `repeat(${MAP_WIDTH}, 1fr)`, gridTemplateRows: `repeat(${MAP_HEIGHT}, 1fr)`}} onContextMenu={(event) => event.preventDefault()}>
            <svg className="terrain-layer" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
              <path className="river-bank" d="M 16.6 0 C 17.5 2.2 16.35 4.1 17.2 6.1 C 18 8 16.45 9.7 17.1 12 L 20 12 L 20 0 Z" />
              <path className="river-shine" d="M 17.25 0 C 18 2.3 16.9 4.2 17.75 6.2 C 18.4 8 17.15 10.2 17.8 12" />
              <path className="road-shadow" d="M 5.2 0 C 9 2.1 5.3 4.5 4.3 6.3 C 3.2 8.3 6.3 10.2 5.1 12" />
              <path className="road-ribbon" d="M 5.2 0 C 9 2.1 5.3 4.5 4.3 6.3 C 3.2 8.3 6.3 10.2 5.1 12" />
            </svg>
            {BOARD.map((tile, index) => {
              const pickup = game.pickups[index];
              const site = game.sites[index];
              const city = settlementAt(game, index) as Settlement | null;
              const producer = producerAt(game, index) as Producer | null;
              const onPath = plannedPath.includes(index);
              const description = `${tile}${pickup ? `, ${pickup}` : ""}${city ? `, ${city.name}${city.owner === "neutral" ? ", guarded" : ""}` : ""}${site ? ", raiders" : ""}${producer ? `, ${producer.name}, ${producer.owner === "neutral" ? "guarded" : "controlled"}` : ""}`;
              return (
                <button
                  key={index}
                  data-tile={index}
                  className={`map-tile ${tile} ${onPath ? "path-step" : ""} ${plannedTarget === index ? "path-target" : ""} ${game.hero === index ? "hero-tile" : ""}`}
                  onClick={(event) => event.preventDefault()}
                  onContextMenu={(event) => { event.preventDefault(); handleRoute(index); }}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handleRoute(index); } }}
                  title={description}
                  aria-label={`Map position ${index + 1}, ${description}. Press Enter twice or right-click twice to travel here.`}
                >
                  {tileGlyph[tile] && index % 3 === 0 && <span className="terrain-glyph" aria-hidden="true">{tileGlyph[tile]}</span>}
                  {pickup === "knowledge" && <span className="site knowledge" aria-hidden="true"><b>⌂</b></span>}
                  {pickup === "timber" && <span className="site pickup" aria-hidden="true"><b>▰</b></span>}
                  {pickup === "stone" && <span className="site pickup stone" aria-hidden="true"><b>⬟</b></span>}
                  {pickup === "dust" && <span className="site pickup dust" aria-hidden="true"><b>✧</b></span>}
                  {pickup === "gold" && <span className="site pickup gold" aria-hidden="true"><b>◆</b></span>}
                  {city?.id === "aurum" && <span className="site capital" aria-hidden="true"><b>♜</b></span>}
                  {city?.id === "freehaven" && <span className={`site city ${city.owner}`} aria-hidden="true"><b>♜</b>{city.owner === "neutral" && <i>⚑</i>}</span>}
                  {site === "raiders" && <span className="site enemy" aria-hidden="true"><b>⚑</b></span>}
                  {game.hero === index && <span className="hero" aria-hidden="true"><b>♞</b></span>}
                </button>
              );
            })}
            {plannedPath.length > 0 && <svg className="route-layer" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
              <polyline points={[game.hero, ...plannedPath].map((tile) => `${tile % MAP_WIDTH + .5},${Math.floor(tile / MAP_WIDTH) + .5}`).join(" ")} />
              {plannedPath.map((tile) => <circle key={tile} cx={tile % MAP_WIDTH + .5} cy={Math.floor(tile / MAP_WIDTH) + .5} r=".09" />)}
            </svg>}
            {Object.values(game.producers).map((producer) => <div key={producer.id} className={`map-producer ${producer.kind} ${producer.owner}`} style={producerBounds(producer.footprint)} aria-hidden="true">
              <span>{producer.kind === "sawmill" ? "▥" : "⬟"}</span>
              {producer.owner === "neutral" && <i>⚑</i>}
            </div>)}
          </div>
          <div className="legend" aria-live="polite"><span><i className="route-swatch" />{plannedPath.length ? `${plannedPath.length} movement plotted` : "Right-click once to plot a route"}</span><span>Right-click the same destination again to travel</span><span>Keyboard: press Enter twice</span></div>
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
                {RESEARCH.map((tech) => {
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
              <button className="advance-button" disabled={!readiness.ready}>Advance to the Classical Age</button>
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
            <p>Enemy strength: {game.pendingBattle.strength}. Defeat the guarding force to take lasting control of this location.</p>
            <button className="battle-button" onClick={() => setGame(g => startCombat(g))}>Deploy on the battlefield</button>
          </section>
        </div>
      )}
    </main>
  );
}

function CombatScreen({game, updateGame}: {game: GameState; updateGame: React.Dispatch<React.SetStateAction<GameState>>}) {
  const combat = game.combat!;
  const active = combat.stacks.find(stack => stack.id === combat.activeStackId) ?? null;
  const activeUnit = active ? UNITS.find(unit => unit.id === active.unitId) : null;
  const reachable = new Set(active?.side === "player" ? combatReachable(combat, active.id) : []);
  const attackable = new Set(combat.stacks
    .filter(stack => active && stack.side !== active.side && stackCount(stack) > 0 && combatCanAttack(combat, active.id, stack.id))
    .map(stack => stack.id));
  const obstacles = new Map(combat.obstacles.map(obstacle => [obstacle.tile, obstacle.kind]));
  const stackAt = new Map(combat.stacks.filter(stack => stackCount(stack) > 0).map(stack => [stack.position, stack]));
  const turnOrder = [...combat.stacks].filter(stack => stackCount(stack) > 0).sort((a, b) => {
    const aUnit = UNITS.find(unit => unit.id === a.unitId)!;
    const bUnit = UNITS.find(unit => unit.id === b.unitId)!;
    return bUnit.initiative - aUnit.initiative || (a.side === "player" ? -1 : 1);
  });
  const playerAlive = combat.stacks.filter(stack => stack.side === "player" && stackCount(stack) > 0);
  const enemyAlive = combat.stacks.filter(stack => stack.side === "enemy" && stackCount(stack) > 0);
  const obstacleGlyph: Record<string, string> = { tree: "♣", boulder: "⬟", timber: "▰", cart: "▥", barricade: "╫", rubble: "▦" };

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
          const unit = UNITS.find(item => item.id === stack.unitId)!;
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
          {combat.result ? "The engagement is over." : active && activeUnit ? <><b>{activeUnit.name} act now.</b> Gold hexes are movement; red targets can be attacked.</> : "Resolving the enemy turn…"}
        </div>
        <div className="hex-battlefield" style={{gridTemplateColumns: `repeat(${COMBAT_WIDTH * 2 + 1}, 1fr)`, gridTemplateRows: `repeat(${COMBAT_HEIGHT}, 1fr)`}}>
          {Array.from({length: COMBAT_WIDTH * COMBAT_HEIGHT}, (_, tile) => {
            const row = Math.floor(tile / COMBAT_WIDTH), col = tile % COMBAT_WIDTH;
            const stack = stackAt.get(tile);
            const obstacle = obstacles.get(tile);
            const canAttack = stack ? attackable.has(stack.id) : false;
            const canMove = !stack && reachable.has(tile);
            const unit = stack ? UNITS.find(item => item.id === stack.unitId)! : null;
            const label = obstacle ? `Impassable ${obstacle}` : stack && unit ? `${stack.side === "player" ? "Allied" : "Enemy"} ${unit.name}, ${stackCount(stack)} remaining${canAttack ? ", attack available" : ""}` : `Battlefield hex ${tile + 1}${canMove ? ", movement available" : ""}`;
            return <button
              key={tile}
              className={`combat-hex ${canMove ? "reachable" : ""} ${canAttack ? "attackable" : ""} ${stack?.id === combat.activeStackId ? "active-stack" : ""} ${obstacle ? "blocked" : ""}`}
              style={{gridColumn: `${col * 2 + (row % 2) + 1} / span 2`, gridRow: row + 1}}
              onClick={() => handleHex(tile, stack)}
              aria-label={label}
              disabled={Boolean(combat.result) || Boolean(obstacle) || (!canMove && !canAttack)}
              title={label}
            >
              {obstacle && <span className={`combat-obstacle ${obstacle}`} aria-hidden="true">{obstacleGlyph[obstacle]}</span>}
              {stack && unit && <span className={`combat-unit ${stack.side}`} aria-hidden="true"><i>{unit.icon}</i><b>{stackCount(stack)}</b>{stack.defending && <em>⛨</em>}{stack.waited && !stack.done && <em>⌛</em>}</span>}
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
      <div>{active && activeUnit && !combat.result ? <><span>{activeUnit.icon}</span><b>{activeUnit.name}</b><small>Speed {activeUnit.speed} · Attack {activeUnit.attack} · Defense {activeUnit.defense}{activeUnit.ranged ? ` · ${active.shots} shots` : ""}</small></> : <><span>⚔</span><b>Battle resolved</b><small>Review the result before returning to the campaign.</small></>}</div>
      <button disabled={!active || active.side !== "player" || active.waited || Boolean(combat.result)} onClick={() => updateGame(waitCombatTurn)}>⌛ Wait</button>
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

function stackCount(stack: CombatStack) {
  const unit = UNITS.find(item => item.id === stack.unitId)!;
  return stack.totalHealth > 0 ? Math.ceil(stack.totalHealth / unit.health) : 0;
}

function CombatStackCard({stack, active}: {stack: CombatStack; active: boolean}) {
  const unit = UNITS.find(item => item.id === stack.unitId)!;
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

function CitiesPanel({game, selectCity}: {game: GameState; selectCity: (id: string | null) => void}) {
  const owned = Object.values(game.settlements).filter(city => city.owner === "player");
  return <>
    <p className="section-kicker">Your settlements</p><h2>Cities</h2>
    <p className="muted">Select a city to leave the adventure map and enter its full management screen.</p>
    <div className="city-list">{owned.map(item => <button key={item.id} onClick={() => selectCity(item.id)}><span>♜</span><div><b>{item.name}</b><small>Population {item.population.toLocaleString()} · Defense {cityDefense(game, item.id)} · {game.hero === item.tile ? "Commander present" : "Commander away"}</small></div><em>Enter city →</em></button>)}</div>
  </>;
}

function CityScreen({game, city, updateGame, exitCity}: {game: GameState; city: Settlement; updateGame: React.Dispatch<React.SetStateAction<GameState>>; exitCity: () => void}) {
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
        <div className="recruit-buildings">{UNITS.map(unit => {
          const source = BUILDINGS.find(building => building.id === unit.requires);
          const unlocked = cityBuildings.includes(unit.requires);
          return <article key={unit.id} className={!unlocked ? "locked" : ""}>
            <header><span>{source?.icon}</span><div><b>{source?.name}</b><small>{unlocked ? "Operational" : "Not constructed"}</small></div></header>
            <div className="recruit-unit"><span>{unit.icon}</span><div><b>{unit.name}</b><small>Tier {unit.tier} · {city.recruits[unit.id]} available</small></div></div>
            <button disabled={!unlocked || !present || city.recruits[unit.id] < 1 || game.gold < unit.cost} onClick={() => updateGame(g => recruitFromCity(g, city.id, unit.id))}>{unlocked ? `Recruit 1 · ${unit.cost} ◆` : "Building required"}</button>
          </article>;
        })}</div>
        <div className="guard-card"><span>⛨</span><div><b>Permanent city guard</b><small>{city.defenders} troops · Cannot join a hero</small></div></div>
      </aside>
      <section className="city-construction">
        <div className="construction-heading"><div><p className="section-kicker">Construction tree</p><h3>Develop {city.name}</h3><p className={`construction-status ${constructionUsed ? "used" : "available"}`}>{constructionUsed ? "Construction complete for this turn. End the month to build again." : "Construction available: this city may complete one building this turn."}</p></div><div className="tree-legend"><span>Economy</span><span>Civic</span><span>Military</span><span>Defense</span></div></div>
        <div className="construction-tree full-tree">{BUILDINGS.map(building => {
          const built = cityBuildings.includes(building.id);
          const prerequisitesMet = building.requires.every(required => cityBuildings.includes(required));
          const affordable = game.gold >= building.gold && game.wood >= building.wood && game.stone >= building.stone;
          const requirementNames = building.requires.map(required => BUILDINGS.find(item => item.id === required)?.name).join(" + ");
          return <article className={`build-node ${building.branch} ${built ? "built" : ""} ${!prerequisitesMet ? "locked" : ""}`} style={{gridColumn: building.x, gridRow: building.y}} key={building.id}>
            <header><span>{building.icon}</span><div><b>{building.name}</b><em>Tier {building.tier}</em></div></header>
            <small>{building.description}</small>
            {!built && !prerequisitesMet && <p>Requires {requirementNames}</p>}
            {built ? <strong>✓ Built</strong> : <button disabled={constructionUsed || !prerequisitesMet || !affordable} title={constructionUsed ? "This city has already completed a building this turn" : undefined} onClick={() => updateGame(g => buildInCity(g, city.id, building.id))}>{constructionUsed ? "Built this turn" : <>{building.gold} ◆ {building.wood > 0 && `· ${building.wood} ▰`} {building.stone > 0 && `· ${building.stone} ⬟`}</>}</button>}
          </article>;
        })}</div>
      </section>
    </div>
  </section>;
}
