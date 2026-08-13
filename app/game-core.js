export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MAP_WIDTH = 20;
export const MAP_HEIGHT = 12;
export const MAX_MOVEMENT = 16;

const terrainRows = [
  "fffffppppppphhhhhwww",
  "ffffppprrrppphhhhwww",
  "fffpppprrppppphhhwww",
  "ffpppprrrppffffppwww",
  "fpppprpppppffffppwww",
  "pppprrpphhfffppppwww",
  "ppprrrppphhpfppppwww",
  "hppprppppppppppppwww",
  "hhpprppffffppppppwww",
  "fppprppffffphhhppwww",
  "ffpprpppppphhhhppwww",
  "ffffppppppphhhhhpwww",
];
const terrainKey = { f: "forest", p: "plains", h: "hill", r: "road", w: "water" };
export const BOARD = terrainRows.join("").split("").map((key) => terrainKey[key]);

export const RESEARCH = [
  { id: "surveying", name: "Surveying", icon: "⌖", cost: 180, bonus: 90, description: "Improves travel and reveals nearby territory." },
  { id: "bronze", name: "Bronze Working", icon: "⚒", cost: 220, bonus: 110, description: "Unlocks stronger arms and civic tools." },
  { id: "records", name: "Written Records", icon: "≡", cost: 260, bonus: 130, description: "Improves administration and research." },
];

