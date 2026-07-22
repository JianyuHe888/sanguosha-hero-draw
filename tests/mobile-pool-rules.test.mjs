import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getPresetLevel } from "../scripts/mobile-pool-rules.mjs";

const heroes = JSON.parse(
  await readFile(new URL("../app/data/heroes.json", import.meta.url), "utf8"),
);

test("assigns representative mobile identity releases to cumulative tiers", () => {
  const byName = Object.fromEntries(heroes.map((hero) => [hero.name, hero]));
  assert.equal(getPresetLevel(byName["神吕布"]), 1);
  assert.equal(getPresetLevel(byName["神诸葛亮"]), 1);
  assert.equal(getPresetLevel(byName["界夏侯惇"]), 2);
  assert.equal(getPresetLevel(byName["界徐盛"]), 3);
  assert.equal(getPresetLevel(byName["周群"]), 3);
  assert.equal(getPresetLevel(byName["谋夏侯惇"]), 4);
  assert.equal(getPresetLevel(byName["势魏延"]), 4);
});

test("produces the approved current cumulative counts", () => {
  const enriched = heroes.map((hero) => ({
    ...hero,
    presetLevel: getPresetLevel(hero),
  }));
  assert.equal(enriched.filter((hero) => hero.presetLevel <= 1).length, 149);
  assert.equal(enriched.filter((hero) => hero.presetLevel <= 2).length, 293);
  assert.equal(enriched.filter((hero) => hero.presetLevel <= 3).length, 400);
  assert.equal(enriched.filter((hero) => hero.presetLevel <= 4).length, 573);
});
