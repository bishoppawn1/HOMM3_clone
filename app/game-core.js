export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const MAP_WIDTH = 48;
export const MAP_HEIGHT = 30;
export const MAX_MOVEMENT = 16;
export const COMBAT_WIDTH = 15;
export const COMBAT_HEIGHT = 9;

export const ERAS = ["Ancient", "Classical", "Medieval", "Gunpowder", "Industrial", "Modern"];

export const IMPASSABLE_TERRAIN = Object.freeze(["water", "mountain", "dense-forest"]);

export function adventureTile(col, row) {
  return row * MAP_WIDTH + col;
}

function isRoadCoordinate(col, row) {
  return (row === 8 && col >= 4 && col <= 44)
    || (row === 22 && col >= 3 && col <= 45)
    || (col === 12 && row >= 5 && row <= 22)
    || (row === 5 && col >= 5 && col <= 12)
    || (col === 5 && row >= 5 && row <= 8)
    || (col === 27 && row >= 8 && row <= 25)
    || (col === 42 && row >= 6 && row <= 24);
}

function isMountainCoordinate(col, row) {
  if (row === 8 || row === 22) return false;
  const westernShift = [0, 0, 1, 1, 0, -1][row % 6];
  const easternShift = [0, -1, -1, 0, 1, 1][row % 6];
  const westernEdge = 18 + westernShift;
  const easternEdge = 35 + easternShift;
  return (col >= westernEdge && col <= westernEdge + 2)
    || (col >= easternEdge && col <= easternEdge + 2);
}

function isDenseForestCoordinate(col, row) {
  const westernWall = row >= 15 && row <= 17 && col <= 18 && (col < 11 || col > 13);
  const easternWall = row >= 14 && row <= 16 && col >= 36 && (col < 41 || col > 43);
  const northernWood = row <= 5 && col <= 9 && !(row >= 4 && col >= 4);
  const southernWood = row >= 25 && col <= 14;
  return westernWall || easternWall || northernWood || southernWood;
}

export const BOARD = Array.from({ length: MAP_WIDTH * MAP_HEIGHT }, (_, tile) => {
  const row = Math.floor(tile / MAP_WIDTH), col = tile % MAP_WIDTH;
  if (isRoadCoordinate(col, row)) return "road";
  if (col === MAP_WIDTH - 1 || (col === MAP_WIDTH - 2 && row >= 6 && row <= 24)) return "water";
  if (isMountainCoordinate(col, row)) return "mountain";
  if (isDenseForestCoordinate(col, row)) return "dense-forest";
  if ((row < 8 && col < 15) || (row > 23 && col > 37)) return "forest";
  if ((row < 7 && col > 21 && col < 34) || (row > 18 && col > 20 && col < 35)) return "hill";
  return "plains";
});

export function isTerrainPassable(tile) {
  return tile >= 0 && tile < BOARD.length && !IMPASSABLE_TERRAIN.includes(BOARD[tile]);
}

export function eraVisualFamily(era) {
  return ERAS.includes(era) ? era.toLowerCase() : "ancient";
}

export const RESEARCH = [
  { id: "surveying", era: "Ancient", name: "Surveying", icon: "⌖", cost: 180, bonus: 90, description: "Improves travel and reveals nearby territory." },
  { id: "bronze", era: "Ancient", name: "Bronze Working", icon: "⚒", cost: 220, bonus: 110, description: "Unlocks stronger arms and civic tools." },
  { id: "records", era: "Ancient", name: "Written Records", icon: "≡", cost: 260, bonus: 130, description: "Improves administration and research." },
  { id: "irrigation", era: "Classical", name: "Irrigation", icon: "≈", cost: 300, bonus: 150, description: "Coordinates waterworks and steadier harvests." },
  { id: "iron-working", era: "Classical", name: "Iron Working", icon: "⚒", cost: 340, bonus: 170, description: "Develops stronger tools, weapons, and fittings." },
  { id: "civic-law", era: "Classical", name: "Civic Law", icon: "⚖", cost: 380, bonus: 190, description: "Formalizes administration across growing communities." },
  { id: "crop-rotation", era: "Medieval", name: "Crop Rotation", icon: "◌", cost: 430, bonus: 215, description: "Improves agricultural output without territorial expansion." },
  { id: "guilds", era: "Medieval", name: "Craft Guilds", icon: "◇", cost: 470, bonus: 235, description: "Organizes skilled labor and specialist production." },
  { id: "steel-working", era: "Medieval", name: "Steel Working", icon: "⚔", cost: 510, bonus: 255, description: "Refines dependable steel arms and tools." },
  { id: "printing", era: "Gunpowder", name: "Printing Press", icon: "▤", cost: 570, bonus: 285, description: "Accelerates the circulation of technical knowledge." },
  { id: "black-powder", era: "Gunpowder", name: "Black Powder", icon: "✹", cost: 620, bonus: 310, description: "Introduces grounded gunpowder weapons and engineering." },
  { id: "navigation", era: "Gunpowder", name: "Oceanic Navigation", icon: "⌖", cost: 670, bonus: 335, description: "Improves long-distance navigation and mapping." },
  { id: "steam-power", era: "Industrial", name: "Steam Power", icon: "⚙", cost: 740, bonus: 370, description: "Provides mechanical power for transport and industry." },
  { id: "mechanization", era: "Industrial", name: "Mechanization", icon: "⌘", cost: 800, bonus: 400, description: "Standardizes machine-assisted production." },
  { id: "public-schooling", era: "Industrial", name: "Public Schooling", icon: "≡", cost: 860, bonus: 430, description: "Broadens literacy and technical education." },
  { id: "electricity", era: "Modern", name: "Electricity", icon: "ϟ", cost: 940, bonus: 470, description: "Builds reliable electrical generation and distribution." },
  { id: "combustion", era: "Modern", name: "Combustion Engines", icon: "⚙", cost: 1000, bonus: 500, description: "Powers mobile machines with compact engines." },
  { id: "radio", era: "Modern", name: "Radio Communication", icon: "⌁", cost: 1060, bonus: 530, description: "Coordinates distant forces and cities rapidly." },
];

