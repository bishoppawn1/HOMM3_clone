"use client";

import { useMemo, useState } from "react";
import {
  BOARD,
  BUILDINGS,
  MAP_WIDTH,
  MAX_MOVEMENT,
  RESEARCH,
  UNITS,
  createGame,
  canMoveTo,
  advanceMonth,
  collectAt,
  chooseResearch,
  startResearch,
  buildInCity,
  recruitFromCity,
  resolveBattle,
  settlementAt,
  eraReadiness,
} from "./game-core.js";

const tileGlyph: Record<string, string> = {
  plains: "·",
  forest: "♣",
  hill: "▲",
  water: "≈",
  road: "═",
};

type ResearchChoice = { id: string; name: string; icon: string; cost: number; bonus: number; description: string };
type Settlement = { id: string; name: string; tile: number; owner: string; population: number; recruits: Record<string, number>; garrison?: number };
type GameState = {
  year: number; month: number; monthName: string; era: string; hero: number; moves: number;
  gold: number; wood: number; stone: number; magicDust: number; research: number; cities: number; victories: number;
  army: Record<string, number>; techs: string[]; buildings: Record<string, string[]>; activeResearch: string | null;
  techProgress: Record<string, number>; researchChoice: ResearchChoice[] | null;
  pendingBattle: {type: string; settlementId?: string; name: string; strength: number} | null;
  settlements: Record<string, Settlement>; sites: Record<number, string>;
  pickups: Record<number, string>; notice: string; log: string[];
};

export default function Home() {
  const [game, setGame] = useState<GameState>(() => createGame());
  const [panel, setPanel] = useState<"research" | "cities">("research");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const readiness = useMemo(() => eraReadiness(game), [game]);

  function move(index: number) {
    if (!canMoveTo(game, index)) return;
    const city = settlementAt(game, index) as Settlement | null;
    setGame((current) => collectAt({ ...current, hero: index, moves: current.moves - 1 }));
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
            {game.army.guards > 0 && <Army name="Guards" count={game.army.guards} icon="⛨" />}
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
          <div className="map-grid" style={{gridTemplateColumns: `repeat(${MAP_WIDTH}, 1fr)`}}>
            {BOARD.map((tile, index) => {
              const pickup = game.pickups[index];
              const site = game.sites[index];
              const city = settlementAt(game, index) as Settlement | null;
              const reachable = canMoveTo(game, index);
              return (
                <button
                  key={index}
                  className={`map-tile ${tile} ${reachable ? "reachable" : ""} ${game.hero === index ? "hero-tile" : ""}`}
                  onClick={() => move(index)}
                  aria-label={`Map position ${index + 1}, ${tile}${pickup ? `, ${pickup}` : ""}${city ? `, ${city.name}` : ""}`}
                >
                  <span className="terrain-glyph">{tileGlyph[tile]}</span>
                  {pickup === "knowledge" && <span className="site knowledge"><b>⌂</b><em>KNOWLEDGE HUT</em></span>}
                  {pickup === "timber" && <span className="site pickup"><b>▰</b><em>TIMBER</em></span>}
                  {pickup === "stone" && <span className="site pickup stone"><b>⬟</b><em>STONE</em></span>}
                  {pickup === "dust" && <span className="site pickup dust"><b>✧</b><em>MAGICAL DUST</em></span>}
                  {pickup === "gold" && <span className="site pickup gold"><b>◆</b><em>GOLD</em></span>}
                  {city?.id === "aurum" && <span className="site capital"><b>♜</b><em>AURUM</em></span>}
                  {city?.id === "freehaven" && <span className={`site city ${city.owner}`}><b>♜</b><em>{city.owner === "player" ? "FREEHAVEN" : "FREEHAVEN · GUARDED"}</em></span>}
                  {site === "raiders" && <span className="site enemy"><b>⚑</b><em>RAIDERS</em></span>}
                  {game.hero === index && <span className="hero"><b>♞</b><em>VALE</em></span>}
                </button>
              );
            })}
          </div>
          <div className="legend"><span><i className="dot reachable-dot" />Within movement range</span><span><i className="dot explored-dot" />Explored territory</span><span>Click an adjacent tile to travel</span></div>
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
            <CitiesPanel game={game} selectedCity={selectedCity} selectCity={setSelectedCity} updateGame={setGame} />
          )}
        </aside>
      </section>

      <footer className="turnbar">
        <div><span className="section-kicker">Month&apos;s report</span><p>{game.notice}</p></div>
        <button onClick={() => setGame(advanceMonth)}><span>End {game.monthName}</span><small>Begin the next month →</small></button>
      </footer>

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
      {game.pendingBattle && (
        <div className="modal-backdrop" role="presentation">
          <section className="choice-modal battle-modal" role="dialog" aria-modal="true" aria-labelledby="battle-title">
            <span className="discovery-mark">⚔</span><p className="section-kicker">Battle required</p>
            <h2 id="battle-title">{game.pendingBattle.name} blocks your advance</h2>
            <p>Enemy strength: {game.pendingBattle.strength}. Settlements are never pickups—their garrison must be defeated before the city becomes yours.</p>
            <button className="battle-button" onClick={() => setGame(g => resolveBattle(g))}>Fight for control</button>
          </section>
        </div>
      )}
    </main>
  );
}

