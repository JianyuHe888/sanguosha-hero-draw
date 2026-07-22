# Progressive Hero Pools and Face-to-Face Assistants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single recommended-pool toggle with four cumulative mobile-edition identity pools, keep only face-to-face-operable generals drawable, and add local in-browser helpers for the five mobile-only mechanics already approved.

**Architecture:** Enrich every generated hero with a cumulative `presetLevel` and face-to-face compatibility metadata. Keep tier assignment, filtering, randomness, and each assistant's state transitions in UI-independent modules so Node's built-in test runner can exercise them. The React page composes a preset selector, the existing filters/draw stage, a detail modal, and one full-screen assistant drawer; all state remains on the device through `localStorage`.

**Tech Stack:** React 19, TypeScript 5.9, Vinext/Vite, Node 22 built-in test runner, CSS, static JSON, Netlify CLI, OpenAI Sites hosting.

## Global Constraints

- Use the current 三国杀移动版 identity roster and current identity skill text as the source of truth.
- Preserve the cumulative invariant `经典身份 ⊂ 界限平衡 ⊂ 进阶平衡 ⊂ 完整将池`.
- Keep `界限平衡` as the default preset and clear the current round whenever the preset changes.
- Never draw a hero whose `faceToFace` value is `excluded`; allow that hero to appear only in an explicit name-search result with an explanation.
- Never infer, reveal, or persist physical deck order, hands, or identities. Assistants output public categories, counts, marks, or random choices only.
- Use `crypto.getRandomValues` in production. Inject deterministic integer generators into pure functions for tests.
- Persist each assistant under `miansha-assistant:v1:<moduleId>:<heroId>` and keep unrelated helpers isolated.
- Do not add authentication, cloud state, a multiplayer room, or a complete 三国杀 rules engine.
- Follow TDD for every rule change: write the failing assertion, run it and record the expected failure, implement the smallest behavior, then rerun.
- Preserve both deploy targets: Netlify at `https://miansha-assistant.netlify.app` and Sites at `https://wujiangtai-hero-draw.liujunyang19.chatgpt.site/`.

---

## Task 1: Encode the four cumulative publication tiers

**Files:**

- Create: `scripts/mobile-pool-rules.mjs`
- Create: `tests/mobile-pool-rules.test.mjs`
- Modify: `package.json`

- [ ] Add a unit-test command before changing production code.

Change the scripts in `package.json` to:

```json
"scripts": {
  "dev": "vinext dev",
  "build": "vinext build",
  "build:netlify": "vite build --config vite.netlify.config.ts",
  "data:update": "node scripts/update-mobile-heroes.mjs --refresh",
  "start": "vinext start",
  "test:unit": "node --test tests/mobile-pool-rules.test.mjs tests/pool-filter.test.mjs tests/assistant-rules.test.mjs",
  "test": "npm run test:unit && npm run build && node --test tests/rendered-html.test.mjs",
  "lint": "eslint . --ignore-pattern dist --ignore-pattern .next --ignore-pattern netlify-dist --ignore-pattern work",
  "db:generate": "drizzle-kit generate"
}
```

- [ ] Write `tests/mobile-pool-rules.test.mjs` with representative and aggregate failures.

```js
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
```

- [ ] Run the focused test and confirm it fails because the module does not exist.

Run: `node --test tests/mobile-pool-rules.test.mjs`

Expected: `ERR_MODULE_NOT_FOUND` for `scripts/mobile-pool-rules.mjs`.

- [ ] Implement `scripts/mobile-pool-rules.mjs` exactly around `sourcePack`, with one named override.

```js
const LEVEL_ONE = [
  /^标准包$/,
  /^神话再临-(风|火|林|山)包$/,
  /^一将成名-201[1-5]$/,
  /^SP武将组[1-5]$/,
];

const LEVEL_TWO = [
  /^界限突破-(标准|风|火|林|山)包$/,
  /^界一将成名-201[1-5]$/,
  /^乱世英杰-201[6-7]$/,
  /^SP武将组[6-9]$/,
];

const LEVEL_THREE = [
  /^神话再临-(阴|雷)包$/,
  /^始计篇-(仁|信|严|勇|智)包$/,
  /^SP武将组1[0-2]$/,
  /^袖里乾坤-武将组[1-3]$/,
  /^将星独具武将组[1-2]$/,
];

export const tierOverrides = Object.freeze({
  界徐盛: 3,
});

export function getPresetLevel(hero) {
  const override = tierOverrides[hero.name];
  if (override) return override;
  if (LEVEL_ONE.some((pattern) => pattern.test(hero.sourcePack))) return 1;
  if (LEVEL_TWO.some((pattern) => pattern.test(hero.sourcePack))) return 2;
  if (LEVEL_THREE.some((pattern) => pattern.test(hero.sourcePack))) return 3;
  return 4;
}
```

- [ ] Rerun the test and confirm both cases pass.

Run: `node --test tests/mobile-pool-rules.test.mjs`

Expected: `2` passed, `0` failed.

- [ ] Commit the tier rule.

```powershell
git add package.json scripts/mobile-pool-rules.mjs tests/mobile-pool-rules.test.mjs
git commit -m "Add cumulative mobile hero pool rules"
```

---

## Task 2: Generate face-to-face compatibility metadata

**Files:**

- Create: `app/data/face-to-face.json`
- Modify: `scripts/update-mobile-heroes.mjs`
- Modify: `tests/mobile-pool-rules.test.mjs`
- Modify: `tests/rendered-html.test.mjs`
- Modify: `app/data/heroes.json` (generated)