export const BUILDINGS = [
  { id: "town-hall", name: "Town Hall", icon: "♜", tier: 1, branch: "civic", x: 3, y: 1, gold: 0, wood: 0, stone: 0, requires: [], description: "+75 gold each month." },
  { id: "militia-yard", name: "Militia Yard", icon: "⚑", tier: 1, branch: "military", x: 6, y: 1, gold: 0, wood: 0, stone: 0, requires: [], description: "Recruits Spearmen." },
  { id: "market", name: "Market", icon: "¤", tier: 2, branch: "economy", x: 1, y: 2, gold: 260, wood: 10, stone: 0, requires: ["town-hall"], description: "+25 gold each month." },
  { id: "mason-yard", name: "Mason's Yard", icon: "⬟", tier: 2, branch: "economy", x: 2, y: 2, gold: 240, wood: 14, stone: 0, requires: ["town-hall"], description: "+8 stone each month. Costs timber, not stone." },
  { id: "archive", name: "Scribes' Archive", icon: "≡", tier: 2, branch: "civic", x: 4, y: 2, gold: 410, wood: 10, stone: 8, requires: ["town-hall"], description: "+25 research each month." },
  { id: "city-hall", name: "City Hall", icon: "♛", tier: 2, branch: "civic", x: 3, y: 2, gold: 450, wood: 15, stone: 15, requires: ["town-hall"], description: "Upgrades the settlement to city tier II." },
  { id: "archery-range", name: "Archery Range", icon: "◉", tier: 2, branch: "military", x: 5, y: 2, gold: 300, wood: 18, stone: 4, requires: ["militia-yard"], description: "Recruits Slingers." },
  { id: "scout-camp", name: "Scout Camp", icon: "⌖", tier: 2, branch: "military", x: 6, y: 2, gold: 320, wood: 16, stone: 4, requires: ["militia-yard"], description: "Recruits Scouts." },
  { id: "palisade", name: "Palisade", icon: "▥", tier: 2, branch: "defense", x: 7, y: 2, gold: 280, wood: 24, stone: 0, requires: ["town-hall"], description: "+4 city defense." },
  { id: "warehouse", name: "Warehouse", icon: "▰", tier: 3, branch: "economy", x: 1, y: 3, gold: 380, wood: 20, stone: 8, requires: ["market"], description: "+5 timber each month." },
  { id: "bank", name: "Bank", icon: "◆", tier: 3, branch: "economy", x: 2, y: 3, gold: 650, wood: 12, stone: 20, requires: ["market", "city-hall"], description: "+100 gold each month." },
  { id: "workshop", name: "Civic Workshop", icon: "⚒", tier: 3, branch: "civic", x: 3, y: 3, gold: 320, wood: 12, stone: 10, requires: ["mason-yard", "city-hall"], description: "Supports advanced civic construction." },
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
  { id: "spearmen", name: "Spearmen", icon: "♙", tier: 1, cost: 24, requires: "militia-yard", attack: 4, defense: 5, damage: [2, 3], health: 10, speed: 4, initiative: 4, ranged: false, role: "Defensive infantry that holds ground and protects more fragile formations." },
  { id: "slingers", name: "Slingers", icon: "◉", tier: 1, cost: 32, requires: "archery-range", attack: 4, defense: 3, damage: [2, 3], health: 8, speed: 4, initiative: 5, ranged: true, shots: 8, role: "Ranged troops that can attack across the battlefield while ammunition remains." },
  { id: "scouts", name: "Scouts", icon: "⌖", tier: 1, cost: 55, requires: "scout-camp", attack: 5, defense: 3, damage: [3, 4], health: 12, speed: 6, initiative: 7, ranged: false, role: "Fast light troops that move early and reach exposed enemies quickly." },
  { id: "swordsmen", name: "Swordsmen", icon: "⚔", tier: 2, cost: 68, requires: "barracks-ii", attack: 7, defense: 7, damage: [4, 6], health: 18, speed: 5, initiative: 6, ranged: false, role: "Heavy line infantry with balanced attack, defense, and staying power." },
  { id: "horsemen", name: "Horsemen", icon: "♞", tier: 2, cost: 115, requires: "stable", attack: 8, defense: 6, damage: [5, 8], health: 22, speed: 7, initiative: 8, ranged: false, role: "Mobile shock troops with high speed and strong charge damage." },
];

const UNIT_ERA_NAMES = {
  spearmen: ["Spearmen", "Hoplites", "Pikemen", "Halberdiers", "Militia", "Reservists"],
  slingers: ["Slingers", "Archers", "Longbowmen", "Arquebusiers", "Riflemen", "Machine Gunners"],
  scouts: ["Scouts", "Skirmishers", "Rangers", "Light Dragoons", "Cavalry Scouts", "Recon Troops"],
  swordsmen: ["Swordsmen", "Legionaries", "Men-at-Arms", "Grenadiers", "Shock Troops", "Assault Infantry"],
  horsemen: ["Horsemen", "Companion Cavalry", "Knights", "Cuirassiers", "Lancers", "Armored Cars"],
};

export function unitForEra(unitId, era = "Ancient") {
  const base = UNITS.find((unit) => unit.id === unitId);
  if (!base) return null;
  const eraIndex = Math.max(0, ERAS.indexOf(era));
  const damageBonus = eraIndex * 2;
  return {
    ...base,
    name: UNIT_ERA_NAMES[unitId]?.[eraIndex] ?? base.name,
    cost: base.cost + eraIndex * Math.ceil(base.cost * .3),
    attack: base.attack + eraIndex * 2,
    defense: base.defense + eraIndex * 2,
    damage: [base.damage[0] + damageBonus, base.damage[1] + damageBonus],
    health: base.health + eraIndex * 4,
    shots: base.ranged ? (base.shots ?? 0) + eraIndex * 2 : undefined,
  };
}

export function unitsForEra(era) {
  return UNITS.map((unit) => unitForEra(unit.id, era));
}

