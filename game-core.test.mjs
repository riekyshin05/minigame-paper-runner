import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const {
  PAPER_TYPES,
  comboWindowForStreak,
  chooseNextPaper,
  createGame,
  submitDirection,
} = require("./game-core.js");

const fixedRng = (values) => {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
};

test("paper color rules map to the requested directions", () => {
  assert.equal(PAPER_TYPES.find((paper) => paper.id === "red").direction, "up");
  assert.equal(PAPER_TYPES.find((paper) => paper.id === "blue").direction, "right");
  assert.equal(PAPER_TYPES.find((paper) => paper.id === "yellow").direction, "left");
  assert.equal(PAPER_TYPES.find((paper) => paper.id === "orange").direction, "down");
});

test("a correct direction raises score and advances to a new paper", () => {
  const game = createGame({ rng: fixedRng([0, 0]) });
  assert.equal(game.currentPaper.id, "red");

  const result = submitDirection(game, "up");

  assert.equal(result.correct, true);
  assert.equal(game.score, 1);
  assert.equal(game.mistakes, 0);
  assert.equal(game.isGameOver, false);
  assert.notEqual(game.currentPaper.id, "red");
});

test("wrong directions add one mistake and end the game immediately", () => {
  const game = createGame({ rng: fixedRng([0]) });

  const result = submitDirection(game, "left");

  assert.equal(result.correct, false);
  assert.equal(game.score, 0);
  assert.equal(game.mistakes, 1);
  assert.equal(game.isGameOver, true);
  assert.equal(game.currentPaper.id, "red");
});

test("correct answers build a streak for escalating feedback", () => {
  const game = createGame({ rng: fixedRng([0, 0, 0]) });

  const first = submitDirection(game, "up", { now: 1000 });
  const second = submitDirection(game, game.currentPaper.direction, { now: 1900 });

  assert.equal(first.streak, 1);
  assert.equal(first.pointsAwarded, 1);
  assert.equal(second.streak, 2);
  assert.equal(second.pointsAwarded, 2);
  assert.equal(game.score, 3);
  assert.equal(game.streak, 2);
  assert.equal(game.maxStreak, 2);
});

test("combo window gets shorter as the streak grows", () => {
  assert.equal(comboWindowForStreak(1), 1000);
  assert.equal(comboWindowForStreak(2), 930);
  assert.equal(comboWindowForStreak(5), 720);
  assert.equal(comboWindowForStreak(20), 450);
});

test("higher streaks must be continued inside the shortened combo window", () => {
  const game = createGame({ rng: fixedRng([0, 0, 0, 0, 0]) });

  submitDirection(game, "up", { now: 1000 });
  submitDirection(game, game.currentPaper.direction, { now: 1900 });
  const lateForX2 = submitDirection(game, game.currentPaper.direction, { now: 2850 });

  assert.equal(lateForX2.correct, true);
  assert.equal(lateForX2.streak, 1);
  assert.equal(game.maxStreak, 2);
});

test("correct answers after the combo window restart the streak", () => {
  const game = createGame({ rng: fixedRng([0, 0, 0]) });

  submitDirection(game, "up", { now: 1000 });
  const late = submitDirection(game, game.currentPaper.direction, { now: 2001 });

  assert.equal(late.correct, true);
  assert.equal(late.streak, 1);
  assert.equal(late.pointsAwarded, 1);
  assert.equal(game.score, 2);
  assert.equal(game.streak, 1);
});

test("wrong answers reset the streak without changing the current paper", () => {
  const game = createGame({ rng: fixedRng([0, 0]) });

  submitDirection(game, "up", { now: 1000 });
  const paperAfterCorrect = game.currentPaper.id;
  const miss = submitDirection(game, "up", { now: 1200 });

  assert.equal(miss.correct, false);
  assert.equal(miss.streak, 0);
  assert.equal(game.streak, 0);
  assert.equal(game.currentPaper.id, paperAfterCorrect);
});

test("new games prepare upcoming papers for the visible stack", () => {
  const game = createGame({ rng: fixedRng([0, 0, 0, 0]) });

  assert.equal(game.currentPaper.id, "red");
  assert.deepEqual(
    game.upcomingPapers.map((paper) => paper.id),
    ["blue", "red", "blue"],
  );
});

test("correct answers advance to the first upcoming paper and refill the stack", () => {
  const game = createGame({ rng: fixedRng([0, 0, 0, 0]) });

  submitDirection(game, "up");

  assert.equal(game.currentPaper.id, "blue");
  assert.deepEqual(
    game.upcomingPapers.map((paper) => paper.id),
    ["red", "blue", "red"],
  );
});

test("preview papers always match the next actual papers in order", () => {
  const game = createGame({ rng: fixedRng([0, 0.9, 0.4, 0.9, 0.45, 0.45]) });

  assert.equal(game.currentPaper.id, "red");
  assert.deepEqual(
    game.upcomingPapers.map((paper) => paper.id),
    ["orange", "blue", "orange"],
  );

  submitDirection(game, "up");
  assert.equal(game.currentPaper.id, "orange");
  assert.equal(game.upcomingPapers[0].id, "blue");

  submitDirection(game, "down");
  assert.equal(game.currentPaper.id, "blue");
  assert.equal(game.upcomingPapers[0].id, "orange");
});

test("paper selection avoids immediate repeats when another color is available", () => {
  const next = chooseNextPaper("red", fixedRng([0]));

  assert.notEqual(next.id, "red");
});