export const BUILDINGS = [
  { id: "town-hall", name: "Town Hall", icon: "♜", tier: 1, branch: "civic", x: 2, y: 1, gold: 0, wood: 0, stone: 0, requires: [], description: "+75 gold each month." },
  { id: "militia-yard", name: "Militia Yard", icon: "⚑", tier: 1, branch: "military", x: 6, y: 1, gold: 0, wood: 0, stone: 0, requires: [], description: "Recruits Spearmen." },
  { id: "market", name: "Market", icon: "¤", tier: 2, branch: "economy", x: 1, y: 2, gold: 260, wood: 10, stone: 0, requires: ["town-hall"], description: "+25 gold each month." },
  { id: "mason-yard", name: "Mason's Yard", icon: "⬟", tier: 2, branch: "economy", x: 2, y: 2, gold: 240, wood: 14, stone: 0, requires: ["town-hall"], description: "+8 stone each month. Costs timber, not stone." },
  { id: "archive", name: "Scribes' Archive", icon: "≡", tier: 2, branch: "civic", x: 3, y: 2, gold: 410, wood: 10, stone: 8, requires: ["town-hall"], description: "+25 research each month." },
  { id: "city-hall", name: "City Hall", icon: "♛", tier: 2, branch: "civic", x: 4, y: 2, gold: 450, wood: 15, stone: 15, requires: ["town-hall"], description: "Upgrades the settlement to city tier II." },
  { id: "archery-range", name: "Archery Range", icon: "◉", tier: 2, branch: "military", x: 5, y: 2, gold: 300, wood: 18, stone: 4, requires: ["militia-yard"], description: "Recruits Slingers." },
  { id: "scout-camp", name: "Scout Camp", icon: "⌖", tier: 2, branch: "military", x: 6, y: 2, gold: 320, wood: 16, stone: 4, requires: ["militia-yard"], description: "Recruits Scouts." },
  { id: "palisade", name: "Palisade", icon: "▥", tier: 2, branch: "defense", x: 7, y: 2, gold: 280, wood: 24, stone: 0, requires: ["town-hall"], description: "+4 city defense." },
  { id: "warehouse", name: "Warehouse", icon: "▰", tier: 3, branch: "economy", x: 1, y: 3, gold: 380, wood: 20, stone: 8, requires: ["market"], description: "+5 timber each month." },
  { id: "bank", name: "Bank", icon: "◆", tier: 3, branch: "economy", x: 2, y: 3, gold: 650, wood: 12, stone: 20, requires: ["market", "city-hall"], description: "+100 gold each month." },
  { id: "workshop", name: "Civic Workshop", icon: "⚒", tier: 3, branch: "civic", x: 3, y: 3, gold: 320, wood: 12, stone: 10, requires: ["mason-yard", "city-hall"], description: "Required civic capacity for the next age." },
  { id: "academy", name: "Academy", icon: "⌘", tier: 3, branch: "civic", x: 4, y: 3, gold: 620, wood: 14, stone: 18, requires: ["archive", "city-hall"], description: "+15 research each month." },
  { id: "barracks-ii", name: "Tier II Barracks", icon: "⚔", tier: 3, branch: "military", x: 5, y: 3, gold: 480, wood: 18, stone: 12, requires: ["militia-yard", "city-hall"], description: "Recruits Swordsmen." },
  { id: "stable", name: "Stable", icon: "♞", tier: 3, branch: "military", x: 6, y: 3, gold: 600, wood: 24, stone: 14, requires: ["scout-camp", "city-hall"], description: "Recruits Horsemen." },
  { id: "garrison", name: "Garrison", icon: "⛨", tier: 3, branch: "defense", x: 7, y: 3, gold: 560, wood: 16, stone: 24, requires: ["palisade", "barracks-ii"], description: "Stations a small permanent defensive guard." },
  { id: "trade-guild", name: "Trade Guild", icon: "⚖", tier: 4, branch: "economy", x: 1, y: 4, gold: 720, wood: 20, stone: 18, requires: ["warehouse", "bank"], description: "+60 gold each month." },
  { id: "foundry", name: "Foundry", icon: "⚙", tier: 4, branch: "economy", x: 2, y: 4, gold: 680, wood: 22, stone: 24, requires: ["workshop"], description: "+8 stone and +4 timber each month." },
  { id: "monument", name: "Monument", icon: "▲", tier: 4, branch: "civic", x: 3, y: 4, gold: 760, wood: 10, stone: 36, requires: ["city-hall", "academy"], description: "Improves civic prestige." },
  { id: "great-library", name: "Great Library", icon: "▤", tier: 4, branch: "civic", x: 4, y: 4, gold: 900, wood: 24, stone: 28, requires: ["academy"], description: "+40 research each month." },
  { id: "training-grounds", name: "Training Grounds", icon: "◎", tier: 4, branch: "military", x: 5, y: 4, gold: 700, wood: 26, stone: 20, requires: ["barracks-ii", "academy"], description: "+1 monthly Swordsman growth." },
  { id: "siege-workshop", name: "Siege Workshop", icon: "☷", tier: 4, branch: "military", x: 6, y: 4, gold: 820, wood: 32, stone: 26, requires: ["foundry", "barracks-ii"], description: "Prepares siege equipment." },
  { id: "stone-walls", name: "Stone Walls", icon: "▦", tier: 4, branch: "defense", x: 7, y: 4, gold: 800, wood: 12, stone: 42, requires: ["garrison"], description: "+10 city defense." },
  { id: "treasury", name: "Treasury", icon: "◇", tier: 5, branch: "economy", x: 1, y: 5, gold: 1100, wood: 20, stone: 30, requires: ["trade-guild"], description: "+200 gold each month." },
  { id: "civic-forum", name: "Civic Forum", icon: "◫", tier: 5, branch: "civic", x: 3, y: 5, gold: 1050, wood: 26, stone: 40, requires: ["monument", "great-library"], description: "Upgrades the city to civic tier III." },
  { id: "war-college", name: "War College", icon: "✥", tier: 5, branch: "military", x: 5, y: 5, gold: 1120, wood: 30, stone: 36, requires: ["training-grounds", "siege-workshop"], description: "Improves advanced troop training." },
  { id: "cavalry-school", name: "Cavalry School", icon: "♘", tier: 5, branch: "military", x: 6, y: 5, gold: 1080, wood: 34, stone: 30, requires: ["stable", "training-grounds"], description: "+1 monthly Horseman growth." },
  { id: "citadel", name: "Citadel", icon: "♝", tier: 5, branch: "defense", x: 7, y: 5, gold: 1250, wood: 24, stone: 54, requires: ["stone-walls", "garrison"], description: "+20 city defense." },
];

export const UNITS = [
  { id: "spearmen", name: "Spearmen", icon: "♙", tier: 1, cost: 24, requires: "militia-yard" },
  { id: "slingers", name: "Slingers", icon: "◉", tier: 1, cost: 32, requires: "archery-range" },
  { id: "scouts", name: "Scouts", icon: "⌖", tier: 1, cost: 55, requires: "scout-camp" },
  { id: "swordsmen", name: "Swordsmen", icon: "⚔", tier: 2, cost: 68, requires: "barracks-ii" },
  { id: "horsemen", name: "Horsemen", icon: "♞", tier: 2, cost: 115, requires: "stable" },
];