- [ ] Add failing assertions for the generated schema and assistant registry.

Append to `tests/mobile-pool-rules.test.mjs`:

```js
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
```

- [ ] Run the test and confirm the schema assertion fails on `presetLevel`.

Run: `node --test tests/mobile-pool-rules.test.mjs`

Expected: the two new tests fail because the generated JSON still has `recommended` only.

- [ ] Create `app/data/face-to-face.json` as the single compatibility registry.

```json
{
  "modules": {
    "huashen": { "title": "化身助手", "heroNames": ["左慈", "界左慈"] },
    "zhengjing": { "title": "整经助手", "heroNames": ["郑玄"] },
    "baixi": { "title": "水转百戏", "heroNames": ["马钧"] },
    "jingxie": { "title": "精械对照", "heroNames": ["马钧"] },
    "mingyunqian": { "title": "命运签", "heroNames": ["周群"] },
    "jiedang": { "title": "结党助手", "heroNames": ["十常侍"] }
  },
  "excluded": {}
}
```

- [ ] Import both metadata sources in `scripts/update-mobile-heroes.mjs`.

At the top of the script, add:

```js
import faceToFaceConfig from "../app/data/face-to-face.json" with { type: "json" };
import { getPresetLevel } from "./mobile-pool-rules.mjs";

const assistedModulesByHero = new Map();
for (const [moduleId, module] of Object.entries(faceToFaceConfig.modules)) {
  for (const heroName of module.heroNames) {
    const current = assistedModulesByHero.get(heroName) ?? [];
    current.push(moduleId);
    assistedModulesByHero.set(heroName, current);
  }
}
```

Replace `recommended: false` and the subsequent `isRecommended` assignment with:

```js
const assistantModules = assistedModulesByHero.get(wikiHero.name) ?? [];
const excludedReason = faceToFaceConfig.excluded[wikiHero.name];
const hero = {
  id: official?.id ?? `wiki-${wikiHero.name}`,
  name: wikiHero.name,
  faction: wikiHero.faction,
  ...vitality,
  rarity: wikiHero.rarity,
  pack: normalizePack(wikiHero.name, wikiHero.rawPacks),
  sourcePack: wikiHero.rawPacks.join("、") || "未分类",
  image: official?.image ?? fallbackImage,
  officialUrl: official?.officialUrl ?? "https://www.sanguosha.cn/index.php/pc/hero-list.html",
  wikiUrl: wikiHero.wikiUrl,
  presetLevel: 4,
  faceToFace: excludedReason
    ? "excluded"
    : assistantModules.length
      ? "assisted"
      : "native",
  assistantModules,
  ...(excludedReason ? { excludedReason } : {}),
  skills,
};
hero.presetLevel = getPresetLevel(hero);
heroes.push(hero);
```

Delete `earlyGods` and `isRecommended`. Change summary output from `recommended` to:

```js
presets: Object.fromEntries(
  [1, 2, 3, 4].map((level) => [
    level,
    heroes.filter((hero) => hero.presetLevel <= level && hero.faceToFace !== "excluded").length,
  ]),
),
assisted: heroes.filter((hero) => hero.faceToFace === "assisted").length,
excluded: heroes.filter((hero) => hero.faceToFace === "excluded").length,
```

- [ ] Regenerate from the committed cache, without refreshing external data.

Run: `node scripts/update-mobile-heroes.mjs`

Expected summary: `presets` equals `{"1":149,"2":293,"3":400,"4":573}`, `assisted` equals `6`, and `excluded` equals `0`.

- [ ] Update the catalog schema assertions in `tests/rendered-html.test.mjs` in the same commit so later builds do not depend on the removed field.

Delete the assertions that expect `219` recommended heroes and boolean `recommended`. Replace them with:

```js
assert.equal(heroes.filter((hero) => hero.presetLevel <= 1).length, 149);
assert.equal(heroes.filter((hero) => hero.presetLevel <= 2).length, 293);
assert.equal(heroes.filter((hero) => hero.presetLevel <= 3).length, 400);
assert.equal(heroes.filter((hero) => hero.presetLevel <= 4).length, 573);
assert.equal(heroes.filter((hero) => hero.faceToFace === "assisted").length, 6);
assert.ok(heroes.every((hero) => !Object.hasOwn(hero, "recommended")));
assert.ok(heroes.every((hero) => [1, 2, 3, 4].includes(hero.presetLevel)));
assert.ok(heroes.every((hero) => ["native", "assisted", "excluded"].includes(hero.faceToFace)));
assert.ok(heroes.every((hero) => Array.isArray(hero.assistantModules)));
```

- [ ] Rerun the focused tests.

Run: `node --test tests/mobile-pool-rules.test.mjs`

Expected: all tests pass.

- [ ] Commit generated metadata.

```powershell
git add app/data/face-to-face.json app/data/heroes.json scripts/update-mobile-heroes.mjs tests/mobile-pool-rules.test.mjs tests/rendered-html.test.mjs
git commit -m "Generate face-to-face hero compatibility"
```

---

## Task 3: Separate hero types and pure pool filtering

**Files:**

- Create: `app/lib/hero-types.ts`
- Create: `app/lib/pool-filter.mjs`
- Create: `tests/pool-filter.test.mjs`

- [ ] Create shared type declarations in `app/lib/hero-types.ts`.

