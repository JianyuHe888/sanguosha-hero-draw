import assert from "node:assert/strict";
import test from "node:test";
import { filterCatalog, filterDrawPool, normalizeSearch } from "../app/lib/pool-filter.mjs";

const base = {
  faction: "魏",
  rarity: "普通",
  pack: "标准",
  faceToFace: "native",
};
const heroes = [
  { ...base, id: "1", name: "经典将", presetLevel: 1 },
  { ...base, id: "2", name: "进阶将", presetLevel: 3 },
  { ...base, id: "3", name: "不可面杀将", presetLevel: 1, faceToFace: "excluded" },
];
const filters = { factions: ["魏"], packs: ["标准"], rarities: ["普通"] };

test("draw pool is cumulative and always excludes incompatible heroes", () => {
  assert.deepEqual(
    filterDrawPool(heroes, { ...filters, presetLevel: 1, query: "" }).map((hero) => hero.id),
    ["1"],
  );
  assert.deepEqual(
    filterDrawPool(heroes, { ...filters, presetLevel: 3, query: "" }).map((hero) => hero.id),
    ["1", "2"],
  );
  assert.deepEqual(
    filterDrawPool(heroes, { ...filters, presetLevel: 4, query: "不可" }),
    [],
  );
});

test("catalog exposes excluded heroes only for an explicit name search", () => {
  assert.deepEqual(
    filterCatalog(heroes, { ...filters, presetLevel: 4, query: "" }).map((hero) => hero.id),
    ["1", "2"],
  );
  assert.deepEqual(
    filterCatalog(heroes, { ...filters, presetLevel: 1, query: "不可 面杀" }).map((hero) => hero.id),
    ["3"],
  );
});

test("normalizes spaces and middle dots", () => {
  assert.equal(normalizeSearch(" SP · 赵 云 "), "sp赵云");
});