export function createGame() {
  return {
    year: 1, month: 3, monthName: MONTHS[2], era: "Ancient", hero: 170, moves: MAX_MOVEMENT,
    gold: 760, wood: 35, stone: 24, magicDust: 3, research: 70, cities: 1, victories: 0,
    army: { spearmen: 24, slingers: 16, scouts: 7, swordsmen: 0, horsemen: 0 },
    techs: [], activeResearch: null, techProgress: {}, researchChoice: null, pendingBattle: null,
    constructionThisTurn: {},
    buildings: { aurum: ["town-hall", "militia-yard", "archery-range", "scout-camp"], freehaven: ["town-hall", "militia-yard"] },
    settlements: {
      aurum: { id: "aurum", name: "Aurum", tile: 130, owner: "player", population: 1240, defenders: 0, recruits: { spearmen: 12, slingers: 8, scouts: 3, swordsmen: 0, horsemen: 0 } },
      freehaven: { id: "freehaven", name: "Freehaven", tile: 75, owner: "neutral", population: 680, defenders: 0, recruits: { spearmen: 8, slingers: 5, scouts: 2, swordsmen: 0, horsemen: 0 }, garrison: 26 },
    },
    producers: {
      pinewater: { id: "pinewater", name: "Pinewater Sawmill", kind: "sawmill", resource: "wood", amount: 10, footprint: [41, 42, 61, 62], entrance: 62, owner: "neutral", garrison: 24 },
      redcliff: { id: "redcliff", name: "Redcliff Quarry", kind: "quarry", resource: "stone", amount: 8, footprint: [172, 173, 174, 192, 193, 194], entrance: 193, owner: "neutral", garrison: 32 },
    },
    sites: { 112: "raiders" },
    pickups: { 34: "dust", 44: "knowledge", 103: "timber", 216: "stone", 207: "gold" },
    notice: "Aurum yielded 75 gold. Choose a technology or save your research points.",
    log: ["The campaign began in Year 1.", "Marcellus Vale departed Aurum."],
  };
}

export function settlementAt(game, tile) {
  return Object.values(game.settlements).find((settlement) => settlement.tile === tile) ?? null;
}

export function producerAt(game, tile) {
  return Object.values(game.producers ?? {}).find((producer) => producer.footprint.includes(tile)) ?? null;
}

function destinationFor(game, tile) {
  const producer = producerAt(game, tile);
  return producer?.entrance ?? tile;
}

function isPassable(game, tile) {
  if (tile < 0 || tile >= BOARD.length || BOARD[tile] === "water") return false;
  const producer = producerAt(game, tile);
  return !producer || producer.entrance === tile;
}

export function canMoveTo(game, index) {
  if (game.moves <= 0 || game.researchChoice || game.pendingBattle) return false;
  const fromRow = Math.floor(game.hero / MAP_WIDTH), fromCol = game.hero % MAP_WIDTH;
  const row = Math.floor(index / MAP_WIDTH), col = index % MAP_WIDTH;
  return isPassable(game, index) && Math.abs(fromRow - row) + Math.abs(fromCol - col) === 1;
}

export function findPath(game, requestedTile) {
  if (game.moves <= 0 || game.researchChoice || game.pendingBattle) return null;
  const target = destinationFor(game, requestedTile);
  if (target === game.hero || !isPassable(game, target)) return null;
  const queue = [game.hero];
  const previous = new Map([[game.hero, null]]);
  const distance = new Map([[game.hero, 0]]);
  while (queue.length) {
    const current = queue.shift();
    const row = Math.floor(current / MAP_WIDTH);
    const col = current % MAP_WIDTH;
    const neighbors = [
      row > 0 ? current - MAP_WIDTH : -1,
      col < MAP_WIDTH - 1 ? current + 1 : -1,
      row < MAP_HEIGHT - 1 ? current + MAP_WIDTH : -1,
      col > 0 ? current - 1 : -1,
    ];
    for (const neighbor of neighbors) {
      if (neighbor < 0 || previous.has(neighbor) || !isPassable(game, neighbor)) continue;
      const nextDistance = distance.get(current) + 1;
      if (nextDistance > game.moves) continue;
      previous.set(neighbor, current);
      distance.set(neighbor, nextDistance);
      if (neighbor === target) {
        const path = [];
        let step = target;
        while (step !== game.hero) {
          path.unshift(step);
          step = previous.get(step);
        }
        return path;
      }
      queue.push(neighbor);
    }
  }
  return null;
}

export function routeCommand(game, plannedTarget, requestedTile) {
  const path = findPath(game, requestedTile);
  if (!path) return { type: "invalid", target: null, path: [] };
  const target = path[path.length - 1];
  return { type: plannedTarget === target ? "travel" : "preview", target, path };
}