```ts
export type PresetLevel = 1 | 2 | 3 | 4;
export type FaceToFaceStatus = "native" | "assisted" | "excluded";

export type HeroSkill = {
  name: string;
  description: string;
};

export type Hero = {
  id: string;
  name: string;
  faction: string;
  hp: number;
  maxHp?: number;
  armor?: number;
  rarity: string;
  pack: string;
  sourcePack: string;
  image: string;
  officialUrl: string;
  wikiUrl: string;
  presetLevel: PresetLevel;
  faceToFace: FaceToFaceStatus;
  assistantModules: string[];
  excludedReason?: string;
  skills: HeroSkill[];
};
```

- [ ] Write failing tests for draw eligibility, cumulative membership, and excluded search behavior in `tests/pool-filter.test.mjs`.

```js
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
  assert.deepEqual(filterDrawPool(heroes, { ...filters, presetLevel: 1, query: "" }).map((h) => h.id), ["1"]);
  assert.deepEqual(filterDrawPool(heroes, { ...filters, presetLevel: 3, query: "" }).map((h) => h.id), ["1", "2"]);
  assert.deepEqual(filterDrawPool(heroes, { ...filters, presetLevel: 4, query: "不可" }), []);
});

test("catalog exposes excluded heroes only for an explicit name search", () => {
  assert.deepEqual(filterCatalog(heroes, { ...filters, presetLevel: 4, query: "" }).map((h) => h.id), ["1", "2"]);
  assert.deepEqual(filterCatalog(heroes, { ...filters, presetLevel: 1, query: "不可 面杀" }).map((h) => h.id), ["3"]);
});

test("normalizes spaces and middle dots", () => {
  assert.equal(normalizeSearch(" SP · 赵 云 "), "sp赵云");
});
```

- [ ] Run the focused test and confirm the module-not-found failure.

Run: `node --test tests/pool-filter.test.mjs`

Expected: `ERR_MODULE_NOT_FOUND` for `app/lib/pool-filter.mjs`.

- [ ] Implement `app/lib/pool-filter.mjs`.

```js
export function normalizeSearch(value) {
  return value.toLocaleLowerCase("zh-CN").replace(/[·\s]/g, "");
}

function matchesFacets(hero, filters) {
  return filters.factions.includes(hero.faction)
    && filters.packs.includes(hero.pack)
    && filters.rarities.includes(hero.rarity);
}

function matchesQuery(hero, query) {
  const needle = normalizeSearch(query);
  return !needle
    || normalizeSearch(hero.name).includes(needle)
    || normalizeSearch(hero.pack).includes(needle);
}

export function filterDrawPool(heroes, filters) {
  return heroes.filter((hero) =>
    hero.faceToFace !== "excluded"
    && hero.presetLevel <= filters.presetLevel
    && matchesFacets(hero, filters)
    && matchesQuery(hero, filters.query),
  );
}

export function filterCatalog(heroes, filters) {
  const needle = normalizeSearch(filters.query);
  if (needle) {
    return heroes.filter((hero) => normalizeSearch(hero.name).includes(needle));
  }
  return filterDrawPool(heroes, filters);
}
```

- [ ] Rerun the test and confirm all three cases pass.

Run: `node --test tests/pool-filter.test.mjs`

Expected: `3` passed, `0` failed.

- [ ] Keep `app/page.tsx` untouched until Task 4, where removing `recommendedOnly` and importing the new type happen atomically. This prevents a transitional build from reading a field that no longer exists.

- [ ] Commit the pure filtering boundary.

```powershell
git add app/lib/hero-types.ts app/lib/pool-filter.mjs tests/pool-filter.test.mjs
git commit -m "Add cumulative pool filtering"
```

---

## Task 4: Replace the single recommendation toggle with a four-preset selector

**Files:**

- Create: `app/components/PoolSelector.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/rendered-html.test.mjs`

- [ ] Change rendered-HTML assertions before the component exists.

Replace assertions for `推荐将池` and `recommendedCount` with:

```js
const presetCounts = [1, 2, 3, 4].map(
  (level) => heroes.filter(
    (hero) => hero.presetLevel <= level && hero.faceToFace !== "excluded",
  ).length,
);
for (const label of ["经典身份", "界限平衡", "进阶平衡", "完整将池"]) {
  assert.match(html, new RegExp(label));
}
for (const count of presetCounts) assert.match(html, new RegExp(String(count)));
assert.doesNotMatch(html, /推荐将池/);
```

- [ ] Run the rendered test and confirm it fails on `经典身份`.

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: first test fails because the old toggle is still rendered.

- [ ] Create `app/components/PoolSelector.tsx` with this public contract and fixed copy.

```ts
type PoolSelectorProps = {
  value: PresetLevel;
  counts: Record<PresetLevel, number>;
  onChange: (level: PresetLevel) => void;
};
```

Use these definitions in order:

```ts
const PRESETS = [
  { level: 1, name: "经典身份", note: "标准、风火林山、一将 2011—2015、SP 1—5" },
  { level: 2, name: "界限平衡", note: "加入界标与界一将、乱世 2016—2017、SP 6—9" },
  { level: 3, name: "进阶平衡", note: "加入阴雷、始计篇、SP 10—12 与早期袖里/将星" },
  { level: 4, name: "完整将池", note: "全部当前可面杀的移动版身份武将" },
] as const;
```

Render four `button` elements in a `.pool-presets` group, set `aria-pressed`, show `name`, `counts[level]`, and show the selected preset's `note` under the group.

- [ ] Wire the selector and pure filters in `app/page.tsx`.

Replace the inline `Hero` type and `normalize` function with:

```ts
import type { Hero, PresetLevel } from "./lib/hero-types";
import { filterCatalog, filterDrawPool } from "./lib/pool-filter.mjs";
```

