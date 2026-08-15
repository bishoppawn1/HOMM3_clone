import assert from "node:assert/strict";
import test from "node:test";
import {
  BOARD,
  BUILDINGS,
  COMBAT_HEIGHT,
  COMBAT_WIDTH,
  MAP_HEIGHT,
  MAP_WIDTH,
  MAX_COMMANDER_STACKS,
  MAX_MOVEMENT,
  MAX_TROOPS_PER_STACK,
  ERA_ADVANCEMENT_TECHS,
  RESEARCH,
  UNITS,
  adventureTile,
  advanceMonth,
  advanceEra,
  armyStackCount,
  assessBattleThreat,
  attackCombatStack,
  banditGuardAt,
  banditGuardZone,
  buildingResearchBonus,
  buildInCity,
  canMoveTo,
  chooseResearch,
  cityDefense,
  collectAt,
  combatCanAttack,
  combatDistance,
  combatHasLineOfSight,
  combatMovementRemaining,
  combatNeighbors,
  combatPath,
  combatReachable,
  createGame,
  declineBattle,
  defendCombatTurn,
  finishCombatTurn,
  eraReadiness,
  eraVisualFamily,
  estimateTroopRange,
  findPath,
  isTerrainPassable,
  maxRecruitableIntoArmy,
  moveAlongPath,
  moveCombatStack,
  performEnemyCombatTurn,
  producerAt,
  recruitFromCity,
  retreatCombat,
  resolveBattle,
  routeCommand,
  scoutEnemyForce,
  startCombat,
  startResearch,
  strategicMaterialForEra,
  unitForEra,
  unitsForEra,
  waitCombatTurn,
} from "../app/game-core.js";

function siteTile(game, kind) {
  return Number(Object.entries(game.sites).find(([, value]) => value === kind)?.[0]);
}

function pickupTile(game, kind) {
  return Number(Object.entries(game.pickups).find(([, value]) => value === kind)?.[0]);
}

function markCombatVictory(game) {
  const started = startCombat(game);
  return {
    ...started,
    combat: {
      ...started.combat,
      activeStackId: null,
      result: "victory",
      stacks: started.combat.stacks.map((stack) => stack.side === "enemy" ? { ...stack, totalHealth: 0 } : stack),
    },
  };
}

test("the calendar has twelve monthly turns and restores sixteen movement", () => {
  const next = advanceMonth({ ...createGame(), month: 12, monthName: "December", year: 4, moves: 0 });
  assert.equal(next.month, 1);
  assert.equal(next.monthName, "January");
  assert.equal(next.year, 5);
  assert.equal(next.moves, MAX_MOVEMENT);
  assert.equal(MAX_MOVEMENT, 16);
});

test("monthly production includes every owned city and its buildings", () => {
  const game = createGame();
  game.cities = 2;
  game.settlements.freehaven.owner = "player";
  game.buildings.aurum = ["town-hall", "militia-yard", "mason-yard", "archive"];
  game.activeResearch = null;
  const next = advanceMonth(game);
  assert.equal(next.gold, game.gold + 150);
  assert.equal(next.stone, game.stone + 8);
  assert.equal(next.research, game.research + 60);
  assert.equal(next.settlements.aurum.recruits.spearmen, game.settlements.aurum.recruits.spearmen + 4);
});

test("a Bank adds monthly gold income", () => {
  const game = createGame();
  game.buildings.aurum.push("bank");
  const next = advanceMonth(game);
  assert.equal(next.gold, game.gold + 175);
});

test("every player technology names a valid building and a concrete improvement", () => {
  const buildingIds = new Set(BUILDINGS.map((building) => building.id));
  assert.equal(RESEARCH.length, 18);
  for (const technology of RESEARCH) {
    assert.equal(buildingIds.has(technology.building), true, `${technology.name} must improve a real building`);
    assert.match(technology.improvement, /^\+/);
    assert.equal(Object.keys(technology.effects).length > 0, true);
  }
});

test("completed research improves constructed buildings in player cities only", () => {
  const game = createGame();
  game.techs = ["bronze", "records", "civic-law"];
  game.activeResearch = null;
  game.buildings.aurum = ["town-hall", "militia-yard", "archive"];
  game.buildings.freehaven = ["town-hall", "militia-yard", "archive"];
  const next = advanceMonth(game);
  assert.equal(next.gold, game.gold + 100);
  assert.equal(next.research, game.research + 70);
  assert.equal(next.settlements.aurum.recruits.spearmen, game.settlements.aurum.recruits.spearmen + 6);
  assert.equal(next.settlements.freehaven.recruits.spearmen, game.settlements.freehaven.recruits.spearmen);

  const withoutArchive = { ...game, buildings: { ...game.buildings, aurum: ["town-hall", "militia-yard"] } };
  assert.equal(advanceMonth(withoutArchive).research, game.research + 35);
});

test("research bonuses expose the completed player upgrade and strengthen city defense", () => {
  const game = createGame();
  assert.deepEqual(buildingResearchBonus(game, "garrison"), { gold: 0, wood: 0, stone: 0, research: 0, defense: 0, recruits: {} });
  const upgraded = { ...game, techs: ["radio"], buildings: { ...game.buildings, aurum: [...game.buildings.aurum, "garrison"] } };
  assert.equal(buildingResearchBonus(upgraded, "garrison").defense, 8);
  assert.equal(cityDefense(upgraded, "aurum"), cityDefense(game, "aurum") + 8);
});

test("the adventure map uses a seventy-two-by-forty-five hidden movement grid", () => {
  assert.equal(MAP_WIDTH, 72);
  assert.equal(MAP_HEIGHT, 45);
  assert.equal(BOARD.length, 3240);
  assert.equal(BOARD.includes("mountain"), true);
  assert.equal(BOARD.includes("dense-forest"), true);
  const coastStarts = Array.from({ length: MAP_HEIGHT }, (_, row) => BOARD.findIndex((terrain, tile) => Math.floor(tile / MAP_WIDTH) === row && terrain === "water") % MAP_WIDTH);
  assert.equal(new Set(coastStarts).size >= 4, true);
});

test("movement permits adjacent land and blocks water, mountains, dense forest, distance, and exhausted armies", () => {
  const game = createGame();
  assert.equal(canMoveTo(game, adventureTile(18, 18)), true);
  assert.equal(canMoveTo({ ...game, hero: adventureTile(28, 1) }, adventureTile(29, 1)), false);
  assert.equal(canMoveTo({ ...game, hero: adventureTile(17, 1) }, adventureTile(16, 1)), false);
  assert.equal(canMoveTo({ ...game, hero: adventureTile(66, 1) }, adventureTile(67, 1)), false);
  assert.equal(canMoveTo(game, adventureTile(20, 17)), false);
  assert.equal(canMoveTo({ ...game, moves: 0 }, adventureTile(18, 18)), false);
});

