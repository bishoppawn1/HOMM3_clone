export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const BOARD = [
  "forest", "forest", "hill", "plains", "plains", "hill", "forest",
  "forest", "road", "road", "road", "plains", "forest", "forest",
  "plains", "road", "plains", "road", "hill", "plains", "water",
  "hill", "road", "road", "road", "road", "plains", "water",
  "forest", "plains", "hill", "plains", "road", "road", "plains",
];

export const RESEARCH = [
  { id: "surveying", name: "Surveying", icon: "⌖", cost: 180, bonus: 90, description: "Improves travel and reveals nearby territory." },
  { id: "bronze", name: "Bronze Working", icon: "⚒", cost: 220, bonus: 110, description: "Unlocks stronger arms and civic tools." },
  { id: "records", name: "Written Records", icon: "≡", cost: 260, bonus: 130, description: "Improves administration and research." },
];

export const BUILDINGS = [
  { id: "granary", name: "Granary", cost: 240, description: "+20 food at the end of each month." },
  { id: "workshop", name: "Civic Workshop", cost: 320, description: "Required civic capacity for the next age." },
  { id: "archive", name: "Scribes' Archive", cost: 410, description: "+25 research at the end of each month." },
];

export function createGame() {
  return {
    year: 1, month: 3, monthName: MONTHS[2], era: "Ancient", hero: 24, moves: 5,
    gold: 760, wood: 35, food: 90, research: 70, cities: 1, victories: 0,
    techs: [], buildings: [], activeResearch: null, techProgress: {}, researchChoice: null,
    pickups: { 2: "knowledge", 10: "timber", 17: "capital", 18: "enemy", 26: "city", 31: "food" },
    notice: "Aurum yielded 75 gold. Choose a technology or save your research points.",
    log: ["The campaign began in Year 1.", "Marcellus Vale departed Aurum."],
  };
}

export function canMoveTo(game, index) {
  if (game.moves <= 0 || game.researchChoice) return false;
  const fromRow = Math.floor(game.hero / 7), fromCol = game.hero % 7;
  const row = Math.floor(index / 7), col = index % 7;
  return BOARD[index] !== "water" && Math.abs(fromRow - row) + Math.abs(fromCol - col) === 1;
}

export function collectAt(game) {
  const pickup = game.pickups[game.hero];
  if (!pickup) return { ...game, notice: "The army crossed the Western Marches." };
  if (pickup === "capital") return { ...game, notice: "Marcellus returned to Aurum, the heart of your realm." };
  const pickups = { ...game.pickups };
  delete pickups[game.hero];
  if (pickup === "knowledge") {
    const available = RESEARCH.filter((tech) => !game.techs.includes(tech.id)).slice(0, 2);
    return { ...game, pickups, researchChoice: available, notice: "Scholars offer two paths of discovery." };
  }
  if (pickup === "timber") return { ...game, pickups, wood: game.wood + 20, notice: "The army secured 20 timber." , log: [...game.log, "Collected timber from the old logging camp."]};
  if (pickup === "food") return { ...game, pickups, food: game.food + 30, notice: "Local farmers supplied 30 provisions.", log: [...game.log, "Received provisions from local farmers."] };
  if (pickup === "city") return { ...game, pickups, cities: game.cities + 1, gold: game.gold + 100, notice: "The Free Town joined your administration.", log: [...game.log, "A Free Town accepted Aurum's protection."] };
  return { ...game, pickups, victories: game.victories + 1, gold: game.gold + 120, notice: "Your army defeated the raiders and recovered 120 gold.", log: [...game.log, "Defeated a company of raiders."] };
}

export function chooseResearch(game, techId) {
  const choice = game.researchChoice?.find((tech) => tech.id === techId);
  if (!choice) return game;
  const previous = game.techProgress[techId] ?? 0;
  const progress = Math.min(choice.cost, previous + choice.bonus);
  const completed = progress >= choice.cost;
  return {
    ...game,
    techProgress: { ...game.techProgress, [techId]: progress },
    techs: completed && !game.techs.includes(techId) ? [...game.techs, techId] : game.techs,
    activeResearch: completed && game.activeResearch === techId ? null : game.activeResearch,
    researchChoice: null,
    notice: `${choice.name} gained ${choice.bonus} research progress.`,
    log: [...game.log, `Scholars shared their knowledge of ${choice.name}.`],
  };
}

export function startResearch(game, techId) {
  const technology = RESEARCH.find((tech) => tech.id === techId);
  if (!technology || game.techs.includes(techId)) return game;
  const previous = game.techProgress[techId] ?? 0;
  const needed = technology.cost - previous;
  const spent = Math.min(needed, game.research);
  const progress = previous + spent;
  const completed = progress >= technology.cost;
  return {
    ...game,
    research: game.research - spent,
    techProgress: { ...game.techProgress, [techId]: progress },
    techs: completed ? [...game.techs, techId] : game.techs,
    activeResearch: completed ? null : techId,
    notice: completed
      ? `${technology.name} was completed using stored research.`
      : `${technology.name} is now the active research project.`,
    log: completed ? [...game.log, `Researchers completed ${technology.name}.`] : game.log,
  };
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
  return {
    ...game,
    research: available - spent,
    techProgress: { ...game.techProgress, [technology.id]: progress },
    techs: completed && !game.techs.includes(technology.id) ? [...game.techs, technology.id] : game.techs,
    activeResearch: completed ? null : game.activeResearch,
    log: completed ? [...game.log, `Researchers completed ${technology.name}.`] : game.log,
  };
}

export function advanceMonth(game) {
  const nextMonth = game.month === 12 ? 1 : game.month + 1;
  const nextYear = game.month === 12 ? game.year + 1 : game.year;
  const researchIncome = 35 + (game.buildings.includes("archive") ? 25 : 0);
  const foodIncome = game.buildings.includes("granary") ? 20 : 0;
  const yearMessage = nextYear > game.year ? `Year ${nextYear} begins. Annual growth has been assessed.` : `${MONTHS[nextMonth - 1]} begins.`;
  const produced = applyResearch(game, researchIncome);
  return { ...produced, month: nextMonth, monthName: MONTHS[nextMonth - 1], year: nextYear, moves: 5, gold: game.gold + 75 * game.cities, food: game.food + foodIncome, notice: `${yearMessage} Cities produced ${75 * game.cities} gold and ${researchIncome} research.`, log: [...produced.log, yearMessage] };
}

export function buildInCapital(game, buildingId) {
  const building = BUILDINGS.find((item) => item.id === buildingId);
  if (!building || game.buildings.includes(buildingId) || game.gold < building.cost) return game;
  return { ...game, gold: game.gold - building.cost, buildings: [...game.buildings, buildingId], notice: `${building.name} completed in Aurum.`, log: [...game.log, `Aurum completed its ${building.name}.`] };
}

export function eraReadiness(game) {
  const checks = [
    { label: "Complete all Ancient Age research", met: game.techs.length === RESEARCH.length },
    { label: "Administer at least two settlements", met: game.cities >= 2 },
    { label: "Complete a Civic Workshop", met: game.buildings.includes("workshop") },
    { label: "Win a field engagement", met: game.victories >= 1 },
  ];
  return { checks, ready: checks.every((check) => check.met) };
}
