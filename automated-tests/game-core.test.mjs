import assert from "node:assert/strict";
import test from "node:test";
import {
  BOARD,
  BUILDINGS,
  COMBAT_HEIGHT,
  COMBAT_WIDTH,
  MAP_HEIGHT,
  MAP_WIDTH,
  MAX_MOVEMENT,
  RESEARCH,
  adventureTile,
  advanceMonth,
  advanceEra,
  attackCombatStack,
  buildInCity,
  canMoveTo,
  chooseResearch,
  cityDefense,
  collectAt,
  combatCanAttack,
  combatDistance,
  combatHasLineOfSight,
  combatNeighbors,
  combatPath,
  combatReachable,
  createGame,
  declineBattle,
  defendCombatTurn,
  eraReadiness,
  eraVisualFamily,
  findPath,
  isTerrainPassable,
  moveAlongPath,
  moveCombatStack,
  performEnemyCombatTurn,
  producerAt,
  recruitFromCity,
  retreatCombat,
  resolveBattle,
  routeCommand,
  startCombat,
  startResearch,
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

test("magical dust is a distinct collectible special resource", () => {
  const initial = createGame();
  const tile = pickupTile(initial, "dust");
  const game = { ...initial, hero: tile };
  const collected = collectAt(game);
  assert.equal(collected.magicDust, game.magicDust + 4);
  assert.equal(collected.pickups[tile], undefined);
});

test("most resource pickups are contained inside visible raider camps", () => {
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
    const distance = Math.abs(tile % MAP_WIDTH - guard % MAP_WIDTH) + Math.abs(Math.floor(tile / MAP_WIDTH) - Math.floor(guard / MAP_WIDTH));
    assert.equal(distance <= 9, true);
    perCamp.set(guard, (perCamp.get(guard) ?? 0) + 1);
  }
  assert.deepEqual([...perCamp.values()].sort(), [4, 4, 4, 4]);
});

test("targeting supplies inside a living camp routes to the bandits first", () => {
  const game = createGame();
  const camp = siteTile(game, "raiders");
  const cache = Number(Object.keys(game.pickupGuards).find((tile) => game.pickupGuards[tile] === camp));
  const route = findPath(game, cache);
  assert.equal(route.at(-1), camp);
  assert.equal(route.includes(cache), false);
});

test("supplies inside camps cannot be collected until their bandits are defeated", () => {
  const initial = createGame();
  const camp = siteTile(initial, "raiders");
  const cache = Number(Object.keys(initial.pickupGuards).find((tile) => initial.pickupGuards[tile] === camp));
  const refused = collectAt({ ...initial, hero: cache });
  assert.equal(refused.pickups[cache], initial.pickups[cache]);
  assert.match(refused.notice, /inside an occupied bandit camp/i);

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
  const returnTile = route.at(-2) ?? game.hero;
  assert.equal(approached.hero, raiders);
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

test("resource producers occupy multiple tiles and route visitors to their entrance", () => {
  const game = createGame();
  const sawmill = game.producers.pinewater;
  const quarry = game.producers.redcliff;
  assert.equal(sawmill.footprint.length, 4);
  assert.equal(quarry.footprint.length, 6);
  assert.equal(producerAt(game, sawmill.footprint[0]).id, sawmill.id);
  const route = findPath(game, quarry.footprint[0]);
  assert.equal(route.at(-1), quarry.entrance);
});

test("guarded producers require victory before generating timber, stone, and magic dust", () => {
  const initial = createGame();
  const sawmillBattle = collectAt({ ...initial, hero: initial.producers.pinewater.entrance });
  assert.equal(sawmillBattle.pendingBattle.type, "producer");
  const sawmillCaptured = resolveBattle(markCombatVictory(sawmillBattle));
  assert.equal(sawmillCaptured.producers.pinewater.owner, "player");
  const quarryBattle = collectAt({ ...sawmillCaptured, hero: initial.producers.redcliff.entrance });
  const bothCaptured = resolveBattle(markCombatVictory(quarryBattle));
  const dustBattle = collectAt({ ...bothCaptured, hero: initial.producers.violetworks.entrance });
  const allCaptured = resolveBattle(markCombatVictory(dustBattle));
  const produced = advanceMonth(allCaptured);
  assert.equal(produced.wood, allCaptured.wood + 10);
  assert.equal(produced.stone, allCaptured.stone + 8);
  assert.equal(produced.magicDust, allCaptured.magicDust + 2);
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

test("early era advancement requires research but not settlements, buildings, or victories", () => {
  const ancientResearch = RESEARCH.filter((technology) => technology.era === "Ancient");
  const incomplete = { ...createGame(), cities: 20, victories: 20, buildings: { aurum: ["workshop"], freehaven: [] }, techs: ancientResearch.slice(0, 2).map((technology) => technology.id) };
  assert.equal(eraReadiness(incomplete).ready, false);

  const ready = { ...createGame(), cities: 1, victories: 0, buildings: { aurum: [], freehaven: [] }, techs: ancientResearch.map((technology) => technology.id), activeResearch: "surveying" };
  assert.equal(eraReadiness(ready).ready, true);
  assert.equal(eraReadiness(ready).nextEra, "Classical");
  const advanced = advanceEra(ready);
  assert.equal(advanced.era, "Classical");
  assert.equal(advanced.activeResearch, null);
  assert.match(advanced.notice, /Classical Age begins/);
  assert.equal(advanceEra(advanced), advanced);
});

test("research selection is limited to the current age", () => {
  const ancient = createGame();
  assert.equal(startResearch(ancient, "irrigation"), ancient);
  const ready = { ...ancient, techs: RESEARCH.filter((technology) => technology.era === "Ancient").map((technology) => technology.id) };
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