test("continuous winding blockers create mountain passes and routes detour around living raiders", () => {
  const game = createGame();
  const westernCenters = [];
  for (let row = 0; row < MAP_HEIGHT; row += 1) {
    const spine = Array.from({ length: 13 }, (_, offset) => BOARD[adventureTile(23 + offset, row)]);
    assert.equal(spine.includes("road") || spine.includes("mountain"), true);
    const mountainColumns = Array.from({ length: 13 }, (_, offset) => 23 + offset).filter((col) => BOARD[adventureTile(col, row)] === "mountain");
    if (mountainColumns.length) westernCenters.push(Math.round(mountainColumns.reduce((sum, col) => sum + col, 0) / mountainColumns.length));
  }
  assert.equal(new Set(westernCenters).size >= 6, true);
  const freehavenRoute = findPath(game, game.settlements.freehaven.tile);
  assert.equal(freehavenRoute.some((tile) => game.sites[tile]), false);
  assert.equal(freehavenRoute.every((tile) => banditGuardAt(game, tile) === null), true);
  const unguardedRoute = findPath({ ...game, sites: {} }, game.settlements.freehaven.tile);
  assert.equal(unguardedRoute.length < freehavenRoute.length, true);
  assert.equal(unguardedRoute.includes(game.settlements.freehaven.blockedBy), true);
});

test("deliberately targeting a raider site still plots a route into battle", () => {
  const game = createGame();
  const raiders = siteTile(game, "raiders");
  const route = findPath(game, raiders);
  assert.equal(route.at(-1), raiders);
  assert.equal(route.slice(0, -1).some((tile) => game.sites[tile]), false);
});

test("every settlement and producer entrance remains connected to the capital", () => {
  const game = createGame();
  const destinations = [
    ...Object.values(game.settlements).map((settlement) => settlement.tile),
    ...Object.values(game.producers).map((producer) => producer.entrance),
  ];
  for (const destination of destinations) {
    assert.equal(isTerrainPassable(destination), true);
    if (destination !== game.hero) assert.notEqual(findPath(game, destination), null);
  }
});

test("the first route command previews a path and the second command travels it", () => {
  const game = createGame();
  const destination = adventureTile(18, 20);
  const preview = routeCommand(game, null, destination);
  assert.equal(preview.type, "preview");
  assert.equal(preview.target, destination);
  assert.equal(preview.path.length, 3);
  assert.equal(routeCommand(game, preview.target, adventureTile(19, 20)).type, "preview");
  const confirmed = routeCommand(game, preview.target, destination);
  assert.equal(confirmed.type, "travel");
  const moved = moveAlongPath(game, confirmed.path);
  assert.equal(moved.hero, destination);
  assert.equal(moved.moves, game.moves - 3);
});

test("scouting reports approximate numerical ranges for hostile forces", () => {
  assert.deepEqual(estimateTroopRange(13), { minimum: 12, maximum: 25 });
  assert.deepEqual(estimateTroopRange(75), { minimum: 51, maximum: 100 });

  const game = createGame();
  const raiders = siteTile(game, "raiders");
  const preview = routeCommand(game, null, raiders);
  assert.equal(preview.type, "preview");
  assert.equal(preview.scouting.name, "March Raiders");
  assert.deepEqual(preview.scouting.units.map((unit) => unit.name), ["Spearmen", "Slingers", "Scouts"]);
  assert.match(preview.notice, /Scouts estimate/);
  assert.equal(routeCommand(game, preview.target, raiders).scouting, null);
});

test("battle threat ratings compare the commander's army with the encountered force", () => {
  const game = createGame();
  const battle = { type: "field", name: "Rating Trial", strength: 18 };
  assert.equal(assessBattleThreat(game, battle).level, "green");
  assert.equal(assessBattleThreat({ ...game, army: { spearmen: 10, slingers: 5, scouts: 2 } }, battle).level, "yellow");
  assert.equal(assessBattleThreat({ ...game, army: { spearmen: 6, slingers: 3, scouts: 1 } }, battle).level, "orange");
  assert.equal(assessBattleThreat({ ...game, army: { spearmen: 2, slingers: 0, scouts: 0 } }, battle).level, "red");
  assert.equal(assessBattleThreat({ ...game, pendingBattle: null }), null);
});

test("neutral resource producers are guarded by scoutable bandits", () => {
  const game = createGame();
  for (const producer of Object.values(game.producers)) {
    const force = scoutEnemyForce(game, producer.entrance);
    assert.equal(force.name, producer.name);
    assert.equal(force.units.length, 3);
    assert.match(routeCommand(game, null, producer.entrance).notice, /Scouts estimate/);
    assert.match(collectAt({ ...game, hero: producer.entrance }).notice, /Bandits are holding/);
  }
});

test("pathfinding rejects natural barriers but uses the guarded mountain passes", () => {
  const game = createGame();
  assert.equal(findPath(game, adventureTile(68, 10)), null);
  assert.equal(findPath(game, adventureTile(29, 1)), null);
  assert.equal(findPath(game, adventureTile(16, 1)), null);
  const command = routeCommand({ ...game, moves: 2 }, null, adventureTile(12, 19));
  assert.equal(command.path.length, 8);
  assert.equal(command.reachablePath.length, 2);
  assert.equal(command.futurePath.length, 6);
  const moved = moveAlongPath({ ...game, moves: 2 }, command.path);
  assert.equal(moved.hero, command.reachablePath.at(-1));
  assert.equal(moved.moves, 0);
});

test("dense forest leaves a clear buffer around every road", () => {
  for (let tile = 0; tile < BOARD.length; tile += 1) {
    if (BOARD[tile] !== "dense-forest") continue;
    const row = Math.floor(tile / MAP_WIDTH);
    const col = tile % MAP_WIDTH;
    for (let rowOffset = -2; rowOffset <= 2; rowOffset += 1) {
      for (let colOffset = -2; colOffset <= 2; colOffset += 1) {
        if (Math.abs(rowOffset) + Math.abs(colOffset) > 2) continue;
        const nearRow = row + rowOffset;
        const nearCol = col + colOffset;
        if (nearRow < 0 || nearRow >= MAP_HEIGHT || nearCol < 0 || nearCol >= MAP_WIDTH) continue;
        assert.notEqual(BOARD[adventureTile(nearCol, nearRow)], "road");
      }
    }
  }
});

