"use client";

import { useMemo, useState } from "react";
import {
  BOARD,
  BUILDINGS,
  RESEARCH,
  createGame,
  canMoveTo,
  advanceMonth,
  collectAt,
  chooseResearch,
  buildInCapital,
  eraReadiness,
} from "./game-core.js";

const tileGlyph: Record<string, string> = {
  plains: "·",
  forest: "♣",
  hill: "▲",
  water: "≈",
  road: "═",
};

type ResearchChoice = { id: string; name: string; icon: string; bonus: number; description: string };
type GameState = {
  year: number; month: number; monthName: string; era: string; hero: number; moves: number;
  gold: number; wood: number; food: number; research: number; cities: number; victories: number;
  techs: string[]; buildings: string[]; researchChoice: ResearchChoice[] | null;
  pickups: Record<number, string>; notice: string; log: string[];
};

export default function Home() {
  const [game, setGame] = useState<GameState>(() => createGame());
  const [panel, setPanel] = useState<"research" | "city">("research");
  const [logOpen, setLogOpen] = useState(false);
  const readiness = useMemo(() => eraReadiness(game), [game]);

  function move(index: number) {
    if (!canMoveTo(game, index)) return;
    setGame((current) => collectAt({ ...current, hero: index, moves: current.moves - 1 }));
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
          <Resource icon="●" value={game.food} label="Food" />
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
            <Army name="Spearmen" count={24} icon="♙" />
            <Army name="Slingers" count={16} icon="◉" />
            <Army name="Scouts" count={7} icon="♞" />
          </div>
          <div className="movement">
            <span>Movement</span><strong>{game.moves}/5</strong>
            <div><i style={{ width: `${game.moves * 20}%` }} /></div>
          </div>
          <button className="ghost-button" onClick={() => setLogOpen(!logOpen)}>Campaign chronicle</button>
          {logOpen && <ol className="chronicle">{game.log.slice(-5).reverse().map((entry, i) => <li key={i}>{entry}</li>)}</ol>}
        </aside>

        <section className="map-wrap" aria-label="Campaign map">
          <div className="map-caption"><span>THE WESTERN MARCHES</span><b>Early Spring · Clear skies</b></div>
          <div className="map-grid">
            {BOARD.map((tile, index) => {
              const occupant = (game.pickups as Record<number, string>)[index];
              const reachable = canMoveTo(game, index);
              return (
                <button
                  key={index}
                  className={`map-tile ${tile} ${reachable ? "reachable" : ""} ${game.hero === index ? "hero-tile" : ""}`}
                  onClick={() => move(index)}
                  aria-label={`Map position ${index + 1}, ${tile}${occupant ? `, ${occupant}` : ""}`}
                >
                  <span className="terrain-glyph">{tileGlyph[tile]}</span>
                  {occupant === "knowledge" && <span className="site knowledge"><b>⌂</b><em>KNOWLEDGE HUT</em></span>}
                  {occupant === "timber" && <span className="site pickup"><b>▰</b><em>TIMBER</em></span>}
                  {occupant === "food" && <span className="site pickup food"><b>●</b><em>PROVISIONS</em></span>}
                  {occupant === "city" && <span className="site city"><b>♜</b><em>FREE TOWN</em></span>}
                  {occupant === "enemy" && <span className="site enemy"><b>⚑</b><em>RAIDERS</em></span>}
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
            <button className={panel === "city" ? "active" : ""} onClick={() => setPanel("city")}>Aurum</button>
          </div>
          {panel === "research" ? (
            <>
              <p className="section-kicker">Current age</p>
              <h2>{game.era} Age</h2>
              <p className="muted">Complete the age&apos;s knowledge and prove your civilization is ready to advance.</p>
              <div className="research-meter"><span><i style={{width: `${Math.min(100, game.research / 10)}%`}} /></span><b>{game.research}/1,000</b></div>
              <div className="tech-list">
                {RESEARCH.map((tech) => <div key={tech.id} className={game.techs.includes(tech.id) ? "tech done" : "tech"}><span>{game.techs.includes(tech.id) ? "✓" : tech.icon}</span><div><b>{tech.name}</b><small>{tech.description}</small></div></div>)}
              </div>
              <p className="section-kicker readiness-title">Era readiness</p>
              <ul className="checklist">{readiness.checks.map((item) => <li key={item.label} className={item.met ? "met" : ""}><span>{item.met ? "✓" : "○"}</span>{item.label}</li>)}</ul>
              <button className="advance-button" disabled={!readiness.ready}>Advance to the Classical Age</button>
            </>
          ) : (
            <>
              <p className="section-kicker">Capital city</p><h2>Aurum</h2>
              <p className="muted">Population 1,240 · Produces 75 gold each month</p>
              <div className="building-list">
                {BUILDINGS.map((building) => <div className={game.buildings.includes(building.id) ? "building built" : "building"} key={building.id}><div><b>{building.name}</b><small>{building.description}</small></div>{game.buildings.includes(building.id) ? <span>Built</span> : <button disabled={game.gold < building.cost} onClick={() => setGame(g => buildInCapital(g, building.id))}>{building.cost} ◆</button>}</div>)}
              </div>
            </>
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
    </main>
  );
}

function Resource({icon, value, label}: {icon: string; value: number; label: string}) {
  return <div title={label}><span>{icon}</span><b>{value.toLocaleString()}</b><small>{label}</small></div>;
}
function Stat({value, label}: {value: string; label: string}) { return <div><b>{value}</b><span>{label}</span></div>; }
function Army({name, count, icon}: {name: string; count: number; icon: string}) { return <div className="army-row"><span>{icon}</span><div><b>{name}</b><small>{count} troops</small></div></div>; }