const BATTLEFIELD_PATTERNS = {
  field: [
    { tile: 36, kind: "tree" }, { tile: 37, kind: "tree" },
    { tile: 82, kind: "boulder" }, { tile: 98, kind: "boulder" },
  ],
  producer: [
    { tile: 37, kind: "timber" }, { tile: 38, kind: "timber" },
    { tile: 52, kind: "cart" }, { tile: 97, kind: "boulder" },
  ],
  siege: [
    { tile: 25, kind: "barricade" }, { tile: 55, kind: "barricade" },
    { tile: 85, kind: "barricade" }, { tile: 115, kind: "barricade" },
    { tile: 69, kind: "rubble" },
  ],
};

function unitById(unitId, era = "Ancient") {
  return unitForEra(unitId, era);
}

function combatStackCount(stack) {
  if (!stack || stack.totalHealth <= 0) return 0;
  return Math.ceil(stack.totalHealth / unitById(stack.unitId, stack.era).health);
}

function combatCoordinates(tile) {
  return { row: Math.floor(tile / COMBAT_WIDTH), col: tile % COMBAT_WIDTH };
}

function combatTile(row, col) {
  return row * COMBAT_WIDTH + col;
}

function combatTileExists(row, col) {
  return row >= 0 && row < COMBAT_HEIGHT && col >= 0 && col < COMBAT_WIDTH;
}

export function combatNeighbors(tile) {
  const { row, col } = combatCoordinates(tile);
  const diagonals = row % 2 === 0
    ? [[-1, -1], [-1, 0], [1, -1], [1, 0]]
    : [[-1, 0], [-1, 1], [1, 0], [1, 1]];
  return [[0, -1], [0, 1], ...diagonals]
    .map(([rowOffset, colOffset]) => [row + rowOffset, col + colOffset])
    .filter(([nextRow, nextCol]) => combatTileExists(nextRow, nextCol))
    .map(([nextRow, nextCol]) => combatTile(nextRow, nextCol));
}

function offsetToCube(tile) {
  const { row, col } = combatCoordinates(tile);
  const x = col - (row - (row & 1)) / 2;
  const z = row;
  return { x, y: -x - z, z };
}

function cubeToTile({ x, z }) {
  const row = z;
  const col = x + (row - (row & 1)) / 2;
  return combatTile(row, col);
}

function roundCube(cube) {
  let x = Math.round(cube.x), y = Math.round(cube.y), z = Math.round(cube.z);
  const xDiff = Math.abs(x - cube.x), yDiff = Math.abs(y - cube.y), zDiff = Math.abs(z - cube.z);
  if (xDiff > yDiff && xDiff > zDiff) x = -y - z;
  else if (yDiff > zDiff) y = -x - z;
  else z = -x - y;
  return { x, y, z };
}

export function combatDistance(from, to) {
  const a = offsetToCube(from), b = offsetToCube(to);
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
}

function livingCombatStacks(combat) {
  return combat.stacks.filter((stack) => combatStackCount(stack) > 0);
}

function occupiedCombatTiles(combat, ignoredStackId = null) {
  return new Set(livingCombatStacks(combat).filter((stack) => stack.id !== ignoredStackId).map((stack) => stack.position));
}

function blockedCombatTiles(combat) {
  return new Set(combat.obstacles.map((obstacle) => obstacle.tile));
}

function findCombatRoute(combat, stackId, destinations, maximumDistance = Infinity) {
  const stack = combat.stacks.find((item) => item.id === stackId);
  if (!stack || combatStackCount(stack) <= 0) return null;
  const goals = new Set(destinations);
  if (goals.has(stack.position)) return [];
  const occupied = occupiedCombatTiles(combat, stackId);
  const blocked = blockedCombatTiles(combat);
  const queue = [stack.position];
  const previous = new Map([[stack.position, null]]);
  const distance = new Map([[stack.position, 0]]);
  while (queue.length) {
    const current = queue.shift();
    for (const neighbor of combatNeighbors(current)) {
      if (previous.has(neighbor) || occupied.has(neighbor) || blocked.has(neighbor)) continue;
      const nextDistance = distance.get(current) + 1;
      if (nextDistance > maximumDistance) continue;
      previous.set(neighbor, current);
      distance.set(neighbor, nextDistance);
      if (goals.has(neighbor)) {
        const route = [];
        let step = neighbor;
        while (step !== stack.position) {
          route.unshift(step);
          step = previous.get(step);
        }
        return route;
      }
      queue.push(neighbor);
    }
  }
  return null;
}

export function combatPath(combat, stackId, destination) {
  return findCombatRoute(combat, stackId, [destination]);
}

export function combatReachable(combat, stackId = combat?.activeStackId) {
  const stack = combat?.stacks.find((item) => item.id === stackId);
  if (!stack || combatStackCount(stack) <= 0) return [];
  const occupied = occupiedCombatTiles(combat, stack.id);
  const blocked = blockedCombatTiles(combat);
  const queue = [stack.position];
  const distance = new Map([[stack.position, 0]]);
  while (queue.length) {
    const current = queue.shift();
    for (const neighbor of combatNeighbors(current)) {
      if (distance.has(neighbor) || occupied.has(neighbor) || blocked.has(neighbor)) continue;
      const nextDistance = distance.get(current) + 1;
      if (nextDistance > unitById(stack.unitId, stack.era).speed) continue;
      distance.set(neighbor, nextDistance);
      queue.push(neighbor);
    }
  }
  return [...distance.keys()].filter((tile) => tile !== stack.position);
}

export function combatHasLineOfSight(combat, from, to) {
  const distance = combatDistance(from, to);
  if (distance <= 1) return true;
  const start = offsetToCube(from), end = offsetToCube(to);
  const blocked = blockedCombatTiles(combat);
  const occupied = occupiedCombatTiles(combat);
  for (let step = 1; step < distance; step += 1) {
    const amount = step / distance;
    const cube = roundCube({
      x: start.x + (end.x - start.x) * amount,
      y: start.y + (end.y - start.y) * amount,
      z: start.z + (end.z - start.z) * amount,
    });
    const tile = cubeToTile(cube);
    if (blocked.has(tile) || occupied.has(tile)) return false;
  }
  return true;
}