test("resource pickups are consumed permanently and stone replaces food", () => {
  const initial = createGame();
  const tile = pickupTile(initial, "stone");
  const sites = { ...initial.sites };
  delete sites[initial.pickupGuards[tile]];
  const game = { ...initial, sites, hero: tile };
  assert.equal("food" in game, false);
  const collected = collectAt(game);
  assert.equal(collected.stone, game.stone + 18);
  assert.equal(collected.pickups[tile], undefined);
  assert.equal(advanceMonth(collected).pickups[tile], undefined);
});

test("strategic materials change identity by age and remain collectible", () => {
  assert.deepEqual(["Ancient", "Classical", "Medieval", "Gunpowder", "Industrial", "Modern"].map((era) => strategicMaterialForEra(era).name), ["Bronze", "Iron", "Steel", "Saltpeter", "Oil", "Fuel"]);
  const initial = createGame();
  const tile = pickupTile(initial, "strategic");
  const game = { ...initial, hero: tile };
  const collected = collectAt(game);
  assert.equal(collected.strategicMaterial, game.strategicMaterial + 4);
  assert.match(collected.notice, /bronze ingots/);
  assert.equal(collected.pickups[tile], undefined);
});

test("each bandit encounter occupies one unique map tile", () => {
  const game = createGame();
  const banditTiles = Object.entries(game.sites)
    .filter(([, site]) => site === "raiders" || site === "freehaven-bandits")
    .map(([tile]) => Number(tile));

  assert.equal(banditTiles.length, 4);
  assert.equal(new Set(banditTiles).size, 4);
  assert.equal(Object.values(game.pickupGuards).every((guard) => banditTiles.includes(guard)), true);
});

test("guarded resource pickups sit exactly one square from their bandit", () => {
  const game = createGame();
  const resourceTiles = Object.entries(game.pickups).filter(([, pickup]) => pickup !== "knowledge");
  const guardedTiles = Object.entries(game.pickupGuards);
  assert.equal(resourceTiles.length, 18);
  assert.equal(guardedTiles.length, 16);
  assert.equal(resourceTiles.filter(([tile]) => game.pickupGuards[tile] === undefined).length, 2);

  const perCamp = new Map();
  for (const [tileText, guard] of guardedTiles) {
    const tile = Number(tileText);
    assert.equal(game.sites[guard] === "raiders" || game.sites[guard] === "freehaven-bandits", true);
    const horizontalDistance = Math.abs(tile % MAP_WIDTH - guard % MAP_WIDTH);
    const verticalDistance = Math.abs(Math.floor(tile / MAP_WIDTH) - Math.floor(guard / MAP_WIDTH));
    assert.equal(Math.max(horizontalDistance, verticalDistance), 1);
    perCamp.set(guard, (perCamp.get(guard) ?? 0) + 1);
  }
  assert.deepEqual([...perCamp.values()].sort(), [4, 4, 4, 4]);
});

test("entering or targeting any tile in a bandit's three-by-three zone prompts combat", () => {
  const game = createGame();
  const camp = siteTile(game, "raiders");
  const guardedZone = banditGuardZone(camp);
  assert.equal(guardedZone.length, 9);
  for (const tile of guardedZone.filter(isTerrainPassable)) assert.equal(scoutEnemyForce(game, tile).target, tile);
  const cache = Number(Object.keys(game.pickupGuards).find((tile) => game.pickupGuards[tile] === camp));
  const route = findPath(game, cache);
  assert.equal(route.at(-1), cache);
  assert.match(routeCommand(game, null, cache).notice, /must defeat the bandits/i);

  const emptyGuardedTile = guardedZone.find((tile) => tile !== camp && game.pickups[tile] === undefined && isTerrainPassable(tile));
  const preview = routeCommand(game, null, emptyGuardedTile);
  assert.equal(preview.scouting.name, "March Raiders");
  assert.match(preview.notice, /3-by-3 area/);

  const approached = moveAlongPath(game, route);
  assert.equal(banditGuardAt(game, approached.hero), camp);
  assert.equal(approached.pendingBattle.siteTile, camp);
  assert.equal(approached.pickups[cache], game.pickups[cache]);
});

test("supplies near camps cannot be collected until their bandits are defeated", () => {
  const initial = createGame();
  const camp = siteTile(initial, "raiders");
  const cache = Number(Object.keys(initial.pickupGuards).find((tile) => initial.pickupGuards[tile] === camp));
  const refused = collectAt({ ...initial, hero: cache });
  assert.equal(refused.pickups[cache], initial.pickups[cache]);
  assert.equal(refused.pendingBattle.siteTile, camp);

  const confronted = collectAt({ ...initial, hero: camp });
  const cleared = resolveBattle(markCombatVictory(confronted));
  assert.equal(cleared.sites[camp], undefined);
  const collected = collectAt({ ...cleared, hero: cache });
  assert.equal(collected.pickups[cache], undefined);
});

test("a Knowledge Hut offers two choices and applies only the selected research bonus", () => {
  const initial = createGame();
  const opened = collectAt({ ...initial, hero: pickupTile(initial, "knowledge") });
  assert.equal(opened.researchChoice.length, 2);
  const [selected, rejected] = opened.researchChoice;
  const resolved = chooseResearch(opened, selected.id);
  assert.equal(resolved.research, opened.research);
  assert.equal(resolved.techProgress[selected.id], selected.bonus);
  assert.equal(resolved.techs.includes(rejected.id), false);
  assert.equal(resolved.researchChoice, null);
  assert.equal(resolved.cities, opened.cities);
});

test("research points stay stored without an active project", () => {
  const game = { ...createGame(), research: 70, activeResearch: null };
  const next = advanceMonth(game);
  assert.equal(next.research, 105);
  assert.deepEqual(next.techProgress, {});
});

test("stored and monthly points go into the selected technology", () => {
  const started = startResearch({ ...createGame(), research: 70 }, "bronze");
  assert.equal(started.research, 0);
  assert.equal(started.techProgress.bronze, 70);
  const next = advanceMonth(started);
  assert.equal(next.techProgress.bronze, 105);
  assert.equal(next.research, 0);
});

test("completed research keeps excess points in storage", () => {
  const completed = startResearch({ ...createGame(), research: 300 }, "surveying");
  assert.equal(completed.techProgress.surveying, 180);
  assert.equal(completed.research, 120);
  assert.equal(completed.activeResearch, null);
  assert.equal(completed.techs.includes("surveying"), true);
});

test("capital and neutral city occupy separate traversable map tiles", () => {
  const game = createGame();
  assert.equal(game.settlements.aurum.tile, adventureTile(18, 16));
  assert.equal(isTerrainPassable(game.settlements.aurum.tile), true);
  assert.equal(isTerrainPassable(game.settlements.freehaven.tile), true);
  assert.equal(Object.values(game.pickups).includes("city"), false);
});

