import assert from "node:assert/strict";
import test from "node:test";
import {
  BOARD,
  MAX_MOVEMENT,
  RESEARCH,
  advanceMonth,
  buildInCity,
  canMoveTo,
  chooseResearch,
  collectAt,
  createGame,
  eraReadiness,
  recruitFromCity,
  resolveBattle,
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
  game.buildings.aurum = ["mason-yard", "archive"];
  game.activeResearch = null;
  const next = advanceMonth(game);
  assert.equal(next.gold, game.gold + 150);
  assert.equal(next.stone, game.stone + 8);
  assert.equal(next.research, game.research + 60);
  assert.equal(next.settlements.aurum.recruits.spearmen, game.settlements.aurum.recruits.spearmen + 4);
});

test("movement permits adjacent land and blocks water, distance, and exhausted armies", () => {
  const game = createGame();
  assert.equal(canMoveTo(game, 65), true);
  assert.equal(canMoveTo(game, 54), true);
  assert.equal(canMoveTo(game, 40), false);
  assert.equal(canMoveTo({ ...game, hero: 70 }, 71), false);
  assert.equal(canMoveTo({ ...game, moves: 0 }, 65), false);
});

test("resource pickups are consumed permanently and stone replaces food", () => {
  const game = { ...createGame(), hero: 75 };
  assert.equal("food" in game, false);
  const collected = collectAt(game);
  assert.equal(collected.stone, game.stone + 18);
  assert.equal(collected.pickups[75], undefined);
  assert.equal(advanceMonth(collected).pickups[75], undefined);
});

test("magical dust is a distinct collectible special resource", () => {
  const game = { ...createGame(), hero: 9 };
  const collected = collectAt(game);
  assert.equal(collected.magicDust, game.magicDust + 4);
  assert.equal(collected.pickups[9], undefined);
});

test("a Knowledge Hut offers two choices and applies only the selected research bonus", () => {
  const opened = collectAt({ ...createGame(), hero: 14 });
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
  assert.equal(game.settlements.aurum.tile, 54);
  assert.notEqual(BOARD[game.settlements.aurum.tile], "water");
  assert.notEqual(BOARD[game.settlements.freehaven.tile], "water");
  assert.equal(Object.values(game.pickups).includes("city"), false);
});

test("Freehaven requires a garrison battle and remains on the map after conquest", () => {
  const confronted = collectAt({ ...createGame(), hero: 33 });
  assert.equal(confronted.pendingBattle.type, "siege");
  assert.equal(confronted.cities, 1);
  const conquered = resolveBattle(confronted);
  assert.equal(conquered.pendingBattle, null);
  assert.equal(conquered.settlements.freehaven.owner, "player");
  assert.equal(conquered.settlements.freehaven.tile, 33);
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

test("city construction charges gold and stone only once", () => {
  const game = createGame();
  const built = buildInCity(game, "aurum", "workshop");
  assert.equal(built.gold, game.gold - 320);
  assert.equal(built.stone, game.stone - 12);
  assert.deepEqual(built.buildings.aurum, ["workshop"]);
  assert.equal(buildInCity(built, "aurum", "workshop"), built);
  assert.equal(eraReadiness(built).ready, false);
});

test("era advancement requires every concrete readiness condition", () => {
  const almostReady = { ...createGame(), techs: RESEARCH.map((technology) => technology.id), cities: 2, buildings: { aurum: ["workshop"], freehaven: [] }, victories: 0 };
  assert.equal(eraReadiness(almostReady).ready, false);
  assert.equal(eraReadiness({ ...almostReady, victories: 1 }).ready, true);
});