export function moveAlongPath(game, path) {
  let next = game;
  for (const tile of path) {
    if (!canMoveTo(next, tile)) break;
    next = collectAt({ ...next, hero: tile, moves: next.moves - 1 });
    if (next.researchChoice || next.pendingBattle) break;
  }
  return next;
}

export function collectAt(game) {
  const settlement = settlementAt(game, game.hero);
  if (settlement) {
    if (settlement.owner === "player") return { ...game, notice: `Marcellus entered ${settlement.name}. Open Cities to recruit its available troops.` };
    return { ...game, pendingBattle: { type: "siege", settlementId: settlement.id, name: settlement.name, strength: settlement.garrison }, notice: `${settlement.name}'s garrison blocks the gates.` };
  }
  const producer = producerAt(game, game.hero);
  if (producer && game.hero === producer.entrance) {
    if (producer.owner === "player") return { ...game, notice: `${producer.name} is under your control and produces ${producer.amount} ${producer.resource === "wood" ? "timber" : producer.resource} each month.` };
    return { ...game, pendingBattle: { type: "producer", producerId: producer.id, name: producer.name, strength: producer.garrison }, notice: `A guarding force holds ${producer.name}.` };
  }
  const site = game.sites[game.hero];
  if (site === "raiders") return { ...game, pendingBattle: { type: "field", name: "March Raiders", strength: 18 }, notice: "A raider company bars the road." };
  const pickup = game.pickups[game.hero];
  if (!pickup) return { ...game, notice: "The army crossed the Western Marches." };
  const pickups = { ...game.pickups };
  delete pickups[game.hero];
  if (pickup === "knowledge") {
    const available = RESEARCH.filter((tech) => !game.techs.includes(tech.id)).slice(0, 2);
    return { ...game, pickups, researchChoice: available, notice: "Scholars offer two paths of discovery." };
  }
  if (pickup === "timber") return { ...game, pickups, wood: game.wood + 20, notice: "The army secured 20 timber.", log: [...game.log, "Collected timber from an old logging camp."] };
  if (pickup === "stone") return { ...game, pickups, stone: game.stone + 18, notice: "The army recovered 18 dressed stone.", log: [...game.log, "Recovered a cache of dressed stone."] };
  if (pickup === "dust") return { ...game, pickups, magicDust: game.magicDust + 4, notice: "The army found 4 measures of magical dust.", log: [...game.log, "Recovered rare magical dust."] };
  return { ...game, pickups, gold: game.gold + 100, notice: "The army recovered 100 gold.", log: [...game.log, "Recovered an abandoned pay chest."] };
}

export function resolveBattle(game) {
  const battle = game.pendingBattle;
  if (!battle) return game;
  const armyStrength = game.army.spearmen + game.army.slingers + game.army.scouts * 2 + game.army.swordsmen * 3 + game.army.horsemen * 4;
  if (armyStrength < battle.strength) return { ...game, pendingBattle: null, notice: "The garrison held. Recruit more troops before another assault." };
  const army = { ...game.army, spearmen: Math.max(0, game.army.spearmen - 4), slingers: Math.max(0, game.army.slingers - 2) };
  if (battle.type === "siege") {
    const settlement = game.settlements[battle.settlementId];
    const settlements = { ...game.settlements, [battle.settlementId]: { ...settlement, owner: "player", garrison: 0 } };
    return { ...game, army, settlements, cities: game.cities + 1, victories: game.victories + 1, pendingBattle: null, notice: `${settlement.name} has been conquered and added to your Cities list.`, log: [...game.log, `Captured ${settlement.name} after defeating its garrison.`] };
  }
  if (battle.type === "producer") {
    const producer = game.producers[battle.producerId];
    const producers = { ...game.producers, [producer.id]: { ...producer, owner: "player", garrison: 0 } };
    return { ...game, army, producers, victories: game.victories + 1, pendingBattle: null, notice: `${producer.name} is secured. It will produce ${producer.amount} ${producer.resource === "wood" ? "timber" : producer.resource} each month.`, log: [...game.log, `Defeated the guards and took control of ${producer.name}.`] };
  }
  const sites = { ...game.sites };
  delete sites[game.hero];
  return { ...game, army, sites, gold: game.gold + 120, victories: game.victories + 1, pendingBattle: null, notice: "The raiders were defeated; 120 gold was recovered.", log: [...game.log, "Defeated a company of raiders."] };
}