test("settlements expose irregular regional tint areas around their map footprints", () => {
  const game = createGame();
  for (const settlement of Object.values(game.settlements)) {
    assert.equal(Array.isArray(settlement.territory), true);
    assert.equal(settlement.territory.length >= 3, true);
  }
});

test("Freehaven refuses entry until its nearby bandits are defeated", () => {
  const initial = createGame();
  const city = initial.settlements.freehaven;
  assert.notEqual(city.blockedBy, city.tile);
  assert.equal(initial.sites[city.blockedBy], "freehaven-bandits");

  const refused = collectAt({ ...initial, hero: city.tile });
  assert.equal(refused.pendingBattle, null);
  assert.equal(refused.settlements.freehaven.owner, "neutral");
  assert.match(refused.notice, /must defeat the bandits nearby/i);

  const confronted = collectAt({ ...initial, hero: city.blockedBy });
  assert.equal(confronted.pendingBattle.type, "city-blocker");
  assert.equal(confronted.pendingBattle.settlementId, "freehaven");
  assert.equal(confronted.cities, 1);
  const deployed = startCombat(confronted);
  assert.equal(deployed.combat.width, COMBAT_WIDTH);
  const liberated = resolveBattle(markCombatVictory(confronted));
  assert.equal(liberated.pendingBattle, null);
  assert.equal(liberated.sites[city.blockedBy], undefined);
  assert.equal(liberated.settlements.freehaven.blockedBy, null);
  assert.equal(liberated.settlements.freehaven.owner, "player");
  assert.equal(liberated.settlements.freehaven.tile, city.tile);
  assert.equal(liberated.cities, 2);
  assert.match(liberated.notice, /free of the bandits/i);
});

test("a commander may hold position instead of entering a prompted battle", () => {
  const game = createGame();
  const raiders = siteTile(game, "raiders");
  const route = findPath(game, raiders);
  const approached = moveAlongPath(game, route);
  const encounterIndex = route.findIndex((tile) => banditGuardAt(game, tile) === raiders);
  const returnTile = encounterIndex > 0 ? route[encounterIndex - 1] : game.hero;
  assert.equal(approached.hero, route[encounterIndex]);
  assert.equal(approached.pendingBattle.type, "field");
  assert.equal(approached.pendingBattle.returnTile, returnTile);

  const held = declineBattle(approached);
  assert.equal(held.hero, returnTile);
  assert.equal(held.pendingBattle, null);
  assert.equal(held.sites[raiders], "raiders");
  assert.equal(held.moves, approached.moves);
  assert.match(held.notice, /held position/i);
});

test("troops can only be recruited while the commander is inside an owned city", () => {
  const away = createGame();
  assert.equal(recruitFromCity(away, "aurum", "spearmen"), away);
  const present = { ...away, hero: away.settlements.aurum.tile };
  const recruited = recruitFromCity(present, "aurum", "spearmen");
  assert.equal(recruited.army.spearmen, present.army.spearmen + 1);
  assert.equal(recruited.settlements.aurum.recruits.spearmen, present.settlements.aurum.recruits.spearmen - 1);
  assert.equal(recruited.gold, present.gold - 24);
});

test("a player can recruit an exact selected quantity", () => {
  const game = createGame();
  game.hero = game.settlements.aurum.tile;
  const recruited = recruitFromCity(game, "aurum", "spearmen", 5);
  assert.equal(recruited.army.spearmen, game.army.spearmen + 5);
  assert.equal(recruited.settlements.aurum.recruits.spearmen, game.settlements.aurum.recruits.spearmen - 5);
  assert.equal(recruited.gold, game.gold - 120);
  assert.equal(recruitFromCity(game, "aurum", "spearmen", 99), game);
});

test("recruitment fills 50-troop stacks and never exceeds ten commander stacks", () => {
  const initial = createGame();
  const army = { spearmen: 49, slingers: 150, scouts: 100, swordsmen: 100, horsemen: 100 };
  const city = { ...initial.settlements.aurum, recruits: { ...initial.settlements.aurum.recruits, spearmen: 20 } };
  const game = { ...initial, hero: city.tile, gold: 10000, army, settlements: { ...initial.settlements, aurum: city } };

  assert.equal(MAX_TROOPS_PER_STACK, 50);
  assert.equal(MAX_COMMANDER_STACKS, 10);
  assert.equal(armyStackCount(game.army), 10);
  assert.equal(maxRecruitableIntoArmy(game.army, "spearmen"), 1);

  const filled = recruitFromCity(game, "aurum", "spearmen", 1);
  assert.equal(filled.army.spearmen, 50);
  assert.equal(armyStackCount(filled.army), 10);
  assert.equal(maxRecruitableIntoArmy(filled.army, "spearmen"), 0);
  assert.equal(recruitFromCity(filled, "aurum", "spearmen", 1), filled);
});

test("combat splits oversized troop lines and recombines every surviving stack", () => {
  const initial = createGame();
  const pendingBattle = { type: "field", name: "Stack Trial", strength: 18 };
  const game = { ...initial, army: { spearmen: 101, slingers: 0, scouts: 0, swordsmen: 0, horsemen: 0 }, pendingBattle };
  const deployed = startCombat(game);
  const playerStacks = deployed.combat.stacks.filter((stack) => stack.side === "player");

  assert.deepEqual(playerStacks.map((stack) => stack.id), ["player-spearmen", "player-spearmen-2", "player-spearmen-3"]);
  assert.deepEqual(playerStacks.map((stack) => stack.totalHealth / unitForEra("spearmen", "Ancient").health), [50, 50, 1]);
  assert.ok(playerStacks.every((stack) => stack.maxHealth === stack.totalHealth));

  const victory = { ...deployed, combat: { ...deployed.combat, result: "victory", activeStackId: null } };
  assert.equal(resolveBattle(victory).army.spearmen, 101);
});

test("combat deployment rejects armies above the ten-stack command limit", () => {
  const initial = createGame();
  const pendingBattle = { type: "field", name: "Stack Trial", strength: 18 };
  const game = { ...initial, army: { spearmen: 101, slingers: 101, scouts: 101, swordsmen: 101, horsemen: 101 }, pendingBattle };
  const blocked = startCombat(game);
  assert.equal(armyStackCount(game.army), 15);
  assert.equal(blocked.combat, null);
  assert.match(blocked.notice, /cannot command more than 10 stacks/);
});

test("the fast scout line costs half as much as spearmen in every age", () => {
  for (const era of ["Ancient", "Classical", "Medieval", "Gunpowder", "Industrial", "Modern"]) {
    const scout = unitForEra("scouts", era);
    const spearman = unitForEra("spearmen", era);
    assert.equal(scout.cost * 2, spearman.cost);
  }
  const initial = createGame();
  const present = { ...initial, hero: initial.settlements.aurum.tile };
  const recruited = recruitFromCity(present, "aurum", "scouts");
  assert.equal(recruited.army.scouts, present.army.scouts + 1);
  assert.equal(recruited.gold, present.gold - 12);
});