function enemyAdjacent(combat, stack) {
  const neighbors = new Set(combatNeighbors(stack.position));
  return livingCombatStacks(combat).some((other) => other.side !== stack.side && neighbors.has(other.position));
}

function attackPlan(combat, attacker, defender) {
  if (!attacker || !defender || attacker.side === defender.side || combatStackCount(attacker) <= 0 || combatStackCount(defender) <= 0) return null;
  const unit = unitById(attacker.unitId, attacker.era);
  if (unit.ranged && attacker.shots > 0 && !enemyAdjacent(combat, attacker)) {
    return { ranged: true, route: [] };
  }
  const destinations = combatNeighbors(defender.position).filter((tile) => tile === attacker.position || (!occupiedCombatTiles(combat, attacker.id).has(tile) && !blockedCombatTiles(combat).has(tile)));
  const route = findCombatRoute(combat, attacker.id, destinations, unit.speed);
  return route ? { ranged: false, route } : null;
}

export function combatCanAttack(combat, attackerId, defenderId) {
  const attacker = combat?.stacks.find((stack) => stack.id === attackerId);
  const defender = combat?.stacks.find((stack) => stack.id === defenderId);
  return Boolean(attackPlan(combat, attacker, defender));
}

function enemyArmyFor(battle) {
  const strength = battle.strength;
  if (battle.type === "siege") return [
    ["spearmen", Math.max(8, Math.ceil(strength * .55))],
    ["slingers", Math.max(4, Math.ceil(strength * .28))],
    ["swordsmen", Math.max(2, Math.floor(strength * .1))],
  ];
  return [
    ["spearmen", Math.max(6, Math.ceil(strength * .55))],
    ["slingers", Math.max(3, Math.ceil(strength * .26))],
    ["scouts", Math.max(2, Math.floor(strength * .1))],
  ];
}

function makeCombatStack(side, unitId, count, position, era) {
  const unit = unitById(unitId, era);
  return {
    id: `${side}-${unitId}`,
    side,
    unitId,
    era,
    position,
    totalHealth: count * unit.health,
    shots: unit.shots ?? 0,
    waited: false,
    defending: false,
    retaliated: false,
    done: false,
  };
}

function nextCombatStack(combat) {
  const sortByInitiative = (direction) => (a, b) => {
    const initiative = unitById(b.unitId, b.era).initiative - unitById(a.unitId, a.era).initiative;
    if (initiative !== 0) return initiative * direction;
    if (a.side !== b.side) return a.side === "player" ? -1 : 1;
    return a.id.localeCompare(b.id);
  };
  const ready = livingCombatStacks(combat).filter((stack) => !stack.done && !stack.waited).sort(sortByInitiative(1));
  if (ready.length) return ready[0];
  const waiting = livingCombatStacks(combat).filter((stack) => !stack.done && stack.waited).sort(sortByInitiative(-1));
  return waiting[0] ?? null;
}

function combatOutcome(combat) {
  const playerAlive = livingCombatStacks(combat).some((stack) => stack.side === "player");
  const enemyAlive = livingCombatStacks(combat).some((stack) => stack.side === "enemy");
  if (!enemyAlive) return "victory";
  if (!playerAlive) return "defeat";
  return null;
}

function replaceCombatStack(combat, stack) {
  return { ...combat, stacks: combat.stacks.map((item) => item.id === stack.id ? stack : item) };
}

function recordCombatAction(combat, action) {
  const actionSerial = (combat.actionSerial ?? 0) + 1;
  return { ...combat, actionSerial, lastAction: { ...action, id: actionSerial } };
}

function strikeCombatStack(combat, attackerId, defenderId, ranged, retaliation = false) {
  const attacker = combat.stacks.find((stack) => stack.id === attackerId);
  const defender = combat.stacks.find((stack) => stack.id === defenderId);
  if (!attacker || !defender) return combat;
  const attackerUnit = unitById(attacker.unitId, attacker.era), defenderUnit = unitById(defender.unitId, defender.era);
  const attackerCount = combatStackCount(attacker), before = combatStackCount(defender);
  const defense = defenderUnit.defense + (defender.defending ? 3 : 0);
  const difference = attackerUnit.attack - defense;
  const attackModifier = difference >= 0 ? 1 + Math.min(3, difference * .05) : 1 / (1 + Math.abs(difference) * .025);
  const rangeModifier = ranged && combatDistance(attacker.position, defender.position) > 10 ? .5 : 1;
  const meleeShootingModifier = !ranged && attackerUnit.ranged ? .5 : 1;
  const baseDamage = attackerCount * (attackerUnit.damage[0] + attackerUnit.damage[1]) / 2;
  const damage = Math.max(1, Math.round(baseDamage * attackModifier * rangeModifier * meleeShootingModifier));
  const updatedDefender = { ...defender, totalHealth: Math.max(0, defender.totalHealth - damage) };
  const after = combatStackCount(updatedDefender);
  const label = retaliation ? " retaliated against " : " struck ";
  const entry = `${attackerUnit.name}${label}${defenderUnit.name} for ${damage} damage${before > after ? ` (${before - after} lost)` : ""}.`;
  return { ...replaceCombatStack(combat, updatedDefender), log: [...combat.log, entry] };
}

function performCombatAttack(combat, attackerId, defenderId) {
  let attacker = combat.stacks.find((stack) => stack.id === attackerId);
  const defender = combat.stacks.find((stack) => stack.id === defenderId);
  const origin = attacker?.position;
  const target = defender?.position;
  const plan = attackPlan(combat, attacker, defender);
  if (!plan) return combat;
  if (plan.route.length) {
    attacker = { ...attacker, position: plan.route.at(-1) };
    combat = replaceCombatStack(combat, attacker);
  }
  if (plan.ranged) {
    attacker = { ...attacker, shots: attacker.shots - 1 };
    combat = replaceCombatStack(combat, attacker);
  }
  combat = strikeCombatStack(combat, attackerId, defenderId, plan.ranged);
  const survivingDefender = combat.stacks.find((stack) => stack.id === defenderId);
  const survivingAttacker = combat.stacks.find((stack) => stack.id === attackerId);
  if (!plan.ranged && combatStackCount(survivingDefender) > 0 && !survivingDefender.retaliated && combatStackCount(survivingAttacker) > 0) {
    combat = replaceCombatStack(combat, { ...survivingDefender, retaliated: true });
    combat = strikeCombatStack(combat, defenderId, attackerId, false, true);
  }
  const finalAttacker = combat.stacks.find((stack) => stack.id === attackerId);
  combat = replaceCombatStack(combat, { ...finalAttacker, done: true, defending: false });
  return recordCombatAction(combat, { type: plan.ranged ? "ranged" : "melee", stackId: attackerId, from: origin, to: finalAttacker.position, target });
}

