import assert from "node:assert/strict";
import test from "node:test";
import {
  BOARD,
  BUILDINGS,
  MAP_HEIGHT,
  MAP_WIDTH,
  MAX_MOVEMENT,
  RESEARCH,
  advanceMonth,
  buildInCity,
  canMoveTo,
  chooseResearch,
  cityDefense,
  collectAt,
  createGame,
  eraReadiness,
  findPath,
  moveAlongPath,
  producerAt,
  recruitFromCity,
  resolveBattle,
  routeCommand,
  startResearch,
} from "../app/game-core.js";

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

test("the adventure map uses a finer twenty-by-twelve hidden movement grid", () => {
  assert.equal(MAP_WIDTH, 20);
  assert.equal(MAP_HEIGHT, 12);
  assert.equal(BOARD.length, 240);
});

test("movement permits adjacent land and blocks water, distance, and exhausted armies", () => {
  const game = createGame();
  assert.equal(canMoveTo(game, 169), true);
  assert.equal(canMoveTo(game, 150), true);
  assert.equal(canMoveTo(game, 110), false);
  assert.equal(canMoveTo({ ...game, hero: 156 }, 157), false);
  assert.equal(canMoveTo({ ...game, moves: 0 }, 149), false);
});

test("the first route command previews a path and the second command travels it", () => {
  const game = createGame();
  const preview = routeCommand(game, null, 166);
  assert.equal(preview.type, "preview");
  assert.equal(preview.target, 166);
  assert.equal(preview.path.length, 4);
  assert.equal(routeCommand(game, preview.target, 167).type, "preview");
  const confirmed = routeCommand(game, preview.target, 166);
  assert.equal(confirmed.type, "travel");
  const moved = moveAlongPath(game, confirmed.path);
  assert.equal(moved.hero, 166);
  assert.equal(moved.moves, game.moves - 4);
});

test("pathfinding rejects water and destinations beyond remaining movement", () => {
  const game = createGame();
  assert.equal(findPath(game, 157), null);
  assert.equal(findPath({ ...game, moves: 2 }, 166), null);
});

test("resource pickups are consumed permanently and stone replaces food", () => {
  const game = { ...createGame(), hero: 216 };
  assert.equal("food" in game, false);
  const collected = collectAt(game);
  assert.equal(collected.stone, game.stone + 18);
  assert.equal(collected.pickups[216], undefined);
  assert.equal(advanceMonth(collected).pickups[216], undefined);
});

test("magical dust is a distinct collectible special resource", () => {
  const game = { ...createGame(), hero: 34 };
  const collected = collectAt(game);
  assert.equal(collected.magicDust, game.magicDust + 4);
  assert.equal(collected.pickups[34], undefined);
});

test("a Knowledge Hut offers two choices and applies only the selected research bonus", () => {
  const opened = collectAt({ ...createGame(), hero: 44 });
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
  assert.equal(game.settlements.aurum.tile, 130);
  assert.notEqual(BOARD[game.settlements.aurum.tile], "water");
  assert.notEqual(BOARD[game.settlements.freehaven.tile], "water");
  assert.equal(Object.values(game.pickups).includes("city"), false);
});

