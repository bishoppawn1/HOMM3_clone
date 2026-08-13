import assert from "node:assert/strict";
import test from "node:test";
import {
  RESEARCH,
  advanceMonth,
  buildInCapital,
  canMoveTo,
  chooseResearch,
  collectAt,
  createGame,
  eraReadiness,
} from "../app/game-core.js";

test("the calendar has twelve monthly turns and rolls into a new year", () => {
  let game = { ...createGame(), month: 12, monthName: "December", year: 4 };
  game = advanceMonth(game);
  assert.equal(game.month, 1);
  assert.equal(game.monthName, "January");
  assert.equal(game.year, 5);
  assert.equal(game.moves, 5);
});

test("monthly production includes city and building income", () => {
  const game = { ...createGame(), cities: 2, buildings: ["granary", "archive"] };
  const next = advanceMonth(game);
  assert.equal(next.gold, game.gold + 150);
  assert.equal(next.food, game.food + 20);
  assert.equal(next.research, game.research + 60);
});

test("movement permits adjacent land and blocks water, distance, and exhausted armies", () => {
  const game = createGame();
  assert.equal(canMoveTo(game, 24), true);
  assert.equal(canMoveTo(game, 29), false);
  assert.equal(canMoveTo({ ...game, hero: 20 }, 27), false);
  assert.equal(canMoveTo({ ...game, moves: 0 }, 24), false);
});

test("a pickup is consumed permanently when collected", () => {
  const game = { ...createGame(), hero: 10 };
  const collected = collectAt(game);
  assert.equal(collected.wood, game.wood + 20);
  assert.equal(collected.pickups[10], undefined);
  assert.equal(advanceMonth(collected).pickups[10], undefined);
});

test("a Knowledge Hut offers two choices and applies only the selected research bonus", () => {
  const opened = collectAt({ ...createGame(), hero: 2 });
  assert.equal(opened.researchChoice.length, 2);
  const [selected, rejected] = opened.researchChoice;
  const resolved = chooseResearch(opened, selected.id);
  assert.equal(resolved.research, opened.research + selected.bonus);
  assert.deepEqual(resolved.techs, [selected.id]);
  assert.equal(resolved.techs.includes(rejected.id), false);
  assert.equal(resolved.researchChoice, null);
  assert.equal(resolved.cities, opened.cities);
  assert.equal(resolved.victories, opened.victories);
  assert.deepEqual(resolved.buildings, opened.buildings);
});

test("building construction charges gold once and grants no free readiness bypass", () => {
  const game = createGame();
  const built = buildInCapital(game, "workshop");
  assert.equal(built.gold, game.gold - 320);
  assert.deepEqual(built.buildings, ["workshop"]);
  assert.equal(buildInCapital(built, "workshop"), built);
  assert.equal(eraReadiness(built).ready, false);
});

test("era advancement requires every concrete readiness condition", () => {
  const almostReady = {
    ...createGame(),
    techs: RESEARCH.map((technology) => technology.id),
    cities: 2,
    buildings: ["workshop"],
    victories: 0,
  };
  assert.equal(eraReadiness(almostReady).ready, false);
  assert.equal(eraReadiness({ ...almostReady, victories: 1 }).ready, true);
});