function nearestEnemyStacks(combat, stack) {
  return livingCombatStacks(combat)
    .filter((target) => target.side !== stack.side)
    .sort((a, b) => combatDistance(stack.position, a.position) - combatDistance(stack.position, b.position) || a.totalHealth - b.totalHealth || a.id.localeCompare(b.id));
}

function performEnemyTurn(combat) {
  const stack = combat.stacks.find((item) => item.id === combat.activeStackId);
  if (!stack || stack.side !== "enemy") return combat;
  const targets = nearestEnemyStacks(combat, stack);
  const attackTarget = targets.find((target) => combatCanAttack(combat, stack.id, target.id));
  if (attackTarget) return performCombatAttack(combat, stack.id, attackTarget.id);
  const destinations = new Set();
  for (const target of targets) for (const tile of combatNeighbors(target.position)) destinations.add(tile);
  const route = findCombatRoute(combat, stack.id, [...destinations]);
  if (route?.length) {
    const movement = route.slice(0, unitById(stack.unitId, stack.era).speed);
    const moved = { ...stack, position: movement.at(-1), done: true };
    const advanced = { ...replaceCombatStack(combat, moved), log: [...combat.log, `${unitById(stack.unitId, stack.era).name} advanced ${movement.length} hex${movement.length === 1 ? "" : "es"}.`] };
    return recordCombatAction(advanced, { type: "move", stackId: stack.id, from: stack.position, to: moved.position, path: movement });
  }
  return replaceCombatStack(combat, { ...stack, defending: true, done: true });
}

function continueCombat(combat) {
  let next = { ...combat, activeStackId: null };
  const result = combatOutcome(next);
  if (result) return { ...next, result, activeStackId: null, log: [...next.log, result === "victory" ? "The enemy formation broke." : "Marcellus's field army was defeated."] };
  let active = nextCombatStack(next);
  if (!active) {
    const stacks = next.stacks.map((stack) => ({ ...stack, done: false, waited: false, defending: false, retaliated: false }));
    next = { ...next, round: next.round + 1, stacks, log: [...next.log, `Round ${next.round + 1} began.`] };
    active = nextCombatStack(next);
  }
  return { ...next, activeStackId: active.id };
}

export function startCombat(game) {
  if (!game.pendingBattle || game.combat) return game;
  const playerPositions = [15, 45, 60, 90, 120];
  const enemyPositions = [29, 59, 74, 104, 134];
  const playerArmy = UNITS.map((unit) => [unit.id, game.army[unit.id] ?? 0]).filter(([, count]) => count > 0);
  if (!playerArmy.length) return { ...game, pendingBattle: null, notice: "Marcellus has no troops available to fight. Recruit an army before returning." };
  const playerStacks = playerArmy.map(([unitId, count], index) => makeCombatStack("player", unitId, count, playerPositions[index], game.era));
  const enemyStacks = enemyArmyFor(game.pendingBattle).map(([unitId, count], index) => makeCombatStack("enemy", unitId, count, enemyPositions[index], game.era));
  const obstacles = BATTLEFIELD_PATTERNS[game.pendingBattle.type] ?? BATTLEFIELD_PATTERNS.field;
  const combat = continueCombat({
    width: COMBAT_WIDTH,
    height: COMBAT_HEIGHT,
    battle: { ...game.pendingBattle },
    round: 1,
    stacks: [...playerStacks, ...enemyStacks],
    obstacles,
    activeStackId: null,
    actionSerial: 0,
    lastAction: null,
    result: null,
    log: [`Battle for ${game.pendingBattle.name} began.`],
  });
  return { ...game, combat, notice: `Battle joined at ${game.pendingBattle.name}.` };
}

export function moveCombatStack(game, destination) {
  const combat = game.combat;
  if (!combat || combat.result) return game;
  const stack = combat.stacks.find((item) => item.id === combat.activeStackId);
  if (!stack || stack.side !== "player") return game;
  const route = findCombatRoute(combat, stack.id, [destination], unitById(stack.unitId, stack.era).speed);
  if (!route?.length) return game;
  const moved = { ...stack, position: destination, done: true, defending: false };
  const advanced = { ...replaceCombatStack(combat, moved), log: [...combat.log, `${unitById(stack.unitId, stack.era).name} moved ${route.length} hex${route.length === 1 ? "" : "es"}.`] };
  const next = recordCombatAction(advanced, { type: "move", stackId: stack.id, from: stack.position, to: destination, path: route });
  return { ...game, combat: continueCombat(next) };
}

export function performEnemyCombatTurn(game) {
  const combat = game.combat;
  const active = combat?.stacks.find((stack) => stack.id === combat.activeStackId);
  if (!combat || combat.result || !active || active.side !== "enemy") return game;
  return { ...game, combat: continueCombat(performEnemyTurn(combat)) };
}

export function attackCombatStack(game, defenderId) {
  const combat = game.combat;
  if (!combat || combat.result) return game;
  const attacker = combat.stacks.find((stack) => stack.id === combat.activeStackId);
  if (!attacker || attacker.side !== "player" || !combatCanAttack(combat, attacker.id, defenderId)) return game;
  return { ...game, combat: continueCombat(performCombatAttack(combat, attacker.id, defenderId)) };
}

export function waitCombatTurn(game) {
  const combat = game.combat;
  const stack = combat?.stacks.find((item) => item.id === combat.activeStackId);
  if (!combat || combat.result || !stack || stack.side !== "player" || stack.waited) return game;
  const waiting = { ...stack, waited: true };
  return { ...game, combat: continueCombat({ ...replaceCombatStack(combat, waiting), log: [...combat.log, `${unitById(stack.unitId, stack.era).name} waited for an opening.`] }) };
}