Make these exact state/derived changes:

```ts
const [presetLevel, setPresetLevel] = useState<PresetLevel>(2);

const filterInput = useMemo(() => ({
  factions: selectedFactions,
  packs: selectedPacks,
  rarities: selectedRarities,
  presetLevel,
  query,
}), [presetLevel, query, selectedFactions, selectedPacks, selectedRarities]);

const filteredHeroes = useMemo(
  () => filterDrawPool(heroes, filterInput) as Hero[],
  [filterInput],
);
const catalogHeroes = useMemo(
  () => filterCatalog(heroes, filterInput) as Hero[],
  [filterInput],
);

const presetCounts = Object.fromEntries(
  ([1, 2, 3, 4] as PresetLevel[]).map((level) => [
    level,
    heroes.filter(
      (hero) => hero.presetLevel <= level && hero.faceToFace !== "excluded",
    ).length,
  ]),
) as Record<PresetLevel, number>;

const selectPreset = (level: PresetLevel) => {
  if (level === presetLevel) return;
  setPresetLevel(level);
  clearRound();
  setShowAll(false);
};
```

Remove `recommendedOnly`, `recommendedHeroIds`, and `toggleRecommendedPool`. `resetFilters` must restore preset `2`. Use `catalogHeroes` for the catalog and `filteredHeroes` for counters, availability, and drawing. When a search returns an excluded hero, render it disabled with `不可面杀` and `excludedReason`; never pass it to `drawHeroes`.

- [ ] Add `.pool-presets`, `.pool-preset`, `.preset-note`, `.status-badge.assisted`, and `.status-badge.excluded` styles in the existing ink-and-parchment visual language. At widths below `720px`, make the selector a two-column grid; preserve 44px minimum touch targets.

- [ ] Rerun server-render and both builds.

Run: `npm run build && node --test tests/rendered-html.test.mjs`

Expected: all rendered tests pass.

Run: `npm run build:netlify`

Expected: `netlify-dist/index.html` is emitted and exit is `0`.

- [ ] Commit the selector.

```powershell
git add app/components/PoolSelector.tsx app/page.tsx app/globals.css tests/rendered-html.test.mjs
git commit -m "Add four progressive hero pools"
```

---

## Task 5: Build deterministic assistant rules and persistent drawer shell

**Files:**

- Create: `app/lib/assistant-rules.mjs`
- Create: `tests/assistant-rules.test.mjs`
- Create: `app/components/SkillAssistant.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] Write the shared-rule failures in `tests/assistant-rules.test.mjs`.

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  createSequenceRng,
  drawUnique,
  getAssistantStorageKey,
  loadAssistantState,
} from "../app/lib/assistant-rules.mjs";

test("drawUnique never repeats excluded or already-used ids", () => {
  const rng = createSequenceRng([0, 0, 0]);
  const result = drawUnique(["a", "b", "c", "d"], 2, new Set(["a"]), rng);
  assert.deepEqual(result, ["b", "c"]);
});

test("assistant keys isolate hero and module state", () => {
  assert.equal(
    getAssistantStorageKey("huashen", "56"),
    "miansha-assistant:v1:huashen:56",
  );
});

test("invalid stored state falls back without throwing", () => {
  const storage = { getItem: () => "not-json" };
  assert.deepEqual(loadAssistantState(storage, "key", { round: 0 }), { round: 0 });
});
```

- [ ] Confirm the new tests fail with module-not-found.

Run: `node --test tests/assistant-rules.test.mjs`

Expected: `ERR_MODULE_NOT_FOUND`.

- [ ] Implement `app/lib/assistant-rules.mjs` with:

```js
export function cryptoIndex(length) {
  if (!Number.isInteger(length) || length < 1) throw new RangeError("length must be positive");
  const ceiling = Math.floor(0x100000000 / length) * length;
  const sample = new Uint32Array(1);
  do window.crypto.getRandomValues(sample); while (sample[0] >= ceiling);
  return sample[0] % length;
}

export function createSequenceRng(sequence) {
  let cursor = 0;
  return (length) => {
    const next = sequence[cursor] ?? 0;
    cursor += 1;
    return Math.abs(next) % length;
  };
}

export function drawUnique(items, count, used = new Set(), rng = cryptoIndex) {
  const available = items.filter((item) => !used.has(item));
  const drawn = [];
  while (available.length && drawn.length < count) {
    drawn.push(available.splice(rng(available.length), 1)[0]);
  }
  return drawn;
}

export function getAssistantStorageKey(moduleId, heroId) {
  return `miansha-assistant:v1:${moduleId}:${heroId}`;
}

export function loadAssistantState(storage, key, fallback) {
  try {
    const value = storage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
```

Also export `saveAssistantState(storage, key, value)` and `clearAssistantState(storage, key)`; both catch storage errors so private browsing does not break the helper.

- [ ] Rerun tests and expect all shared cases to pass.

- [ ] Create `SkillAssistant.tsx` as a full-screen dialog shell.

Public contract:

```ts
type SkillAssistantProps = {
  hero: Hero;
  heroes: Hero[];
  initialModuleId?: string;
  onClose: () => void;
};
```

Required UI behavior:

- fixed header with hero name, active module name, `本局重置`, and `关闭`;
- one tab per `hero.assistantModules` when more than one exists;
- Escape closes; focus moves to the close button on open;
- background body scrolling is disabled while open;
- each module owns its own persisted state key;
- resetting asks for one inline confirmation click, clears only the active module, and immediately returns its initial state;
- if the module id is missing from the registry, render `辅助规则缺失，该武将本局不可抽取` instead of crashing.

