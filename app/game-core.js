export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MAP_WIDTH = 12;
export const MAX_MOVEMENT = 16;

const terrainRows = [
  "fffpphhpppww", "ffprrrpppfww", "ppprpffhprpw", "hprrpffpprrw",
  "fprrrrrrrppw", "fpprpffrrppw", "hhprpppprpfw", "ffpphhpprppw",
];
const terrainKey = { f: "forest", p: "plains", h: "hill", r: "road", w: "water" };
export const BOARD = terrainRows.join("").split("").map((key) => terrainKey[key]);

export const RESEARCH = [
  { id: "surveying", name: "Surveying", icon: "⌖", cost: 180, bonus: 90, description: "Improves travel and reveals nearby territory." },
  { id: "bronze", name: "Bronze Working", icon: "⚒", cost: 220, bonus: 110, description: "Unlocks stronger arms and civic tools." },
  { id: "records", name: "Written Records", icon: "≡", cost: 260, bonus: 130, description: "Improves administration and research." },
];

export const BUILDINGS = [
  { id: "mason-yard", name: "Mason's Yard", cost: 240, stone: 8, description: "+8 stone at the end of each month." },
  { id: "workshop", name: "Civic Workshop", cost: 320, stone: 12, description: "Required civic capacity for the next age." },
  { id: "archive", name: "Scribes' Archive", cost: 410, stone: 16, description: "+25 research at the end of each month." },
];

export const UNITS = [
  { id: "spearmen", name: "Spearmen", icon: "♙", cost: 24 },
  { id: "slingers", name: "Slingers", icon: "◉", cost: 32 },
  { id: "scouts", name: "Scouts", icon: "♞", cost: 55 },
];

export function createGame() {
  return {
    year: 1, month: 3, monthName: MONTHS[2], era: "Ancient", hero: 66, moves: MAX_MOVEMENT,
    gold: 760, wood: 35, stone: 24, magicDust: 3, research: 70, cities: 1, victories: 0,
    army: { spearmen: 24, slingers: 16, scouts: 7 },
    techs: [], activeResearch: null, techProgress: {}, researchChoice: null, pendingBattle: null,
    buildings: { aurum: [], freehaven: [] },
    settlements: {
      aurum: { id: "aurum", name: "Aurum", tile: 54, owner: "player", population: 1240, recruits: { spearmen: 12, slingers: 8, scouts: 3 } },
      freehaven: { id: "freehaven", name: "Freehaven", tile: 33, owner: "neutral", population: 680, recruits: { spearmen: 8, slingers: 5, scouts: 2 }, garrison: 26 },
    },
    sites: { 46: "raiders" },
    pickups: { 9: "dust", 14: "knowledge", 38: "timber", 75: "stone", 87: "gold" },
    notice: "Aurum yielded 75 gold. Choose a technology or save your research points.",
    log: ["The campaign began in Year 1.", "Marcellus Vale departed Aurum."],
  };
}

export function settlementAt(game, tile) {
  return Object.values(game.settlements).find((settlement) => settlement.tile === tile) ?? null;
}

export function canMoveTo(game, index) {
  if (game.moves <= 0 || game.researchChoice || game.pendingBattle) return false;
  const fromRow = Math.floor(game.hero / MAP_WIDTH), fromCol = game.hero % MAP_WIDTH;
  const row = Math.floor(index / MAP_WIDTH), col = index % MAP_WIDTH;
  return BOARD[index] !== "water" && Math.abs(fromRow - row) + Math.abs(fromCol - col) === 1;
}

export function collectAt(game) {
  const settlement = settlementAt(game, game.hero);
  if (settlement) {
    if (settlement.owner === "player") return { ...game, notice: `Marcellus entered ${settlement.name}. Open Cities to recruit its available troops.` };
    return { ...game, pendingBattle: { type: "siege", settlementId: settlement.id, name: settlement.name, strength: settlement.garrison }, notice: `${settlement.name}'s garrison blocks the gates.` };
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
  const armyStrength = game.army.spearmen + game.army.slingers + game.army.scouts * 2;
  if (armyStrength < battle.strength) return { ...game, pendingBattle: null, notice: "The garrison held. Recruit more troops before another assault." };
  const army = { ...game.army, spearmen: Math.max(0, game.army.spearmen - 4), slingers: Math.max(0, game.army.slingers - 2) };
  if (battle.type === "siege") {
    const settlement = game.settlements[battle.settlementId];
    const settlements = { ...game.settlements, [battle.settlementId]: { ...settlement, owner: "player", garrison: 0 } };
    return { ...game, army, settlements, cities: game.cities + 1, victories: game.victories + 1, pendingBattle: null, notice: `${settlement.name} has been conquered and added to your Cities list.`, log: [...game.log, `Captured ${settlement.name} after defeating its garrison.`] };
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
  const researchIncome = 35 + allBuildings.filter((id) => id === "archive").length * 25;
  const stoneIncome = allBuildings.filter((id) => id === "mason-yard").length * 8;
  const settlements = Object.fromEntries(Object.entries(game.settlements).map(([id, city]) => [id, city.owner === "player" ? { ...city, recruits: { spearmen: city.recruits.spearmen + 4, slingers: city.recruits.slingers + 3, scouts: city.recruits.scouts + 1 } } : city]));
  const yearMessage = nextYear > game.year ? `Year ${nextYear} begins. Annual growth has been assessed.` : `${MONTHS[nextMonth - 1]} begins.`;
  const produced = applyResearch(game, researchIncome);
  return { ...produced, settlements, month: nextMonth, monthName: MONTHS[nextMonth - 1], year: nextYear, moves: MAX_MOVEMENT, gold: game.gold + 75 * owned.length, stone: game.stone + stoneIncome, notice: `${yearMessage} Cities produced ${75 * owned.length} gold and ${researchIncome} research.`, log: [...produced.log, yearMessage] };
}

export function buildInCity(game, cityId, buildingId) {
  const city = game.settlements[cityId];
  const building = BUILDINGS.find((item) => item.id === buildingId);
  const cityBuildings = game.buildings[cityId] ?? [];
  if (!city || city.owner !== "player" || !building || cityBuildings.includes(buildingId) || game.gold < building.cost || game.stone < building.stone) return game;
  return { ...game, gold: game.gold - building.cost, stone: game.stone - building.stone, buildings: { ...game.buildings, [cityId]: [...cityBuildings, buildingId] }, notice: `${building.name} completed in ${city.name}.`, log: [...game.log, `${city.name} completed its ${building.name}.`] };
}

export function recruitFromCity(game, cityId, unitId) {
  const city = game.settlements[cityId];
  const unit = UNITS.find((item) => item.id === unitId);
  if (!city || city.owner !== "player" || game.hero !== city.tile || !unit || city.recruits[unitId] <= 0 || game.gold < unit.cost) return game;
  return { ...game, gold: game.gold - unit.cost, army: { ...game.army, [unitId]: game.army[unitId] + 1 }, settlements: { ...game.settlements, [cityId]: { ...city, recruits: { ...city.recruits, [unitId]: city.recruits[unitId] - 1 } } }, notice: `One ${unit.name} unit joined Marcellus in ${city.name}.` };
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