export function defendCombatTurn(game) {
  const combat = game.combat;
  const stack = combat?.stacks.find((item) => item.id === combat.activeStackId);
  if (!combat || combat.result || !stack || stack.side !== "player") return game;
  const defending = { ...stack, defending: true, done: true };
  return { ...game, combat: continueCombat({ ...replaceCombatStack(combat, defending), log: [...combat.log, `${unitById(stack.unitId, stack.era).name} took a defensive stance.`] }) };
}

export function retreatCombat(game) {
  if (!game.combat || game.combat.result) return game;
  return { ...game, combat: { ...game.combat, result: "retreat", activeStackId: null, log: [...game.combat.log, "Marcellus ordered a retreat."] } };
}

export function createGame() {
  const aurum = adventureTile(12, 10);
  const hero = adventureTile(12, 11);
  const freehaven = adventureTile(42, 8);
  const pinewater = adventureTile(5, 5);
  const redcliff = adventureTile(27, 24);
  const violetworks = adventureTile(42, 19);
  const raiderPass = adventureTile(19, 8);
  const freehavenBandits = adventureTile(39, 8);
  const quarryRaiders = adventureTile(27, 18);
  const southernRaiders = adventureTile(42, 22);
  const pickupGuards = {
    [adventureTile(15, 8)]: raiderPass,
    [adventureTile(16, 7)]: raiderPass,
    [adventureTile(16, 8)]: raiderPass,
    [adventureTile(16, 9)]: raiderPass,
    [adventureTile(38, 7)]: freehavenBandits,
    [adventureTile(38, 8)]: freehavenBandits,
    [adventureTile(39, 7)]: freehavenBandits,
    [adventureTile(40, 9)]: freehavenBandits,
    [adventureTile(25, 17)]: quarryRaiders,
    [adventureTile(26, 17)]: quarryRaiders,
    [adventureTile(28, 17)]: quarryRaiders,
    [adventureTile(29, 18)]: quarryRaiders,
    [adventureTile(40, 21)]: southernRaiders,
    [adventureTile(41, 21)]: southernRaiders,
    [adventureTile(43, 21)]: southernRaiders,
    [adventureTile(44, 23)]: southernRaiders,
  };
  return {
    year: 1, month: 3, monthName: MONTHS[2], era: "Ancient", hero, moves: MAX_MOVEMENT,
    gold: 760, wood: 35, stone: 24, magicDust: 3, research: 70, cities: 1, victories: 0,
    army: { spearmen: 24, slingers: 16, scouts: 7, swordsmen: 0, horsemen: 0 },
    techs: [], activeResearch: null, techProgress: {}, researchChoice: null, pendingBattle: null, combat: null,
    constructionThisTurn: {},
    buildings: { aurum: ["town-hall", "militia-yard", "archery-range", "scout-camp"], freehaven: ["town-hall", "militia-yard"] },
    settlements: {
      aurum: { id: "aurum", name: "Aurum", tile: aurum, footprint: [adventureTile(11, 9), adventureTile(12, 9), adventureTile(13, 9), adventureTile(11, 10), aurum, adventureTile(13, 10)], territory: [[7, 6], [16, 6], [18, 11], [15, 15], [8, 14], [6, 10]], owner: "player", population: 1240, defenders: 0, recruits: { spearmen: 12, slingers: 8, scouts: 3, swordsmen: 0, horsemen: 0 } },
      freehaven: { id: "freehaven", name: "Freehaven", tile: freehaven, footprint: [adventureTile(41, 7), adventureTile(42, 7), adventureTile(43, 7), adventureTile(41, 8), freehaven, adventureTile(43, 8)], territory: [[38, 4], [46, 4], [47, 11], [41, 13], [37, 9]], blockedBy: freehavenBandits, owner: "neutral", population: 680, defenders: 0, recruits: { spearmen: 8, slingers: 5, scouts: 2, swordsmen: 0, horsemen: 0 }, garrison: 0 },
    },
    producers: {
      pinewater: { id: "pinewater", name: "Pinewater Sawmill", kind: "sawmill", resource: "wood", amount: 10, footprint: [adventureTile(4, 4), adventureTile(5, 4), adventureTile(4, 5), pinewater], entrance: pinewater, owner: "neutral", garrison: 24 },
      redcliff: { id: "redcliff", name: "Redcliff Quarry", kind: "quarry", resource: "stone", amount: 8, footprint: [adventureTile(26, 23), adventureTile(27, 23), adventureTile(28, 23), adventureTile(26, 24), redcliff, adventureTile(28, 24)], entrance: redcliff, owner: "neutral", garrison: 32 },
      violetworks: { id: "violetworks", name: "Violet Mineral Works", kind: "dustworks", resource: "magicDust", amount: 2, footprint: [adventureTile(41, 18), adventureTile(42, 18), adventureTile(43, 18), adventureTile(41, 19), violetworks, adventureTile(43, 19)], entrance: violetworks, owner: "neutral", garrison: 38 },
    },
    sites: { [raiderPass]: "raiders", [freehavenBandits]: "freehaven-bandits", [quarryRaiders]: "raiders", [southernRaiders]: "raiders" },
    pickups: {
      [adventureTile(8, 5)]: "dust",
      [adventureTile(24, 8)]: "knowledge",
      [adventureTile(12, 14)]: "timber",
      [adventureTile(15, 8)]: "gold", [adventureTile(16, 7)]: "stone", [adventureTile(16, 8)]: "timber", [adventureTile(16, 9)]: "dust",
      [adventureTile(38, 7)]: "gold", [adventureTile(38, 8)]: "timber", [adventureTile(39, 7)]: "stone", [adventureTile(40, 9)]: "dust",
      [adventureTile(25, 17)]: "stone", [adventureTile(26, 17)]: "gold", [adventureTile(28, 17)]: "timber", [adventureTile(29, 18)]: "dust",
      [adventureTile(40, 21)]: "gold", [adventureTile(41, 21)]: "stone", [adventureTile(43, 21)]: "timber", [adventureTile(44, 23)]: "dust",
    },
    pickupGuards,
    notice: "Aurum yielded 75 gold. Choose a technology or save your research points.",
    log: ["The campaign began in Year 1.", "Marcellus Vale departed Aurum."],
  };
}