- [ ] Add `assistantHero` state in `app/page.tsx`. Show `需辅助` on cards and the detail modal when `faceToFace === "assisted"`. Add an `打开面杀辅助` button to the detail modal; opening the drawer does not close the detail modal, and closing the drawer returns focus to that button.

- [ ] Add responsive `.assistant-backdrop`, `.assistant-drawer`, `.assistant-header`, `.assistant-tabs`, `.assistant-panel`, and confirmation styles. Use `100dvh`, safe-area padding, and readable 16px minimum body text.

- [ ] Run unit/build/lint.

Run: `npm run test:unit`

Expected: all unit tests pass.

Run: `npm run build && npm run lint`

Expected: both exit `0`.

- [ ] Commit the framework.

```powershell
git add app/lib/assistant-rules.mjs app/components/SkillAssistant.tsx app/page.tsx app/globals.css tests/assistant-rules.test.mjs
git commit -m "Add local skill assistant framework"
```

---

## Task 6: Implement 左慈 and 界左慈's 化身 helper

**Files:**

- Create: `app/lib/huashen-rules.mjs`
- Create: `app/components/assistants/HuashenAssistant.tsx`
- Modify: `app/components/SkillAssistant.tsx`
- Modify: `tests/assistant-rules.test.mjs`

- [ ] Add failing rule tests.

Append tests that verify:

```js
test("left ci starts with two unique native transformations", () => {
  const state = createHuashenState("左慈", candidateHeroes, createSequenceRng([0, 0]));
  assert.equal(state.handIds.length, 2);
  assert.equal(new Set(state.handIds).size, 2);
});

test("boundary left ci starts with three and can replace at most two unrevealed cards", () => {
  const state = createHuashenState("界左慈", candidateHeroes, createSequenceRng([0, 0, 0]));
  const revealed = revealHuashen(state, state.handIds[0], "技能甲");
  const replaceIds = state.handIds.slice(1);
  const next = replaceHuashen(revealed, replaceIds, candidateHeroes, createSequenceRng([0, 0]));
  assert.equal(next.handIds.length, 3);
  assert.ok(next.handIds.includes(state.handIds[0]));
  assert.throws(() => replaceHuashen(revealed, state.handIds, candidateHeroes));
});

test("new life adds one unused transformation", () => {
  const state = createHuashenState("左慈", candidateHeroes, createSequenceRng([0, 0]));
  const next = addXinsheng(state, candidateHeroes, createSequenceRng([0]));
  assert.equal(next.handIds.length, 3);
});
```

Candidate fixtures must include at least six native heroes and one `assisted` hero; assert the assisted candidate is never drawn so helpers cannot recursively require helpers.

- [ ] Run and confirm missing-export failures.

- [ ] Implement `huashen-rules.mjs` state as:

```js
{
  version: 1,
  handIds: [],
  usedIds: [],
  revealedHeroId: null,
  revealedSkillName: null
}
```

Export `createHuashenState`, `revealHuashen`, `replaceHuashen`, and `addXinsheng`. Eligible candidates must be `native`, cannot be 左慈/界左慈, and cannot be present in `usedIds`. Replaced cards are permanently added to `usedIds`; the revealed card cannot be replaced. Throw a clear `RangeError` for illegal actions rather than silently changing state.

- [ ] Implement `HuashenAssistant.tsx`.

Required controls:

- `开始化身`: two cards for 左慈, three for 界左慈;
- each transformation card shows name, faction, sex-neutral portrait, and all current identity skills;
- tapping a skill sets the active transformation and highlights it;
- `新生：获得一张` adds one unused card;
- only 界左慈 sees checkboxes and `移去并补充`, limited to two unrevealed cards;
- if the candidate pool is exhausted, explain that no unused native transformation remains.

- [ ] Register `huashen` in `SkillAssistant.tsx`, pass the full hero list, and persist after every valid transition.

- [ ] Run focused rules, unit suite, and build.

Run: `node --test tests/assistant-rules.test.mjs && npm run build`

Expected: exit `0` with all tests passing.

- [ ] Commit.

```powershell
git add app/lib/huashen-rules.mjs app/components/assistants/HuashenAssistant.tsx app/components/SkillAssistant.tsx tests/assistant-rules.test.mjs
git commit -m "Add Huashen face-to-face helper"
```

---

## Task 7: Implement 郑玄's 整经 and 马钧's 百戏/精械 helpers

**Files:**

- Create: `app/lib/minigame-rules.mjs`
- Create: `app/data/jingxie-equipment.json`
- Create: `app/components/assistants/ZhengjingAssistant.tsx`
- Create: `app/components/assistants/BaixiAssistant.tsx`
- Create: `app/components/assistants/JingxieReference.tsx`
- Modify: `app/components/SkillAssistant.tsx`
- Modify: `tests/assistant-rules.test.mjs`
- Modify: `app/globals.css`

- [ ] Add failing tests for both minigames.

Test these exact rule outcomes:

- 整经 has ten timed targets, five valid `经` targets, caps score at five, ignores duplicate target hits, and reset returns `{ phase: "idle", hits: [], score: 0 }`.
- 水转百戏 permits at most three selected puppets.
- Completion thresholds are 王 `5`, 商 `2 or 3` chosen once at round start, 工 `1`, 农 `1`, 士 `3`, 将 `5`.
- 王 awards two `锦囊`, 将 awards two `装备`.
- 商 awards one of `杀/酒` with equal weights; 工 uses `杀/杀/酒`; 农 uses `闪/闪/桃`; 士 uses `闪/桃`.
- A puppet awards once even if clicked past its threshold; reset clears selections, progress, and awards.