export function chooseResearch(game, techId) {
  const choice = game.researchChoice?.find((tech) => tech.id === techId);
  if (!choice) return game;
  const previous = game.techProgress[techId] ?? 0;
  const progress = Math.min(choice.cost, previous + choice.bonus);
  const completed = progress >= choice.cost;
  return { ...game, techProgress: { ...game.techProgress, [techId]: progress }, techs: completed && !game.techs.includes(techId) ? [...game.techs, techId] : game.techs, activeResearch: completed && game.activeResearch === techId ? null : game.activeResearch, researchChoice: null, notice: `${choice.name} gained ${choice.bonus} research progress.`, log: [...game.log, `Scholars shared their knowledge of ${choice.name}.`] };
}

export function startResearch(game, techId) {
  const technology = RESEARCH.find((tech) => tech.id === techId);
  if (!technology || game.techs.includes(techId)) return game;
  const previous = game.techProgress[techId] ?? 0;
  const spent = Math.min(technology.cost - previous, game.research);
  const progress = previous + spent;
  const completed = progress >= technology.cost;
  return { ...game, research: game.research - spent, techProgress: { ...game.techProgress, [techId]: progress }, techs: completed ? [...game.techs, techId] : game.techs, activeResearch: completed ? null : techId, notice: completed ? `${technology.name} was completed using stored research.` : `${technology.name} is now the active research project.`, log: completed ? [...game.log, `Researchers completed ${technology.name}.`] : game.log };
}

function applyResearch(game, amount) {
  if (!game.activeResearch) return { ...game, research: game.research + amount };
  const technology = RESEARCH.find((tech) => tech.id === game.activeResearch);
  if (!technology) return { ...game, activeResearch: null, research: game.research + amount };
  const previous = game.techProgress[technology.id] ?? 0;
  const available = game.research + amount;
  const spent = Math.min(technology.cost - previous, available);
  const progress = previous + spent;
  const completed = progress >= technology.cost;
  return { ...game, research: available - spent, techProgress: { ...game.techProgress, [technology.id]: progress }, techs: completed && !game.techs.includes(technology.id) ? [...game.techs, technology.id] : game.techs, activeResearch: completed ? null : game.activeResearch, log: completed ? [...game.log, `Researchers completed ${technology.name}.`] : game.log };
}

export function advanceMonth(game) {
  const nextMonth = game.month === 12 ? 1 : game.month + 1;
  const nextYear = game.month === 12 ? game.year + 1 : game.year;
  const owned = Object.values(game.settlements).filter((city) => city.owner === "player");
  const allBuildings = owned.flatMap((city) => game.buildings[city.id] ?? []);
  const researchIncome = 35 + allBuildings.filter((id) => id === "archive").length * 25 + allBuildings.filter((id) => id === "academy").length * 15 + allBuildings.filter((id) => id === "great-library").length * 40;
  const stoneIncome = allBuildings.filter((id) => id === "mason-yard").length * 8 + allBuildings.filter((id) => id === "foundry").length * 8;
  const cityTimberIncome = allBuildings.filter((id) => id === "warehouse").length * 5 + allBuildings.filter((id) => id === "foundry").length * 4;
  const bankIncome = allBuildings.filter((id) => id === "bank").length * 100 + allBuildings.filter((id) => id === "market").length * 25 + allBuildings.filter((id) => id === "trade-guild").length * 60 + allBuildings.filter((id) => id === "treasury").length * 200;
  const controlledProducers = Object.values(game.producers ?? {}).filter((producer) => producer.owner === "player");
  const timberIncome = controlledProducers.filter((producer) => producer.resource === "wood").reduce((total, producer) => total + producer.amount, 0);
  const quarryIncome = controlledProducers.filter((producer) => producer.resource === "stone").reduce((total, producer) => total + producer.amount, 0);
  const settlements = Object.fromEntries(Object.entries(game.settlements).map(([id, city]) => {
    if (city.owner !== "player") return [id, city];
    const built = game.buildings[id] ?? [];
    return [id, { ...city, recruits: {
      ...city.recruits,
      spearmen: city.recruits.spearmen + (built.includes("militia-yard") ? 4 : 0),
      slingers: city.recruits.slingers + (built.includes("archery-range") ? 3 : 0),
      scouts: city.recruits.scouts + (built.includes("scout-camp") ? 1 : 0),
      swordsmen: city.recruits.swordsmen + (built.includes("barracks-ii") ? 2 : 0) + (built.includes("training-grounds") ? 1 : 0),
      horsemen: city.recruits.horsemen + (built.includes("stable") ? 1 : 0) + (built.includes("cavalry-school") ? 1 : 0),
    }, defenders: built.includes("garrison") ? Math.min(12, (city.defenders ?? 0) + 2) : (city.defenders ?? 0) }];
  }));
  const yearMessage = nextYear > game.year ? `Year ${nextYear} begins. Annual growth has been assessed.` : `${MONTHS[nextMonth - 1]} begins.`;
  const produced = applyResearch(game, researchIncome);
  const goldIncome = 75 * owned.length + bankIncome;
  const siteProduction = timberIncome || quarryIncome ? ` Controlled sites produced ${timberIncome} timber and ${quarryIncome} stone.` : "";
  return { ...produced, settlements, constructionThisTurn: {}, month: nextMonth, monthName: MONTHS[nextMonth - 1], year: nextYear, moves: MAX_MOVEMENT, gold: game.gold + goldIncome, wood: game.wood + timberIncome + cityTimberIncome, stone: game.stone + stoneIncome + quarryIncome, notice: `${yearMessage} Cities produced ${goldIncome} gold and ${researchIncome} research.${siteProduction}`, log: [...produced.log, yearMessage] };
}