function Resource({icon, value, label}: {icon: string; value: number; label: string}) {
  return <div title={label}><span>{icon}</span><b>{value.toLocaleString()}</b><small>{label}</small></div>;
}
function Stat({value, label}: {value: string; label: string}) { return <div><b>{value}</b><span>{label}</span></div>; }
function Army({name, count, icon}: {name: string; count: number; icon: string}) { return <div className="army-row"><span>{icon}</span><div><b>{name}</b><small>{count} troops</small></div></div>; }

function CitiesPanel({game, selectedCity, selectCity, updateGame}: {game: GameState; selectedCity: string | null; selectCity: (id: string | null) => void; updateGame: React.Dispatch<React.SetStateAction<GameState>>}) {
  const owned = Object.values(game.settlements).filter(city => city.owner === "player");
  const city = selectedCity ? game.settlements[selectedCity] : null;
  if (!city || city.owner !== "player") return <>
    <p className="section-kicker">Your settlements</p><h2>Cities</h2>
    <p className="muted">Select a city to manage its buildings and available recruits.</p>
    <div className="city-list">{owned.map(item => <button key={item.id} onClick={() => selectCity(item.id)}><span>♜</span><div><b>{item.name}</b><small>Population {item.population.toLocaleString()} · {game.hero === item.tile ? "Commander present" : "Commander away"}</small></div><em>Enter →</em></button>)}</div>
  </>;
  const present = game.hero === city.tile;
  const cityBuildings = game.buildings[city.id] ?? [];
  return <>
    <button className="back-button" onClick={() => selectCity(null)}>← All cities</button>
    <p className="section-kicker">City administration</p><h2>{city.name}</h2>
    <p className="muted">Population {city.population.toLocaleString()} · Produces 75 gold each month</p>
    <div className={`commander-presence ${present ? "present" : "away"}`}>{present ? "Marcellus is inside the city and may recruit." : "Move Marcellus onto this city to recruit troops."}</div>
    <p className="section-kicker city-subhead">Available troops</p>
    <div className="recruit-list">{UNITS.map(unit => {
      const unlocked = cityBuildings.includes(unit.requires);
      return <div key={unit.id} className={!unlocked ? "unit-locked" : ""}><span>{unit.icon}</span><div><b>{unit.name} <em>Tier {unit.tier}</em></b><small>{unlocked ? `${city.recruits[unit.id]} available · ${unit.cost} gold each` : `Requires ${BUILDINGS.find(building => building.id === unit.requires)?.name}`}</small></div><button disabled={!unlocked || !present || city.recruits[unit.id] < 1 || game.gold < unit.cost} onClick={() => updateGame(g => recruitFromCity(g, city.id, unit.id))}>{unlocked ? "Recruit 1" : "Locked"}</button></div>;
    })}</div>
    <p className="section-kicker city-subhead">Construction</p>
    <div className="tree-legend"><span>Civic development</span><span>Military development</span></div>
    <div className="construction-tree">{BUILDINGS.map(building => {
      const built = cityBuildings.includes(building.id);
      const prerequisitesMet = building.requires.every(required => cityBuildings.includes(required));
      const affordable = game.gold >= building.gold && game.wood >= building.wood && game.stone >= building.stone;
      const requirementNames = building.requires.map(required => BUILDINGS.find(item => item.id === required)?.name).join(" + ");
      return <article className={`build-node ${building.branch} ${built ? "built" : ""} ${!prerequisitesMet ? "locked" : ""}`} style={{gridColumn: building.x, gridRow: building.y}} key={building.id}>
        <header><span>{building.icon}</span><div><b>{building.name}</b><em>Tier {building.tier}</em></div></header>
        <small>{building.description}</small>
        {!built && !prerequisitesMet && <p>Requires {requirementNames}</p>}
        {built ? <strong>✓ Built</strong> : <button disabled={!prerequisitesMet || !affordable} onClick={() => updateGame(g => buildInCity(g, city.id, building.id))}>{building.gold} ◆ {building.wood > 0 && `· ${building.wood} ▰`} {building.stone > 0 && `· ${building.stone} ⬟`}</button>}
      </article>;
    })}</div>
  </>;
}