- [ ] Implement `minigame-rules.mjs` with dependency-injected RNG and these exports:

Export these eight named functions: `createZhengjingRound(rng)`, `hitZhengjingTarget(state, targetId)`, `finishZhengjingRound(state)`, `resetZhengjingRound()`, `createBaixiRound(rng)`, `selectBaixiPuppet(state, puppetId)`, `turnBaixiValve(state, puppetId, rng)`, and `resetBaixiRound()`.

The 郑玄 UI is an eight-second touch challenge: ten bamboo-slip targets appear one at a time in predetermined positions generated at round start; five contain `经`, five contain ink marks. Each target remains tappable for 800ms. The result is `0–5` physical cards. The result panel instructs the player to take that many cards from the top of the physical deck, place any number as `经`, and keep the rest; it never names or records those cards.

The 马钧 UI lets the player select up to three puppets before starting a twelve-second round, then presents six large valve buttons with visible progress. At finish it lists only the earned categories and counts. It instructs the table to randomly obtain matching physical cards and shuffle after searching, without recording deck contents.

- [ ] Create `app/data/jingxie-equipment.json` with the five current identity upgrades:

```json
[
  { "from": "诸葛连弩", "to": "元戎精械弩", "effect": "攻击范围3；你使用【杀】无次数限制。" },
  { "from": "八卦阵", "to": "先天八卦阵", "effect": "当你需要使用或打出【闪】时，你可以判定；若结果不为黑桃，视为你使用或打出了一张【闪】。" },
  { "from": "仁王盾", "to": "仁王金刚盾", "effect": "锁定技，黑色【杀】和红桃【杀】对你无效。" },
  { "from": "白银狮子", "to": "照月狮子盔", "effect": "锁定技，当你受到多于1点伤害时，防止多余伤害；当此牌离开你的装备区时，你回复1点体力并摸两张牌。" },
  { "from": "藤甲", "to": "桐油百韧甲", "effect": "【南蛮入侵】、【万箭齐发】和普通【杀】对你无效；你不能被横置；你受到的火焰伤害+1。" }
]
```

`JingxieReference.tsx` renders the list and a searchable source/evolved-name filter. It has no game state.

- [ ] Register `zhengjing`, `baixi`, and `jingxie` in the drawer and add touch-game CSS. Respect `prefers-reduced-motion`: show targets without movement and keep the same timing/scoring.

- [ ] Run unit/build/lint.

Run: `npm run test:unit && npm run build && npm run lint`

Expected: all exit `0`.

- [ ] Commit.

```powershell
git add app/lib/minigame-rules.mjs app/data/jingxie-equipment.json app/components/assistants/ZhengjingAssistant.tsx app/components/assistants/BaixiAssistant.tsx app/components/assistants/JingxieReference.tsx app/components/SkillAssistant.tsx app/globals.css tests/assistant-rules.test.mjs
git commit -m "Add Zhengjing and Baixi helpers"
```

---

## Task 8: Implement 周群's 命运签 and 十常侍's 结党 helpers

**Files:**

- Create: `app/lib/fortune-rules.mjs`
- Create: `app/lib/eunuch-rules.mjs`
- Create: `app/data/fortune-signs.json`
- Create: `app/data/ten-eunuchs.json`
- Create: `app/components/assistants/FortuneAssistant.tsx`
- Create: `app/components/assistants/JiedangAssistant.tsx`
- Modify: `app/components/SkillAssistant.tsx`
- Modify: `tests/assistant-rules.test.mjs`

- [ ] Add failing 命运签 tests.

Assert an ordinary draw has five equally represented entries. When cheating for one sign, the six-entry urn contains two copies of that sign and one of every other sign, making the chosen sign `1/3` and each other sign `1/6`. Assert the selected result includes the full effect text and reset removes the previous result and cheat choice.

- [ ] Create `app/data/fortune-signs.json`:

```json
[
  { "id": "best", "name": "上上签", "tone": "blessing", "effect": "防止其受到的伤害。" },
  { "id": "good", "name": "上签", "tone": "blessing", "effect": "其受到大于1点的伤害时将伤害值改为1；其受到1点伤害后摸一张牌。" },
  { "id": "middle", "name": "中签", "tone": "neutral", "effect": "其受到伤害时，将伤害改为火焰伤害；若伤害值大于1，将伤害值改为1。" },
  { "id": "bad", "name": "下签", "tone": "curse", "effect": "其受到的伤害值+1。" },
  { "id": "worst", "name": "下下签", "tone": "curse", "effect": "其受到的伤害值+1；其不能使用【桃】和【酒】。" }
]
```

- [ ] Implement `fortune-rules.mjs` with `buildFortuneUrn(signIds, cheatId)`, `drawFortuneSign(urn, rng)`, and `resetFortuneState()`. The UI keeps the cheat choice visually private behind a `遮住屏幕选择加签` step, then returns to a neutral “交给全桌” screen before drawing.

- [ ] Add failing 结党 tests.

Assert:

- all ten names exist exactly once;
- fixed mutual rejections are `毕岚 ↔ 韩悝` and `段珪 ↔ 郭胜`;
- reset creates exactly one non-self rejected name per eunuch and no additional mutual pair;
- a party round draws one unused main and four unused candidates, or all remaining when fewer than four;
- at least one candidate is mutually recognized with the main;
- confirming a deputy consumes both names and prevents either from appearing again;
- reset restores all ten.