test("Freehaven requires a garrison battle and remains on the map after conquest", () => {
  const confronted = collectAt({ ...createGame(), hero: 75 });
  assert.equal(confronted.pendingBattle.type, "siege");
  assert.equal(confronted.cities, 1);
  const conquered = resolveBattle(confronted);
  assert.equal(conquered.pendingBattle, null);
  assert.equal(conquered.settlements.freehaven.owner, "player");
  assert.equal(conquered.settlements.freehaven.tile, 75);
  assert.equal(conquered.cities, 2);
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

test("the Mason's Yard requires timber rather than stone", () => {
  const game = createGame();
  const built = buildInCity(game, "aurum", "mason-yard");
  assert.equal(built.gold, game.gold - 240);
  assert.equal(built.wood, game.wood - 14);
  assert.equal(built.stone, game.stone);
  assert.equal(built.buildings.aurum.includes("mason-yard"), true);
  assert.equal(buildInCity(built, "aurum", "mason-yard"), built);
});

test("construction enforces the civic and military prerequisite tree", () => {
  const game = { ...createGame(), gold: 5000, wood: 300, stone: 300 };
  assert.equal(buildInCity(game, "aurum", "bank"), game);
  assert.equal(buildInCity(game, "aurum", "barracks-ii"), game);
  const masonry = buildInCity(game, "aurum", "mason-yard");
  const city = buildInCity(masonry, "aurum", "city-hall");
  assert.equal(city.buildings.aurum.includes("city-hall"), true);
  const workshop = buildInCity(city, "aurum", "workshop");
  const archive = buildInCity(workshop, "aurum", "archive");
  const market = buildInCity(archive, "aurum", "market");
  const bank = buildInCity(market, "aurum", "bank");
  assert.equal(bank.buildings.aurum.includes("bank"), true);
  const barracks = buildInCity(bank, "aurum", "barracks-ii");
  assert.equal(barracks.buildings.aurum.includes("barracks-ii"), true);
  assert.equal(barracks.settlements.aurum.recruits.swordsmen, 2);
  const scoutCamp = buildInCity(barracks, "aurum", "scout-camp");
  assert.equal(buildInCity(scoutCamp, "aurum", "stable").buildings.aurum.includes("stable"), true);
  const palisade = buildInCity(scoutCamp, "aurum", "palisade");
  assert.equal(buildInCity(palisade, "aurum", "garrison").buildings.aurum.includes("garrison"), true);
});

test("the construction catalog is a full five-tier tree", () => {
  assert.ok(BUILDINGS.length >= 25);
  assert.equal(Math.max(...BUILDINGS.map((building) => building.tier)), 5);
  assert.deepEqual(new Set(BUILDINGS.map((building) => building.branch)), new Set(["economy", "civic", "military", "defense"]));
});

test("the Garrison creates a small permanent city guard rather than a recruitable unit", () => {
  let game = { ...createGame(), gold: 5000, wood: 500, stone: 500 };
  game = buildInCity(game, "aurum", "city-hall");
  game = buildInCity(game, "aurum", "barracks-ii");
  game = buildInCity(game, "aurum", "palisade");
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
  const game = { ...createGame(), hero: 130, gold: 3000, wood: 200, stone: 200 };
  game.settlements.aurum.recruits.swordsmen = 3;
  assert.equal(recruitFromCity(game, "aurum", "swordsmen"), game);
  const masonry = buildInCity(game, "aurum", "mason-yard");
  const city = buildInCity(masonry, "aurum", "city-hall");
  const barracks = buildInCity(city, "aurum", "barracks-ii");
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

test("guarded producers require victory before generating monthly timber and stone", () => {
  const initial = createGame();
  const sawmillBattle = collectAt({ ...initial, hero: initial.producers.pinewater.entrance });
  assert.equal(sawmillBattle.pendingBattle.type, "producer");
  const sawmillCaptured = resolveBattle(sawmillBattle);
  assert.equal(sawmillCaptured.producers.pinewater.owner, "player");
  const quarryBattle = collectAt({ ...sawmillCaptured, hero: initial.producers.redcliff.entrance });
  const bothCaptured = resolveBattle(quarryBattle);
  const produced = advanceMonth(bothCaptured);
  assert.equal(produced.wood, bothCaptured.wood + 10);
  assert.equal(produced.stone, bothCaptured.stone + 8);
});

test("era advancement requires every concrete readiness condition", () => {
  const almostReady = { ...createGame(), techs: RESEARCH.map((technology) => technology.id), cities: 2, buildings: { aurum: ["workshop"], freehaven: [] }, victories: 0 };
  assert.equal(eraReadiness(almostReady).ready, false);
  assert.equal(eraReadiness({ ...almostReady, victories: 1 }).ready, true);
});
