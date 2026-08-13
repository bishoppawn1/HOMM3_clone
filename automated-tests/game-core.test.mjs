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
  waitCombatTurn,
} from "../app/game-core.js";

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

test("the adventure map uses a larger thirty-two-by-twenty hidden movement grid", () => {
  assert.equal(MAP_WIDTH, 32);
  assert.equal(MAP_HEIGHT, 20);
  assert.equal(BOARD.length, 640);
});

test("movement permits adjacent land and blocks water, distance, and exhausted armies", () => {
  const game = createGame();
  assert.equal(canMoveTo(game, 398), true);
  assert.equal(canMoveTo(game, 400), true);
  assert.equal(canMoveTo(game, 335), false);
  assert.equal(canMoveTo({ ...game, hero: 221 }, 222), false);
  assert.equal(canMoveTo({ ...game, moves: 0 }, 398), false);
});

test("the first route command previews a path and the second command travels it", () => {
  const game = createGame();
  const preview = routeCommand(game, null, 395);
  assert.equal(preview.type, "preview");
  assert.equal(preview.target, 395);
  assert.equal(preview.path.length, 4);
  assert.equal(routeCommand(game, preview.target, 396).type, "preview");
  const confirmed = routeCommand(game, preview.target, 395);
  assert.equal(confirmed.type, "travel");
  const moved = moveAlongPath(game, confirmed.path);
  assert.equal(moved.hero, 395);
  assert.equal(moved.moves, game.moves - 4);
});

test("pathfinding rejects water but previews destinations beyond remaining movement", () => {
  const game = createGame();
  assert.equal(findPath(game, 415), null);
  const command = routeCommand({ ...game, moves: 2 }, null, 391);
  assert.equal(command.path.length, 8);
  assert.equal(command.reachablePath.length, 2);
  assert.equal(command.futurePath.length, 6);
  const moved = moveAlongPath({ ...game, moves: 2 }, command.path);
  assert.equal(moved.hero, command.reachablePath.at(-1));
  assert.equal(moved.moves, 0);
});

test("resource pickups are consumed permanently and stone replaces food", () => {
  const game = { ...createGame(), hero: 556 };
  assert.equal("food" in game, false);
  const collected = collectAt(game);
  assert.equal(collected.stone, game.stone + 18);
  assert.equal(collected.pickups[556], undefined);
  assert.equal(advanceMonth(collected).pickups[556], undefined);
});

test("magical dust is a distinct collectible special resource", () => {
  const game = { ...createGame(), hero: 76 };
  const collected = collectAt(game);
  assert.equal(collected.magicDust, game.magicDust + 4);
  assert.equal(collected.pickups[76], undefined);
});

test("a Knowledge Hut offers two choices and applies only the selected research bonus", () => {
  const opened = collectAt({ ...createGame(), hero: 174 });
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
  assert.equal(game.settlements.aurum.tile, 367);
  assert.notEqual(BOARD[game.settlements.aurum.tile], "water");
  assert.notEqual(BOARD[game.settlements.freehaven.tile], "water");
  assert.equal(Object.values(game.pickups).includes("city"), false);
});

test("Freehaven requires a garrison battle and remains on the map after conquest", () => {
  const confronted = collectAt({ ...createGame(), hero: 179 });
  assert.equal(confronted.pendingBattle.type, "siege");
  assert.equal(confronted.cities, 1);
  const deployed = startCombat(confronted);
  assert.equal(deployed.combat.width, COMBAT_WIDTH);
  assert.equal(deployed.combat.obstacles.some((obstacle) => obstacle.kind === "barricade"), true);
  const conquered = resolveBattle(markCombatVictory(confronted));
  assert.equal(conquered.pendingBattle, null);
  assert.equal(conquered.settlements.freehaven.owner, "player");
  assert.equal(conquered.settlements.freehaven.tile, 179);
  assert.equal(conquered.cities, 2);
});

