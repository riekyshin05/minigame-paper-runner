import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const runtime = readFileSync(new URL("./game.js", import.meta.url), "utf8");

function zIndexFor(className) {
  const block = css.match(new RegExp(`\\.${className}\\s*\\{([\\s\\S]*?)\\}`));
  const zIndex = block?.[1].match(/z-index:\s*(\d+)/);
  return zIndex ? Number(zIndex[1]) : null;
}

test("the first preview paper is visually closest to the active paper", () => {
  assert.ok(
    zIndexFor("paper-back-one") > zIndexFor("paper-back-two"),
    "paper-back-one should stack above paper-back-two",
  );
  assert.ok(
    zIndexFor("paper-back-two") > zIndexFor("paper-back-three"),
    "paper-back-two should stack above paper-back-three",
  );
});

test("the active paper stays above every preview paper", () => {
  assert.ok(
    zIndexFor("active-paper") > zIndexFor("paper-back-one"),
    "active-paper should stack above the closest preview paper",
  );
});

test("combo badge is available above the active paper", () => {
  assert.match(html, /id="comboBadge"/);
  assert.ok(
    zIndexFor("combo-badge") > zIndexFor("active-paper"),
    "combo badge should stack above the active paper",
  );
});

test("combo gauge is available above the active paper", () => {
  assert.match(html, /id="comboGauge"/);
  assert.match(html, /id="comboGaugeFill"/);
  assert.ok(
    zIndexFor("combo-gauge") > zIndexFor("active-paper"),
    "combo gauge should stack above the active paper",
  );
});

test("max combo is shown in both HUD and game over result", () => {
  assert.match(html, /id="maxComboValue"/);
  assert.match(html, /id="finalMaxCombo"/);
});

test("time attack HUD and result values are available", () => {
  assert.match(html, /id="timeValue"/);
  assert.match(html, /id="clearedValue"/);
  assert.match(html, /id="finalCleared"/);
});

test("paper flip animation is tuned for a faster pace", () => {
  const animationMs = runtime.match(/const ANIMATION_MS = (\d+);/);

  assert.ok(animationMs, "runtime should define ANIMATION_MS");
  assert.ok(Number(animationMs[1]) <= 190, "runtime flip lock should be under 190ms");
  assert.match(css, /animation: flyUp 1[0-9]{2}ms ease-in forwards;/);
  assert.match(css, /animation: flyRight 1[0-9]{2}ms ease-in forwards;/);
  assert.match(css, /animation: flyLeft 1[0-9]{2}ms ease-in forwards;/);
  assert.match(css, /animation: flyDown 1[0-9]{2}ms ease-in forwards;/);
});