test("every age upgrades each persistent recruitment line with a distinct historical identity", () => {
  const rosters = ["Ancient", "Classical", "Medieval", "Gunpowder", "Industrial", "Modern"].map(unitsForEra);
  for (let line = 0; line < rosters[0].length; line += 1) {
    assert.equal(new Set(rosters.map((roster) => roster[line].name)).size, 6);
  }
  assert.equal(unitForEra("slingers", "Ancient").name, "Slingers");
  assert.equal(unitForEra("slingers", "Classical").name, "Archers");
  assert.equal(unitForEra("slingers", "Modern").name, "Machine Gunners");
  assert.ok(unitForEra("slingers", "Modern").attack > unitForEra("slingers", "Ancient").attack);
  assert.ok(unitForEra("slingers", "Modern").health > unitForEra("slingers", "Ancient").health);
});

test("advanced lines progress into long-range artillery, tanks, and age-specific flying units", () => {
  const ancientArtillery = unitForEra("artillery", "Ancient");
  const modernArtillery = unitForEra("artillery", "Modern");
  assert.equal(ancientArtillery.name, "Stone Throwers");
  assert.equal(ancientArtillery.longRange, true);
  assert.equal(ancientArtillery.range, 12);
  assert.equal(modernArtillery.name, "Rocket Artillery");
  assert.equal(modernArtillery.range, 15);

  assert.equal(unitForEra("armor", "Ancient").name, "War Chariots");
  assert.equal(unitForEra("armor", "Ancient").armored, true);
  assert.equal(unitForEra("armor", "Ancient").ranged, false);
  assert.equal(unitForEra("armor", "Modern").name, "Main Battle Tanks");
  assert.equal(unitForEra("armor", "Modern").ranged, true);

  assert.equal(unitForEra("aircraft", "Ancient").name, "Falcon Scouts");
  assert.equal(unitForEra("aircraft", "Ancient").flying, true);
  assert.equal(unitForEra("aircraft", "Classical").name, "Armored Falcons");
  assert.equal(unitForEra("aircraft", "Medieval").name, "Observation Balloons");
  assert.equal(unitForEra("aircraft", "Gunpowder").name, "Early Dirigibles");
  assert.equal(unitForEra("aircraft", "Gunpowder").flying, true);
  assert.equal(unitForEra("aircraft", "Industrial").name, "Fighter Planes");
  assert.equal(unitForEra("aircraft", "Modern").name, "Utility Helicopters");
  assert.equal(unitForEra("aircraft", "Modern").ranged, true);
});

test("flying formations cross battlefield obstacles while ground formations cannot", () => {
  const initial = createGame();
  const pendingBattle = { type: "field", name: "Flight Trial", strength: 18 };
  const army = Object.fromEntries(UNITS.map((unit) => [unit.id, unit.id === "aircraft" ? 1 : 0]));
  const deployed = startCombat({ ...initial, era: "Gunpowder", army, pendingBattle });
  const aircraft = deployed.combat.stacks.find((stack) => stack.id === "player-aircraft");
  const obstacle = deployed.combat.obstacles[0].tile;
  const adjacent = combatNeighbors(obstacle).find((tile) => !deployed.combat.obstacles.some((item) => item.tile === tile));
  const arranged = { ...deployed.combat, activeStackId: aircraft.id, stacks: deployed.combat.stacks.map((stack) => stack.id === aircraft.id ? { ...stack, position: adjacent } : stack) };
  assert.deepEqual(combatPath(arranged, aircraft.id, obstacle), [obstacle]);
  assert.equal(combatReachable(arranged, aircraft.id).includes(obstacle), true);
});

test("recruitment and tactical stacks use the civilization's current-age unit profile", () => {
  const initial = createGame();
  const classical = { ...initial, era: "Classical", hero: initial.settlements.aurum.tile };
  const hoplites = unitForEra("spearmen", "Classical");
  const recruited = recruitFromCity(classical, "aurum", "spearmen");
  assert.equal(recruited.gold, classical.gold - hoplites.cost);
  assert.match(recruited.notice, /Hoplites/);

  const battle = startCombat({ ...classical, pendingBattle: { type: "field", name: "Test Field", strength: 10 } });
  const stack = battle.combat.stacks.find((item) => item.id === "player-spearmen");
  assert.equal(stack.era, "Classical");
  assert.equal(stack.totalHealth, classical.army.spearmen * hoplites.health);
});

test("the Mason's Yard requires timber rather than stone", () => {
  const game = createGame();
  const built = buildInCity(game, "aurum", "mason-yard");
  assert.equal(built.gold, game.gold - 240);
  assert.equal(built.wood, game.wood - 14);
  assert.equal(built.stone, game.stone);
  assert.equal(built.buildings.aurum.includes("mason-yard"), true);
  assert.equal(buildInCity(built, "aurum", "mason-yard"), built);
});

test("each city may complete only one building per turn", () => {
  const game = { ...createGame(), gold: 5000, wood: 500, stone: 500 };
  const first = buildInCity(game, "aurum", "mason-yard");
  const blocked = buildInCity(first, "aurum", "city-hall");
  assert.equal(blocked, first);
  assert.equal(first.constructionThisTurn.aurum, true);
  assert.equal(first.buildings.aurum.includes("city-hall"), false);

  const nextTurn = advanceMonth(first);
  assert.deepEqual(nextTurn.constructionThisTurn, {});
  const second = buildInCity(nextTurn, "aurum", "city-hall");
  assert.equal(second.buildings.aurum.includes("city-hall"), true);
});

test("owned cities have independent construction opportunities", () => {
  const game = { ...createGame(), gold: 5000, wood: 500, stone: 500 };
  game.settlements.freehaven.owner = "player";
  const aurumBuilt = buildInCity(game, "aurum", "mason-yard");
  const bothBuilt = buildInCity(aurumBuilt, "freehaven", "market");
  assert.equal(bothBuilt.buildings.aurum.includes("mason-yard"), true);
  assert.equal(bothBuilt.buildings.freehaven.includes("market"), true);
  assert.equal(bothBuilt.constructionThisTurn.aurum, true);
  assert.equal(bothBuilt.constructionThisTurn.freehaven, true);
});