test("a commander may hold position instead of entering a prompted battle", () => {
  const game = createGame();
  const route = findPath(game, 307);
  const approached = moveAlongPath(game, route);
  const returnTile = route.at(-2) ?? game.hero;
  assert.equal(approached.hero, 307);
  assert.equal(approached.pendingBattle.type, "field");
  assert.equal(approached.pendingBattle.returnTile, returnTile);

  const held = declineBattle(approached);
  assert.equal(held.hero, returnTile);
  assert.equal(held.pendingBattle, null);
  assert.equal(held.sites[307], "raiders");
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
  const game = { ...createGame(), hero: 367, gold: 3000, wood: 200, stone: 200 };
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

test("tactical combat uses a fifteen-by-nine odd-row hex battlefield", () => {
  assert.equal(COMBAT_WIDTH, 15);
  assert.equal(COMBAT_HEIGHT, 9);
  assert.deepEqual(new Set(combatNeighbors(16)), new Set([15, 17, 1, 2, 31, 32]));
  assert.equal(combatDistance(16, 32), 1);
  assert.equal(combatDistance(15, 29), 14);
});

test("battlefield movement respects stack speed, occupied hexes, and impassable obstacles", () => {
  const deployed = startCombat(collectAt({ ...createGame(), hero: 307 }));
  const active = deployed.combat.stacks.find((stack) => stack.id === deployed.combat.activeStackId);
  assert.equal(active.unitId, "scouts");
  const reachable = combatReachable(deployed.combat);
  assert.equal(reachable.includes(36), false);
  assert.equal(reachable.includes(37), false);
  assert.equal(reachable.includes(45), false);
  assert.equal(reachable.every((tile) => combatDistance(active.position, tile) <= 6), true);
  assert.equal(combatPath(deployed.combat, active.id, 36), null);
});

test("obstacles and intervening stacks block ranged line of sight", () => {
  const deployed = startCombat(collectAt({ ...createGame(), hero: 307 }));
  assert.equal(combatHasLineOfSight(deployed.combat, 45, 59), true);
  const obstructed = { ...deployed.combat, obstacles: [...deployed.combat.obstacles, { tile: 51, kind: "boulder" }] };
  assert.equal(combatHasLineOfSight(obstructed, 45, 59), false);
});

test("ranged stacks can target enemies anywhere on the battlefield despite intervening obstacles", () => {
  const deployed = startCombat(collectAt({ ...createGame(), hero: 307 }));
  const combat = {
    ...deployed.combat,
    activeStackId: "player-slingers",
    obstacles: [...deployed.combat.obstacles, { tile: 51, kind: "boulder" }],
  };
  assert.equal(combatHasLineOfSight(combat, 45, 59), false);
  assert.equal(combatCanAttack(combat, "player-slingers", "enemy-slingers"), true);
  assert.equal(combatCanAttack(combat, "player-slingers", "enemy-scouts"), true);
});

test("ranged stacks spend shots and inflict deterministic casualties", () => {
  const deployed = startCombat(collectAt({ ...createGame(), hero: 307 }));
  const combat = { ...deployed.combat, activeStackId: "player-slingers" };
  assert.equal(combatCanAttack(combat, "player-slingers", "enemy-slingers"), true);
  const before = combat.stacks.find((stack) => stack.id === "enemy-slingers").totalHealth;
  const attacked = attackCombatStack({ ...deployed, combat }, "enemy-slingers");
  assert.equal(attacked.combat.stacks.find((stack) => stack.id === "player-slingers").shots, 7);
  assert.ok(attacked.combat.stacks.find((stack) => stack.id === "enemy-slingers").totalHealth < before);
});

test("movement records an animatable action and enemy turns remain visibly selected before acting", () => {
  const deployed = startCombat(collectAt({ ...createGame(), hero: 307 }));
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
  const deployed = startCombat(collectAt({ ...createGame(), hero: 307 }));
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
  const initial = collectAt({ ...createGame(), hero: 307 });
  const retreated = resolveBattle(retreatCombat(startCombat(initial)));
  assert.equal(retreated.hero, retreated.settlements.aurum.tile);
  assert.equal(retreated.combat, null);
  assert.equal(retreated.pendingBattle, null);
  assert.equal(retreated.sites[307], "raiders");
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