export function settlementAt(game, tile) {
  return Object.values(game.settlements).find((settlement) => (settlement.footprint ?? [settlement.tile]).includes(tile)) ?? null;
}

export function producerAt(game, tile) {
  return Object.values(game.producers ?? {}).find((producer) => producer.footprint.includes(tile)) ?? null;
}

function resourceName(resource) {
  return resource === "wood" ? "timber" : resource === "magicDust" ? "magic dust" : resource;
}

function destinationFor(game, tile) {
  const producer = producerAt(game, tile);
  const settlement = settlementAt(game, tile);
  return producer?.entrance ?? settlement?.tile ?? tile;
}

function isPassable(game, tile, routeTarget = null) {
  if (!isTerrainPassable(tile)) return false;
  const producer = producerAt(game, tile);
  const settlement = settlementAt(game, tile);
  const hostileSite = game.sites[tile] === "raiders" || game.sites[tile] === "freehaven-bandits";
  return (!producer || producer.entrance === tile) && (!settlement || settlement.tile === tile) && (!hostileSite || tile === routeTarget);
}

export function canMoveTo(game, index) {
  if (game.moves <= 0 || game.researchChoice || game.pendingBattle) return false;
  const fromRow = Math.floor(game.hero / MAP_WIDTH), fromCol = game.hero % MAP_WIDTH;
  const row = Math.floor(index / MAP_WIDTH), col = index % MAP_WIDTH;
  return isPassable(game, index, index) && Math.abs(fromRow - row) + Math.abs(fromCol - col) === 1;
}

export function findPath(game, requestedTile) {
  if (game.researchChoice || game.pendingBattle) return null;
  const target = destinationFor(game, requestedTile);
  if (target === game.hero || !isPassable(game, target, target)) return null;
  const queue = [game.hero];
  const previous = new Map([[game.hero, null]]);
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
      if (neighbor < 0 || previous.has(neighbor) || !isPassable(game, neighbor, target)) continue;
      previous.set(neighbor, current);
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
  return { type: plannedTarget === target ? "travel" : "preview", target, path, reachablePath: path.slice(0, game.moves), futurePath: path.slice(game.moves) };
}

export function moveAlongPath(game, path) {
  let next = game;
  for (const tile of path) {
    if (!canMoveTo(next, tile)) break;
    const returnTile = next.hero;
    next = collectAt({ ...next, hero: tile, moves: next.moves - 1 });
    if (next.pendingBattle) next = { ...next, pendingBattle: { ...next.pendingBattle, returnTile } };
    if (next.researchChoice || next.pendingBattle) break;
  }
  return next;
}

export function declineBattle(game) {
  const battle = game.pendingBattle;
  if (!battle || game.combat) return game;
  const hero = Number.isInteger(battle.returnTile) ? battle.returnTile : game.hero;
  return {
    ...game,
    hero,
    pendingBattle: null,
    notice: `Marcellus held position outside ${battle.name}. The enemy remains in control.`,
    log: [...game.log, `Held position rather than engaging ${battle.name}.`],
  };
}

export function collectAt(game) {
  const settlement = settlementAt(game, game.hero);
  if (settlement) {
    if (settlement.owner === "player") return { ...game, notice: `Marcellus entered ${settlement.name}. Open Cities to recruit its available troops.` };
    if (settlement.blockedBy && game.sites[settlement.blockedBy]) return { ...game, notice: `You must defeat the bandits nearby before ${settlement.name} can be entered.` };
    return { ...game, pendingBattle: { type: "siege", settlementId: settlement.id, name: settlement.name, strength: settlement.garrison }, notice: `${settlement.name}'s garrison blocks the gates.` };
  }
  const producer = producerAt(game, game.hero);
  if (producer && game.hero === producer.entrance) {
    if (producer.owner === "player") return { ...game, notice: `${producer.name} is under your control and produces ${producer.amount} ${resourceName(producer.resource)} each month.` };
    return { ...game, pendingBattle: { type: "producer", producerId: producer.id, name: producer.name, strength: producer.garrison }, notice: `A guarding force holds ${producer.name}.` };
  }
  const site = game.sites[game.hero];
  if (site === "freehaven-bandits") return { ...game, pendingBattle: { type: "city-blocker", settlementId: "freehaven", name: "Freehaven Bandits", strength: 26 }, notice: "The bandit company outside Freehaven prepares to fight." };
  if (site === "raiders") return { ...game, pendingBattle: { type: "field", name: "March Raiders", strength: 18 }, notice: "A raider company bars the road." };
  const pickup = game.pickups[game.hero];
  if (!pickup) return { ...game, notice: "The army crossed the Western Marches." };
  const guardingCamp = game.pickupGuards?.[game.hero];
  if (guardingCamp && game.sites[guardingCamp]) return { ...game, notice: "Nearby raiders guard this cache. Defeat their camp before claiming these resources." };
  const pickups = { ...game.pickups };
  delete pickups[game.hero];
  if (pickup === "knowledge") {
    const available = RESEARCH.filter((tech) => tech.era === game.era && !game.techs.includes(tech.id)).slice(0, 2);
    return { ...game, pickups, researchChoice: available, notice: "Scholars offer two paths of discovery." };
  }
  if (pickup === "timber") return { ...game, pickups, wood: game.wood + 20, notice: "The army secured 20 timber.", log: [...game.log, "Collected timber from an old logging camp."] };
  if (pickup === "stone") return { ...game, pickups, stone: game.stone + 18, notice: "The army recovered 18 dressed stone.", log: [...game.log, "Recovered a cache of dressed stone."] };
  if (pickup === "dust") return { ...game, pickups, magicDust: game.magicDust + 4, notice: "The army found 4 measures of magical dust.", log: [...game.log, "Recovered rare magical dust."] };
  return { ...game, pickups, gold: game.gold + 100, notice: "The army recovered 100 gold.", log: [...game.log, "Recovered an abandoned pay chest."] };
}