test("construction enforces the civic and military prerequisite tree", () => {
  const game = { ...createGame(), gold: 5000, wood: 300, stone: 300 };
  assert.equal(buildInCity(game, "aurum", "bank"), game);
  assert.equal(buildInCity(game, "aurum", "barracks-ii"), game);
  const masonry = buildInCity(game, "aurum", "mason-yard");
  const city = buildInCity(advanceMonth(masonry), "aurum", "city-hall");
  assert.equal(city.buildings.aurum.includes("city-hall"), true);
  const workshop = buildInCity(advanceMonth(city), "aurum", "workshop");
  const archive = buildInCity(advanceMonth(workshop), "aurum", "archive");
  const market = buildInCity(advanceMonth(archive), "aurum", "market");
  const bank = buildInCity(advanceMonth(market), "aurum", "bank");
  assert.equal(bank.buildings.aurum.includes("bank"), true);
  const barracks = buildInCity(advanceMonth(bank), "aurum", "barracks-ii");
  assert.equal(barracks.buildings.aurum.includes("barracks-ii"), true);
  assert.equal(barracks.settlements.aurum.recruits.swordsmen, 2);
  const palisade = buildInCity(advanceMonth(barracks), "aurum", "palisade");
  const garrison = buildInCity(advanceMonth(palisade), "aurum", "garrison");
  assert.equal(garrison.buildings.aurum.includes("garrison"), true);
  const stable = buildInCity(advanceMonth(garrison), "aurum", "stable");
  assert.equal(stable.buildings.aurum.includes("stable"), true);
});

test("the construction catalog is a full five-tier tree", () => {
  assert.ok(BUILDINGS.length >= 25);
  assert.equal(Math.max(...BUILDINGS.map((building) => building.tier)), 5);
  assert.deepEqual(new Set(BUILDINGS.map((building) => building.branch)), new Set(["economy", "civic", "military", "defense"]));
});

test("advanced construction and recruitment consume the current strategic material", () => {
  const initial = createGame();
  const foundry = BUILDINGS.find((building) => building.id === "foundry");
  const prepared = {
    ...initial,
    hero: initial.settlements.aurum.tile,
    gold: 5000,
    wood: 500,
    stone: 500,
    strategicMaterial: foundry.material,
    buildings: { ...initial.buildings, aurum: [...initial.buildings.aurum, "workshop"] },
  };
  const built = buildInCity(prepared, "aurum", "foundry");
  assert.equal(built.strategicMaterial, 0);
  assert.equal(built.buildings.aurum.includes("foundry"), true);
  assert.equal(buildInCity({ ...prepared, strategicMaterial: foundry.material - 1 }, "aurum", "foundry").buildings.aurum.includes("foundry"), false);

  const artillery = unitForEra("artillery", "Ancient");
  const recruitable = {
    ...initial,
    hero: initial.settlements.aurum.tile,
    gold: 5000,
    strategicMaterial: artillery.materialCost * 2,
    buildings: { ...initial.buildings, aurum: [...initial.buildings.aurum, "siege-workshop"] },
    settlements: { ...initial.settlements, aurum: { ...initial.settlements.aurum, recruits: { ...initial.settlements.aurum.recruits, artillery: 3 } } },
  };
  const recruited = recruitFromCity(recruitable, "aurum", "artillery", 2);
  assert.equal(recruited.army.artillery, 2);
  assert.equal(recruited.strategicMaterial, 0);
  const materialPoor = { ...recruitable, strategicMaterial: 0 };
  assert.equal(recruitFromCity(materialPoor, "aurum", "artillery"), materialPoor);
});

test("the Garrison creates a small permanent city guard rather than a recruitable unit", () => {
  let game = { ...createGame(), gold: 5000, wood: 500, stone: 500 };
  game = buildInCity(game, "aurum", "city-hall");
  game = advanceMonth(game);
  game = buildInCity(game, "aurum", "barracks-ii");
  game = advanceMonth(game);
  game = buildInCity(game, "aurum", "palisade");
  game = advanceMonth(game);
  game = buildInCity(game, "aurum", "garrison");
  assert.equal(game.settlements.aurum.defenders, 8);
  assert.equal("guards" in game.army, false);
  assert.equal(recruitFromCity(game, "aurum", "guards"), game);
  assert.equal(cityDefense(game, "aurum"), 12);
  const next = advanceMonth(game);
  assert.equal(next.settlements.aurum.defenders, 10);
  assert.equal(cityDefense(next, "aurum"), 14);
});

test("tier-two troops stay locked until their required building exists", () => {
  const initial = createGame();
  const game = { ...initial, hero: initial.settlements.aurum.tile, gold: 3000, wood: 200, stone: 200 };
  game.settlements.aurum.recruits.swordsmen = 3;
  assert.equal(recruitFromCity(game, "aurum", "swordsmen"), game);
  const masonry = buildInCity(game, "aurum", "mason-yard");
  const city = buildInCity(advanceMonth(masonry), "aurum", "city-hall");
  const barracks = buildInCity(advanceMonth(city), "aurum", "barracks-ii");
  const recruited = recruitFromCity(barracks, "aurum", "swordsmen");
  assert.equal(recruited.army.swordsmen, 1);
});

test("resource producers occupy multiple tiles and route visitors beside their artwork", () => {
  const game = createGame();
  const sawmill = game.producers.pinewater;
  const quarry = game.producers.redcliff;
  assert.equal(sawmill.footprint.length, 4);
  assert.equal(quarry.footprint.length, 6);
  assert.equal(producerAt(game, sawmill.footprint[0]).id, sawmill.id);
  assert.equal(producerAt(game, sawmill.entrance).id, sawmill.id);
  for (const producer of Object.values(game.producers)) {
    assert.equal(producer.footprint.includes(producer.entrance), false);
    assert.equal(isTerrainPassable(producer.entrance), true);
  }
  const route = findPath(game, quarry.footprint[0]);
  assert.equal(route.at(-1), quarry.entrance);
});

test("guarded producers require victory before generating timber, stone, and strategic materials", () => {
  const initial = createGame();
  const sawmillBattle = collectAt({ ...initial, hero: initial.producers.pinewater.entrance });
  assert.equal(sawmillBattle.pendingBattle.type, "producer");
  const sawmillCaptured = resolveBattle(markCombatVictory(sawmillBattle));
  assert.equal(sawmillCaptured.producers.pinewater.owner, "player");
  assert.equal(sawmillCaptured.hero, initial.producers.pinewater.entrance);
  assert.equal(sawmillCaptured.producers.pinewater.footprint.includes(sawmillCaptured.hero), false);
  const quarryBattle = collectAt({ ...sawmillCaptured, hero: initial.producers.redcliff.entrance });
  const bothCaptured = resolveBattle(markCombatVictory(quarryBattle));
  const materialBattle = collectAt({ ...bothCaptured, hero: initial.producers.materialworks.entrance });
  const allCaptured = resolveBattle(markCombatVictory(materialBattle));
  const produced = advanceMonth(allCaptured);
  assert.equal(produced.wood, allCaptured.wood + 10);
  assert.equal(produced.stone, allCaptured.stone + 8);
  assert.equal(produced.strategicMaterial, allCaptured.strategicMaterial + 2);
  assert.match(produced.notice, /bronze/);
});

