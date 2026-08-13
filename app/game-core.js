export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export const BOARD = [
  "forest", "forest", "hill", "plains", "plains", "hill", "forest",
  "forest", "road", "road", "road", "plains", "forest", "forest",
  "plains", "road", "plains", "road", "hill", "plains", "water",
  "hill", "road", "road", "road", "road", "plains", "water",
  "forest", "plains", "hill", "plains", "road", "road", "plains",
];

export const RESEARCH = [
  { id: "surveying", name: "Surveying", icon: "⌖", bonus: 180, description: "Improves travel and reveals nearby territory." },
  { id: "bronze", name: "Bronze Working", icon: "⚒", bonus: 160, description: "Unlocks stronger arms and civic tools." },
  { id: "records", name: "Written Records", icon: "≡", bonus: 200, description: "Improves administration and research." },
];

export const BUILDINGS = [
  { id: "granary", name: "Granary", cost: 240, description: "+20 food at the end of each month." },
  { id: "workshop", name: "Civic Workshop", cost: 320, description: "Required civic capacity for the next age." },
  { id: "archive", name: "Scribes' Archive", cost: 410, description: "+25 research at the end of each month." },
];

export function createGame() {
  return {
    year: 1, month: 3, monthName: MONTHS[2], era: "Ancient", hero: 23, moves: 5,
    gold: 760, wood: 35, food: 90, research: 210, cities: 1, victories: 0,
    techs: [], buildings: [], researchChoice: null,
    pickups: { 2: "knowledge", 10: "timber", 18: "enemy", 27: "city", 31: "food" },
    notice: "Aurum yielded 75 gold. Scouts report an old scholars' hut to the north.",
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
  const total = game.research + choice.bonus;
  return { ...game, research: total, techs: [...game.techs, techId], researchChoice: null, notice: `${choice.name} advanced by ${choice.bonus} research.`, log: [...game.log, `Scholars shared their knowledge of ${choice.name}.`] };
}

export function advanceMonth(game) {
  const nextMonth = game.month === 12 ? 1 : game.month + 1;
  const nextYear = game.month === 12 ? game.year + 1 : game.year;
  const researchIncome = 35 + (game.buildings.includes("archive") ? 25 : 0);
  const foodIncome = game.buildings.includes("granary") ? 20 : 0;
  const yearMessage = nextYear > game.year ? `Year ${nextYear} begins. Annual growth has been assessed.` : `${MONTHS[nextMonth - 1]} begins.`;
  return { ...game, month: nextMonth, monthName: MONTHS[nextMonth - 1], year: nextYear, moves: 5, gold: game.gold + 75 * game.cities, food: game.food + foodIncome, research: game.research + researchIncome, notice: `${yearMessage} Cities produced ${75 * game.cities} gold and ${researchIncome} research.`, log: [...game.log, yearMessage] };
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