export function buildInCity(game, cityId, buildingId) {
  const city = game.settlements[cityId];
  const building = BUILDINGS.find((item) => item.id === buildingId);
  const cityBuildings = game.buildings[cityId] ?? [];
  const prerequisitesMet = building?.requires.every((required) => cityBuildings.includes(required));
  if (!city || city.owner !== "player" || !building || game.constructionThisTurn?.[cityId] || cityBuildings.includes(buildingId) || !prerequisitesMet || game.gold < building.gold || game.wood < building.wood || game.stone < building.stone) return game;
  const recruitSeeds = { "archery-range": ["slingers", 3], "scout-camp": ["scouts", 1], "barracks-ii": ["swordsmen", 2], stable: ["horsemen", 1] };
  const seed = recruitSeeds[buildingId];
  const defenders = buildingId === "garrison" ? 8 : (city.defenders ?? 0);
  const settlements = seed || buildingId === "garrison" ? { ...game.settlements, [cityId]: { ...city, defenders, recruits: seed ? { ...city.recruits, [seed[0]]: city.recruits[seed[0]] + seed[1] } : city.recruits } } : game.settlements;
  return { ...game, gold: game.gold - building.gold, wood: game.wood - building.wood, stone: game.stone - building.stone, settlements, constructionThisTurn: { ...(game.constructionThisTurn ?? {}), [cityId]: true }, buildings: { ...game.buildings, [cityId]: [...cityBuildings, buildingId] }, notice: `${building.name} completed in ${city.name}. That city's construction is finished for this turn.`, log: [...game.log, `${city.name} completed its ${building.name}.`] };
}

export function recruitFromCity(game, cityId, unitId) {
  const city = game.settlements[cityId];
  const unit = UNITS.find((item) => item.id === unitId);
  const cityBuildings = game.buildings[cityId] ?? [];
  if (!city || city.owner !== "player" || game.hero !== city.tile || !unit || !cityBuildings.includes(unit.requires) || city.recruits[unitId] <= 0 || game.gold < unit.cost) return game;
  return { ...game, gold: game.gold - unit.cost, army: { ...game.army, [unitId]: game.army[unitId] + 1 }, settlements: { ...game.settlements, [cityId]: { ...city, recruits: { ...city.recruits, [unitId]: city.recruits[unitId] - 1 } } }, notice: `One ${unit.name} unit joined Marcellus in ${city.name}.` };
}

export function cityDefense(game, cityId) {
  const city = game.settlements[cityId];
  if (!city) return 0;
  const built = game.buildings[cityId] ?? [];
  return (city.defenders ?? 0) + (built.includes("palisade") ? 4 : 0) + (built.includes("stone-walls") ? 10 : 0) + (built.includes("citadel") ? 20 : 0);
}

export function eraReadiness(game) {
  const allBuildings = Object.values(game.buildings).flat();
  const checks = [
    { label: "Complete all Ancient Age research", met: game.techs.length === RESEARCH.length },
    { label: "Administer at least two settlements", met: game.cities >= 2 },
    { label: "Complete a Civic Workshop", met: allBuildings.includes("workshop") },
    { label: "Win a field engagement", met: game.victories >= 1 },
  ];
  return { checks, ready: checks.every((check) => check.met) };
}