export function resolveBattle(game) {
  const battle = game.pendingBattle;
  const combat = game.combat;
  if (!battle || !combat?.result) return game;
  const army = Object.fromEntries(UNITS.map((unit) => {
    const stack = combat.stacks.find((item) => item.side === "player" && item.unitId === unit.id);
    return [unit.id, combatStackCount(stack)];
  }));
  if (combat.result !== "victory") {
    const capital = game.settlements.aurum;
    const resultName = combat.result === "retreat" ? "retreated" : "was defeated";
    return {
      ...game,
      hero: capital.tile,
      army,
      pendingBattle: null,
      combat: null,
      notice: `Marcellus ${resultName} to ${capital.name}. The enemy still controls ${battle.name}.`,
      log: [...game.log, `Marcellus ${resultName} at ${battle.name}.`],
    };
  }
  if (battle.type === "siege") {
    const settlement = game.settlements[battle.settlementId];
    const settlements = { ...game.settlements, [battle.settlementId]: { ...settlement, owner: "player", garrison: 0 } };
    return { ...game, army, settlements, cities: game.cities + 1, victories: game.victories + 1, pendingBattle: null, combat: null, notice: `${settlement.name} has been conquered and added to your Cities list.`, log: [...game.log, `Captured ${settlement.name} after defeating its garrison.`] };
  }
  if (battle.type === "city-blocker") {
    const settlement = game.settlements[battle.settlementId];
    const sites = { ...game.sites };
    delete sites[settlement.blockedBy];
    const settlements = { ...game.settlements, [settlement.id]: { ...settlement, blockedBy: null, owner: "player", garrison: 0 } };
    return { ...game, army, sites, settlements, cities: game.cities + 1, victories: game.victories + 1, pendingBattle: null, combat: null, notice: `${settlement.name} is free of the bandits and has joined your civilization.`, log: [...game.log, `Defeated the bandits outside ${settlement.name}.`] };
  }
  if (battle.type === "producer") {
    const producer = game.producers[battle.producerId];
    const producers = { ...game.producers, [producer.id]: { ...producer, owner: "player", garrison: 0 } };
    return { ...game, army, producers, victories: game.victories + 1, pendingBattle: null, combat: null, notice: `${producer.name} is secured. It will produce ${producer.amount} ${resourceName(producer.resource)} each month.`, log: [...game.log, `Defeated the guards and took control of ${producer.name}.`] };
  }
  const sites = { ...game.sites };
  delete sites[game.hero];
  return { ...game, army, sites, gold: game.gold + 120, victories: game.victories + 1, pendingBattle: null, combat: null, notice: "The raiders were defeated; 120 gold was recovered.", log: [...game.log, "Defeated a company of raiders."] };
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
  if (!technology || technology.era !== game.era || game.techs.includes(techId)) return game;
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
  const dustIncome = controlledProducers.filter((producer) => producer.resource === "magicDust").reduce((total, producer) => total + producer.amount, 0);
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
  const siteProduction = timberIncome || quarryIncome || dustIncome ? ` Controlled sites produced ${timberIncome} timber, ${quarryIncome} stone, and ${dustIncome} magic dust.` : "";
  return { ...produced, settlements, constructionThisTurn: {}, month: nextMonth, monthName: MONTHS[nextMonth - 1], year: nextYear, moves: MAX_MOVEMENT, gold: game.gold + goldIncome, wood: game.wood + timberIncome + cityTimberIncome, stone: game.stone + stoneIncome + quarryIncome, magicDust: game.magicDust + dustIncome, notice: `${yearMessage} Cities produced ${goldIncome} gold and ${researchIncome} research.${siteProduction}`, log: [...produced.log, yearMessage] };
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

export function recruitFromCity(game, cityId, unitId, amount = 1) {
  const city = game.settlements[cityId];
  const unit = unitForEra(unitId, game.era);
  const cityBuildings = game.buildings[cityId] ?? [];
  const quantity = Number(amount);
  const totalCost = unit ? unit.cost * quantity : Infinity;
  if (!city || city.owner !== "player" || game.hero !== city.tile || !unit || !Number.isInteger(quantity) || quantity < 1 || !cityBuildings.includes(unit.requires) || city.recruits[unitId] < quantity || game.gold < totalCost) return game;
  return { ...game, gold: game.gold - totalCost, army: { ...game.army, [unitId]: game.army[unitId] + quantity }, settlements: { ...game.settlements, [cityId]: { ...city, recruits: { ...city.recruits, [unitId]: city.recruits[unitId] - quantity } } }, notice: `${quantity} ${unit.name} joined Marcellus in ${city.name}.` };
}

export function cityDefense(game, cityId) {
  const city = game.settlements[cityId];
  if (!city) return 0;
  const built = game.buildings[cityId] ?? [];
  return (city.defenders ?? 0) + (built.includes("palisade") ? 4 : 0) + (built.includes("stone-walls") ? 10 : 0) + (built.includes("citadel") ? 20 : 0);
}

export function eraReadiness(game) {
  const eraIndex = ERAS.indexOf(game.era);
  const nextEra = eraIndex >= 0 && eraIndex < ERAS.length - 1 ? ERAS[eraIndex + 1] : null;
  const eraResearch = RESEARCH.filter((technology) => technology.era === game.era);
  const checks = eraResearch.map((technology) => ({ label: `Research ${technology.name}`, met: game.techs.includes(technology.id) }));
  return { checks, nextEra, ready: Boolean(nextEra) && checks.length > 0 && checks.every((check) => check.met) };
}

export function advanceEra(game) {
  const readiness = eraReadiness(game);
  if (!readiness.ready || !readiness.nextEra) return game;
  return {
    ...game,
    era: readiness.nextEra,
    activeResearch: null,
    researchChoice: null,
    notice: `${readiness.nextEra} Age begins. Select a new research project to continue advancing.`,
    log: [...game.log, `The civilization advanced to the ${readiness.nextEra} Age.`],
  };
}