test("tactical combat uses a twenty-one-by-thirteen odd-row hex battlefield", () => {
  assert.equal(COMBAT_WIDTH, 21);
  assert.equal(COMBAT_HEIGHT, 13);
  assert.equal(COMBAT_WIDTH * COMBAT_HEIGHT, 273);
  assert.deepEqual(new Set(combatNeighbors(22)), new Set([21, 23, 1, 2, 43, 44]));
  assert.equal(combatDistance(22, 44), 1);
  assert.equal(combatDistance(21, 41), 20);
});

test("battlefield movement respects stack speed, occupied hexes, and impassable obstacles", () => {
  const initial = createGame();
  const deployed = startCombat(collectAt({ ...initial, hero: siteTile(initial, "raiders") }));
  const active = deployed.combat.stacks.find((stack) => stack.id === deployed.combat.activeStackId);
  assert.equal(active.unitId, "scouts");
  const reachable = combatReachable(deployed.combat);
  assert.equal(reachable.includes(93), false);
  assert.equal(reachable.includes(94), false);
  assert.equal(reachable.includes(85), false);
  assert.equal(reachable.every((tile) => combatDistance(active.position, tile) <= 6), true);
  assert.equal(combatPath(deployed.combat, active.id, 93), null);
});

test("obstacles and intervening stacks block ranged line of sight", () => {
  const initial = createGame();
  const deployed = startCombat(collectAt({ ...initial, hero: siteTile(initial, "raiders") }));
  assert.equal(combatHasLineOfSight(deployed.combat, 43, 61), true);
  const obstructed = { ...deployed.combat, obstacles: [...deployed.combat.obstacles, { tile: 52, kind: "boulder" }] };
  assert.equal(combatHasLineOfSight(obstructed, 43, 61), false);
});

test("Slingers can fire in any direction but only within their six-hex range", () => {
  const initial = createGame();
  const deployed = startCombat(collectAt({ ...initial, hero: siteTile(initial, "raiders") }));
  const stacks = deployed.combat.stacks.map((stack) => {
    if (stack.id === "player-slingers") return { ...stack, position: 127 };
    if (stack.id === "enemy-slingers") return { ...stack, position: 133 };
    if (stack.id === "enemy-scouts") return { ...stack, position: 136 };
    return stack;
  });
  const combat = {
    ...deployed.combat,
    activeStackId: "player-slingers",
    stacks,
    obstacles: [...deployed.combat.obstacles, { tile: 130, kind: "boulder" }],
  };
  assert.equal(unitForEra("slingers", "Ancient").range, 6);
  assert.equal(unitForEra("slingers", "Modern").range, 9);
  assert.equal(combatHasLineOfSight(combat, 127, 133), false);
  assert.equal(combatCanAttack(combat, "player-slingers", "enemy-slingers"), true);
  assert.equal(combatCanAttack(combat, "player-slingers", "enemy-scouts"), false);
});

test("ranged stacks spend shots and inflict deterministic casualties", () => {
  const initial = createGame();
  const deployed = startCombat(collectAt({ ...initial, hero: siteTile(initial, "raiders") }));
  const stacks = deployed.combat.stacks.map((stack) => stack.id === "enemy-slingers" ? { ...stack, position: 133 } : stack.id === "player-slingers" ? { ...stack, position: 127 } : stack);
  const combat = { ...deployed.combat, activeStackId: "player-slingers", stacks };
  assert.equal(combatCanAttack(combat, "player-slingers", "enemy-slingers"), true);
  const before = combat.stacks.find((stack) => stack.id === "enemy-slingers").totalHealth;
  const attacked = attackCombatStack({ ...deployed, combat }, "enemy-slingers");
  assert.equal(attacked.combat.stacks.find((stack) => stack.id === "player-slingers").shots, 7);
  assert.ok(attacked.combat.stacks.find((stack) => stack.id === "enemy-slingers").totalHealth < before);
});

test("movement records an animatable action and enemy turns remain visibly selected before acting", () => {
  const initial = createGame();
  const deployed = startCombat(collectAt({ ...initial, hero: siteTile(initial, "raiders") }));
  const active = deployed.combat.stacks.find((stack) => stack.id === deployed.combat.activeStackId);
  const destination = combatReachable(deployed.combat, active.id)[0];
  const moved = moveCombatStack(deployed, destination);
  assert.deepEqual(
    { type: moved.combat.lastAction.type, stackId: moved.combat.lastAction.stackId, from: moved.combat.lastAction.from, to: moved.combat.lastAction.to },
    { type: "move", stackId: active.id, from: active.position, to: destination },
  );

  const enemySelected = { ...deployed, combat: { ...deployed.combat, activeStackId: "enemy-scouts" } };
  const enemyActed = performEnemyCombatTurn(enemySelected);
  assert.equal(enemyActed.combat.lastAction.stackId, "enemy-scouts");
  assert.notEqual(enemyActed.combat.activeStackId, "enemy-scouts");
});

test("player stacks can split movement across clicks and then attack", () => {
  const initial = createGame();
  const deployed = startCombat(collectAt({ ...initial, hero: siteTile(initial, "raiders") }));
  const active = deployed.combat.stacks.find((stack) => stack.id === deployed.combat.activeStackId);
  const firstDestination = combatReachable(deployed.combat, active.id).find((tile) => combatPath(deployed.combat, active.id, tile).length === 1);
  const firstMove = moveCombatStack(deployed, firstDestination);
  const afterFirstMove = firstMove.combat.stacks.find((stack) => stack.id === active.id);
  assert.equal(firstMove.combat.activeStackId, active.id);
  assert.equal(afterFirstMove.done, false);
  assert.equal(afterFirstMove.movementUsed, 1);
  assert.equal(combatMovementRemaining(firstMove.combat, active.id), unitForEra(active.unitId, active.era).speed - 1);

  const secondDestination = combatReachable(firstMove.combat, active.id).find((tile) => combatPath(firstMove.combat, active.id, tile).length === 1);
  const secondMove = moveCombatStack(firstMove, secondDestination);
  assert.equal(secondMove.combat.activeStackId, active.id);
  assert.equal(secondMove.combat.stacks.find((stack) => stack.id === active.id).movementUsed, 2);
  assert.equal(waitCombatTurn(secondMove), secondMove);

  const arrangedStacks = deployed.combat.stacks.map((stack) => {
    if (stack.id === "player-scouts") return { ...stack, position: 60 };
    if (stack.id === "enemy-scouts") return { ...stack, position: 62, totalHealth: 120, done: true };
    if (stack.side === "enemy") return { ...stack, totalHealth: 0 };
    return stack;
  });
  const arranged = { ...deployed, combat: { ...deployed.combat, activeStackId: "player-scouts", stacks: arrangedStacks } };
  const partialMove = moveCombatStack(arranged, 61);
  const defenderBefore = partialMove.combat.stacks.find((stack) => stack.id === "enemy-scouts").totalHealth;
  assert.equal(combatCanAttack(partialMove.combat, "player-scouts", "enemy-scouts"), true);
  const attacked = attackCombatStack(partialMove, "enemy-scouts");
  assert.ok(attacked.combat.stacks.find((stack) => stack.id === "enemy-scouts").totalHealth < defenderBefore);
  assert.equal(attacked.combat.stacks.find((stack) => stack.id === "player-scouts").done, true);
});