- [ ] Create `app/data/ten-eunuchs.json` with current names and skill summaries:

```json
[
  { "id": "zhangrang", "name": "张让", "skill": "滔乱", "summary": "将一张牌当任意一张牌使用。" },
  { "id": "zhaozhong", "name": "赵忠", "skill": "鸱咽", "summary": "使用【杀】时扣置目标的牌，并可在牌数占优时增伤。" },
  { "id": "sunzhang", "name": "孙璋", "skill": "自谋", "summary": "使用本回合第2、4、6张牌时获得额外牌。" },
  { "id": "bilan", "name": "毕岚", "skill": "庀材", "summary": "连续判定不同花色并可将判定牌交给一名角色。" },
  { "id": "xiayun", "name": "夏恽", "skill": "谣诼", "summary": "与一名角色拼点，赢则令其跳过摸牌阶段。" },
  { "id": "hankui", "name": "韩悝", "skill": "宵赂", "summary": "摸两张牌，再交给其他角色两张牌或弃置两张牌。" },
  { "id": "lisong", "name": "栗嵩", "skill": "窥机", "summary": "观看一名角色手牌，并与其合计弃置四张不同花色的牌。" },
  { "id": "duangui", "name": "段珪", "skill": "叱吓", "summary": "使用【杀】时翻牌，按同花色结果增伤并限制响应。" },
  { "id": "guosheng", "name": "郭胜", "skill": "逆取", "summary": "对一名角色造成火焰伤害。" },
  { "id": "gaowang", "name": "高望", "skill": "妙语", "summary": "以指定花色牌转化使用牌，多牌转化时获得额外效果。" }
]
```

- [ ] Implement `eunuch-rules.mjs`.

State shape:

```js
{
  version: 1,
  rejectionById: {},
  usedIds: [],
  currentMainId: null,
  candidateIds: [],
  currentDeputyId: null,
  resting: false
}
```

Generate the two fixed two-cycles first. For the remaining six cards, assign one random non-self target each; reject and regenerate any map that creates another two-cycle. `canPair(mainId, deputyId, map)` returns false if either records the other. `startJiedang` samples a main and up to four candidates; if the first sample has no legal deputy, resample candidates from the same unused set until one exists. `confirmJiedang` requires a legal candidate and appends both ids to `usedIds`. `enterRest` and `finishRest` expose the one-round reminder without simulating turn order.

- [ ] Implement both components, register them, and persist state.

The 结党 result must show names, skill names, summaries, rejected pairs, remaining count, and buttons for `进入休整`/`休整结束，重新结党`. It must not automatically advance real-world turns.

- [ ] Run unit/build/lint.

Run: `npm run test:unit && npm run build && npm run lint`

Expected: all exit `0`.

- [ ] Commit.

```powershell
git add app/lib/fortune-rules.mjs app/lib/eunuch-rules.mjs app/data/fortune-signs.json app/data/ten-eunuchs.json app/components/assistants/FortuneAssistant.tsx app/components/assistants/JiedangAssistant.tsx app/components/SkillAssistant.tsx tests/assistant-rules.test.mjs
git commit -m "Add fortune and Jiedang helpers"
```

---

## Task 9: Finish card/detail integration and update regression coverage

**Files:**

- Create: `app/components/HeroCard.tsx`
- Create: `app/components/HeroDetail.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `tests/rendered-html.test.mjs`

- [ ] Extract `HeroCard` and the detail dialog without changing their existing visual structure. Pass explicit callbacks instead of assistant state. Public props:

```ts
type HeroCardProps = {
  hero: Hero;
  compact?: boolean;
  disabled?: boolean;
  onInspect?: (hero: Hero) => void;
};

