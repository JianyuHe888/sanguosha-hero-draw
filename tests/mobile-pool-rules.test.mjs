import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getExistingImage } from "../scripts/mobile-data-cache.mjs";
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

test("every generated hero has valid tier and face-to-face metadata", () => {
  for (const hero of heroes) {
    assert.ok([1, 2, 3, 4].includes(hero.presetLevel), hero.name);
    assert.ok(["native", "assisted", "excluded"].includes(hero.faceToFace), hero.name);
    assert.ok(Array.isArray(hero.assistantModules), hero.name);
    if (hero.faceToFace === "assisted") assert.ok(hero.assistantModules.length > 0, hero.name);
    if (hero.faceToFace === "native") assert.equal(hero.assistantModules.length, 0, hero.name);
  }
});

test("registers every approved mobile-only helper", () => {
  const byName = Object.fromEntries(heroes.map((hero) => [hero.name, hero]));
  assert.deepEqual(byName["左慈"].assistantModules, ["huashen"]);
  assert.deepEqual(byName["界左慈"].assistantModules, ["huashen"]);
  assert.deepEqual(byName["郑玄"].assistantModules, ["zhengjing"]);
  assert.deepEqual(byName["马钧"].assistantModules, ["baixi", "jingxie"]);
  assert.deepEqual(byName["周群"].assistantModules, ["mingyunqian"]);
  assert.deepEqual(byName["十常侍"].assistantModules, ["jiedang"]);
  assert.equal(heroes.filter((hero) => hero.faceToFace === "excluded").length, 0);
});

test("reuses a generated wiki image when refreshing from local caches", () => {
  const image = "https://patchwiki.biligame.com/example.png";
  assert.equal(
    getExistingImage("SP孙策", [{ name: "SP孙策", image }]),
    image,
  );
  assert.equal(getExistingImage("不存在", [{ name: "SP孙策", image }]), "");
});