test("finish turn ends a partially moved stack without granting defense", () => {
  const initial = createGame();
  const deployed = startCombat(collectAt({ ...initial, hero: siteTile(initial, "raiders") }));
  const active = deployed.combat.stacks.find((stack) => stack.id === deployed.combat.activeStackId);
  const destination = combatReachable(deployed.combat, active.id).find((tile) => combatPath(deployed.combat, active.id, tile).length === 1);
  const moved = moveCombatStack(deployed, destination);
  const finished = finishCombatTurn(moved);
  const finishedStack = finished.combat.stacks.find((stack) => stack.id === active.id);
  assert.equal(finishedStack.done, true);
  assert.equal(finishedStack.defending, false);
  assert.notEqual(finished.combat.activeStackId, active.id);
  assert.match(finished.combat.log.at(-1), /ended its turn/);
});

test("melee defenders retaliate once and wait or defend changes the current round", () => {
  const initial = createGame();
  const deployed = startCombat(collectAt({ ...initial, hero: siteTile(initial, "raiders") }));
  const arrangedStacks = deployed.combat.stacks.map((stack) => {
    if (stack.id === "player-scouts") return { ...stack, position: 60 };
    if (stack.id === "enemy-scouts") return { ...stack, position: 61, totalHealth: 120, done: true };
    if (stack.side === "enemy") return { ...stack, totalHealth: 0 };
    return stack;
  });
  const arranged = { ...deployed, combat: { ...deployed.combat, activeStackId: "player-scouts", stacks: arrangedStacks } };
  const attacked = attackCombatStack(arranged, "enemy-scouts");
  assert.equal(attacked.combat.stacks.find((stack) => stack.id === "enemy-scouts").retaliated, true);
  assert.equal(attacked.combat.log.filter((entry) => entry.includes("retaliated against")).length, 1);

  const waited = waitCombatTurn(deployed);
  assert.equal(waited.combat.stacks.find((stack) => stack.id === "player-scouts").waited, true);
  assert.equal(waited.combat.stacks.find((stack) => stack.id === "player-scouts").done, false);
  const defended = defendCombatTurn(deployed);
  assert.equal(defended.combat.stacks.find((stack) => stack.id === "player-scouts").defending, true);
  assert.equal(defended.combat.stacks.find((stack) => stack.id === "player-scouts").done, true);
});

test("retreat preserves survivors, returns the commander to Aurum, and leaves the enemy site", () => {
  const game = createGame();
  const raiders = siteTile(game, "raiders");
  const initial = collectAt({ ...game, hero: raiders });
  const retreated = resolveBattle(retreatCombat(startCombat(initial)));
  assert.equal(retreated.hero, retreated.settlements.aurum.tile);
  assert.equal(retreated.combat, null);
  assert.equal(retreated.pendingBattle, null);
  assert.equal(retreated.sites[raiders], "raiders");
  assert.deepEqual(retreated.army, initial.army);
});

test("era advancement requires only the designated technologies", () => {
  const incomplete = { ...createGame(), cities: 20, victories: 20, buildings: { aurum: ["workshop"], freehaven: [] }, techs: ["surveying", "bronze"] };
  assert.equal(eraReadiness(incomplete).ready, false);

  const ready = { ...createGame(), cities: 0, victories: 0, buildings: { aurum: [], freehaven: [] }, techs: ["bronze", "records"], activeResearch: "surveying" };
  const readiness = eraReadiness(ready);
  assert.equal(readiness.ready, true);
  assert.equal(readiness.nextEra, "Classical");
  assert.deepEqual(readiness.requiredTechIds, ["bronze", "records"]);
  assert.deepEqual(readiness.checks.map((check) => check.technologyId), ["bronze", "records"]);
  const advanced = advanceEra(ready);
  assert.equal(advanced.era, "Classical");
  assert.equal(advanced.activeResearch, null);
  assert.match(advanced.notice, /Classical Age begins/);
  assert.equal(advanceEra(advanced), advanced);
});

test("every pre-Modern age has two valid key technologies and one optional project", () => {
  for (const [era, requiredTechIds] of Object.entries(ERA_ADVANCEMENT_TECHS)) {
    const eraResearch = RESEARCH.filter((technology) => technology.era === era);
    if (era === "Modern") {
      assert.deepEqual(requiredTechIds, []);
      continue;
    }
    assert.equal(requiredTechIds.length, 2);
    assert.equal(new Set(requiredTechIds).size, 2);
    assert.ok(requiredTechIds.every((technologyId) => eraResearch.some((technology) => technology.id === technologyId)));
    assert.equal(eraResearch.filter((technology) => !requiredTechIds.includes(technology.id)).length, 1);
  }
});

test("research selection is limited to the current age", () => {
  const ancient = createGame();
  assert.equal(startResearch(ancient, "irrigation"), ancient);
  const ready = { ...ancient, techs: [...ERA_ADVANCEMENT_TECHS.Ancient] };
  const classical = advanceEra(ready);
  assert.equal(startResearch(classical, "surveying"), classical);
  assert.notEqual(startResearch(classical, "irrigation"), classical);
});

test("research-producing city buildings share one construction-tree column", () => {
  const researchBuildings = BUILDINGS.filter((building) => ["archive", "academy", "great-library"].includes(building.id));
  assert.deepEqual(researchBuildings.map((building) => building.x), [4, 4, 4]);
  assert.deepEqual(researchBuildings.map((building) => building.y), [2, 3, 4]);
});

test("landmarks select an era-specific visual family", () => {
  assert.equal(eraVisualFamily("Ancient"), "ancient");
  assert.equal(eraVisualFamily("Classical"), "classical");
  assert.equal(eraVisualFamily("Medieval"), "medieval");
  assert.equal(eraVisualFamily("Industrial"), "industrial");
  assert.equal(eraVisualFamily("Modern"), "modern");
});