type HeroDetailProps = {
  hero: Hero;
  onClose: () => void;
  onOpenAssistant: (hero: Hero) => void;
};
```

- [ ] Add status and pool provenance to every inspectable card/detail:

- `需辅助` when assisted;
- `不可面杀` and disabled draw styling when excluded;
- `经典身份`, `界限平衡`, `进阶平衡`, or `完整将池` based on the hero's minimum `presetLevel`.

- [ ] Add regression assertions to `tests/rendered-html.test.mjs`:

```js
assert.equal(heroes.filter((hero) => hero.presetLevel <= 1).length, 149);
assert.equal(heroes.filter((hero) => hero.presetLevel <= 2).length, 293);
assert.equal(heroes.filter((hero) => hero.presetLevel <= 3).length, 400);
assert.equal(heroes.filter((hero) => hero.presetLevel <= 4).length, 573);
assert.equal(heroes.filter((hero) => hero.faceToFace === "assisted").length, 6);
assert.ok(heroes.every((hero) => !Object.hasOwn(hero, "recommended")));
assert.ok(heroes.every((hero) => Number.isInteger(hero.presetLevel)));
assert.ok(heroes.every((hero) => Array.isArray(hero.assistantModules)));
```

Keep all current skill-cleaning regression assertions, especially 界夏侯惇's current `清俭` wording.

- [ ] Update introductory/footer copy so it explains that preset strength follows publication stages, not a per-general win-rate ranking, and that assisted generals require the built-in helper.

- [ ] Run the full local suite.

Run: `npm test`

Expected: unit tests, Vinext build, and rendered HTML tests all pass.

Run: `npm run build:netlify && npm run lint`

Expected: both exit `0`.

- [ ] Commit.

```powershell
git add app/components/HeroCard.tsx app/components/HeroDetail.tsx app/page.tsx app/globals.css tests/rendered-html.test.mjs
git commit -m "Integrate assisted heroes into card details"
```

---

## Task 10: Refresh the social preview once the UI copy is stable

**Files:**

- Modify: `public/og.png`
- Modify: `app/layout.tsx` only if its alt/description no longer matches

- [ ] Read and follow the `imagegen` skill because this is a raster asset edit. This action is caused by the Sites publishing workflow's requirement for one bespoke visual-generation pass after page content stabilizes.

- [ ] Inspect the current `public/og.png`, then make exactly one image-generation/edit request using it as the reference. Preserve the current ink-and-parchment brand, `面杀助手` title, and 1200×630 layout; change the feature line to `四档递进将池 · 五类面杀技能助手` and keep small text legible at social-card size.

- [ ] Inspect the returned image at original detail. Accept it only if all Chinese text is correct and no extra logos/watermarks were introduced. If text is malformed, keep the current `og.png` and update only the metadata description; do not make a second generation request.

- [ ] Build once to verify the asset is bundled.

Run: `npm run build`

Expected: exit `0`, and the generated page still references `/og.png`.

- [ ] Commit if the asset or metadata changed.

```powershell
git add public/og.png app/layout.tsx
git commit -m "Refresh progressive pools social preview"
```

If neither file changed, skip this commit.

---

## Task 11: Browser QA, independent review, and final verification

**Files:**

- Modify only files implicated by verified defects.

- [ ] Read and apply `superpowers:requesting-code-review`. Review the complete diff against `docs/superpowers/specs/2026-07-22-recommended-pools-design.md`; fix only concrete findings, rerunning the closest test after every fix.

- [ ] Start the local app with the approved dev command, then use the in-app browser skill for interactive QA.

Run: `npm run dev`

Verify at desktop and mobile widths:

1. Page opens with no login and `界限平衡` selected.
2. Four preset counts read `149 / 293 / 400 / 573` for the current dataset.
3. 神吕布 and 神诸葛亮 appear in 经典身份.
4. 界夏侯惇 appears in 界限平衡 with current 清俭 text.
5. 界徐盛 does not appear until 进阶平衡.
6. 谋夏侯惇 and 势魏延 appear only in 完整将池.
7. Search finds a hero outside the selected pool without adding it to random eligibility.
8. Switching presets clears drawn cards, history, and used ids.
9. All six assisted hero entries show `需辅助` and open the right helper.
10. Each helper persists across close/reopen, and `本局重置` resets only that helper.
11. Escape, backdrop close, keyboard focus, and mobile safe-area behavior work.
12. No runtime error appears in the browser console.

- [ ] Read and apply `superpowers:verification-before-completion`, then run fresh commands from a clean prompt.

```powershell
npm run test:unit
npm test
npm run build:netlify
npm run lint
git status --short
```

Expected: every command exits `0`; `git status --short` is empty after any final-fix commit.

- [ ] Record the tested commit hash.

Run: `git rev-parse --short HEAD`

Expected: one short commit id to use in the deployment handoff.

---

## Task 12: Push GitHub and deploy both public sites

**Files:**

- No source edits expected.

- [ ] Confirm authenticated remote and branch without changing them.

```powershell
git remote -v
git branch --show-current
gh auth status
```

Expected: remote points to `https://github.com/JianyuHe888/miansha-assistant`; GitHub authentication is valid.

- [ ] Push the tested branch/commit to GitHub.

Run: `git push origin main`

Expected: successful update and the tested commit visible at `https://github.com/JianyuHe888/miansha-assistant`.

- [ ] Deploy the already verified Netlify artifact to the linked site.

Run: `npx netlify deploy --prod --dir netlify-dist`

Expected: production URL `https://miansha-assistant.netlify.app` and deploy status `live`.

- [ ] Read and apply `sites:sites-hosting`. Use `.openai/hosting.json` project `appgprj_6a55f22c9b748191bad8dcd855a6f93f` and publish the verified Vinext build to the existing Sites project; do not create a second project.

Expected canonical URL: `https://wujiangtai-hero-draw.liujunyang19.chatgpt.site/`.

- [ ] Verify both production URLs with fresh HTTP/browser checks. At each URL confirm status `200`, title `面杀助手｜三国杀面杀选将器`, all four preset labels, `界限平衡` default, and an assistant drawer opening for 周群 or 马钧.

- [ ] Compare deployed GitHub commit to the tested hash, then report the two public URLs and the commit. Do not claim sync if either live URL still serves the old single `推荐将池` button.

---

## Plan Self-Review Checklist

- [ ] Spec coverage: four cumulative tiers, exact current counts, default tier, excluded behavior, six assisted heroes, five gameplay families, local persistence, no login, and all three publication targets are represented.
- [ ] Unfinished-marker scan: run `rg -n "[T]ODO|[T]BD|[p]laceholder|fill[ -]in|[i]mplement[ ]later" docs/superpowers/plans/2026-07-23-progressive-pools-assistants.md` and confirm no unfinished implementation marker remains.
- [ ] Type consistency: `PresetLevel`, `FaceToFaceStatus`, assistant module ids, and persistence state versions match across JSON, scripts, pure rules, components, and tests.
- [ ] Rule consistency: counts derive from `sourcePack`; only `界徐盛` is overridden; no UI code repeats source-pack tier logic.
- [ ] Safety: random outputs use unbiased crypto sampling in production, helpers never record hidden physical cards, and future missing helpers become excluded rather than drawable.
- [ ] Deployment: Netlify, GitHub, and the existing Sites project are validated from the same tested commit.
