import assert from "node:assert/strict";
import test from "node:test";
import {
  createSequenceRng,
  drawUnique,
  getAssistantStorageKey,
  loadAssistantState,
} from "../app/lib/assistant-rules.mjs";
import {
  addXinsheng,
  createHuashenState,
  replaceHuashen,
  revealHuashen,
} from "../app/lib/huashen-rules.mjs";
import {
  createBaixiRound,
  createZhengjingRound,
  finishZhengjingRound,
  hitZhengjingTarget,
  resetBaixiRound,
  resetZhengjingRound,
  selectBaixiPuppet,
  turnBaixiValve,
} from "../app/lib/minigame-rules.mjs";
import {
  buildFortuneUrn,
  drawFortuneSign,
  resetFortuneState,
} from "../app/lib/fortune-rules.mjs";
import {
  canPair,
  confirmJiedang,
  createJiedangState,
  finishRest,
  startJiedang,
} from "../app/lib/eunuch-rules.mjs";

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

const candidateHeroes = [
  ...Array.from({ length: 6 }, (_, index) => ({
    id: `native-${index}`,
    name: `化身${index}`,
    faceToFace: "native",
  })),
  { id: "assisted", name: "辅助将", faceToFace: "assisted" },
  { id: "zuoci", name: "左慈", faceToFace: "native" },
];

test("Huashen draws only unique native transformations", () => {
  const state = createHuashenState("左慈", candidateHeroes, createSequenceRng([0, 0]));
  assert.equal(state.handIds.length, 2);
  assert.equal(new Set(state.handIds).size, 2);
  assert.ok(!state.handIds.includes("assisted"));
  assert.ok(!state.handIds.includes("zuoci"));
  const next = addXinsheng(state, candidateHeroes, createSequenceRng([0]));
  assert.equal(next.handIds.length, 3);
});

test("boundary Huashen replaces at most two unrevealed cards", () => {
  const state = createHuashenState("界左慈", candidateHeroes, createSequenceRng([0, 0, 0]));
  assert.equal(state.handIds.length, 3);
  const revealed = revealHuashen(state, state.handIds[0], "技能甲");
  const next = replaceHuashen(revealed, state.handIds.slice(1), candidateHeroes, createSequenceRng([0, 0]));
  assert.equal(next.handIds.length, 3);
  assert.ok(next.handIds.includes(state.handIds[0]));
  assert.throws(() => replaceHuashen(revealed, state.handIds, candidateHeroes));
});

test("Zhengjing scores unique scripture targets and resets", () => {
  let state = createZhengjingRound(createSequenceRng([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
  const scriptures = state.targets.filter((target) => target.kind === "jing");
  assert.equal(state.targets.length, 10);
  assert.equal(scriptures.length, 5);
  for (const target of scriptures) state = hitZhengjingTarget(state, target.id);
  state = hitZhengjingTarget(state, scriptures[0].id);
  assert.equal(finishZhengjingRound(state).score, 5);
  assert.deepEqual(resetZhengjingRound(), { version: 1, phase: "idle", targets: [], hits: [], score: 0 });
});

test("Baixi limits puppets and awards each completed puppet once", () => {
  let state = createBaixiRound(createSequenceRng([0]));
  for (const id of ["wang", "shang", "gong"]) state = selectBaixiPuppet(state, id);
  assert.throws(() => selectBaixiPuppet(state, "nong"));
  for (let index = 0; index < 6; index += 1) {
    state = turnBaixiValve(state, "wang", createSequenceRng([0]));
  }
  assert.deepEqual(state.awards.filter((award) => award.puppetId === "wang"), [
    { puppetId: "wang", category: "锦囊", count: 2 },
  ]);
  assert.deepEqual(resetBaixiRound(), createBaixiRound(createSequenceRng([0])));
});

test("fortune urn uses equal ordinary odds and one-third cheated odds", () => {
  const ids = ["best", "good", "middle", "bad", "worst"];
  assert.deepEqual(buildFortuneUrn(ids), ids);
  const urn = buildFortuneUrn(ids, "good");
  assert.equal(urn.length, 6);
  assert.equal(urn.filter((id) => id === "good").length, 2);
  assert.equal(drawFortuneSign(urn, createSequenceRng([0])), urn[0]);
  assert.deepEqual(resetFortuneState(), { version: 1, cheatId: null, resultId: null, privateStep: false });
});

const eunuchIds = ["zhangrang", "zhaozhong", "sunzhang", "bilan", "xiayun", "hankui", "lisong", "duangui", "guosheng", "gaowang"];

test("Jiedang preserves fixed rejections and consumes a legal pair", () => {
  let state = createJiedangState(eunuchIds, createSequenceRng([0, 0, 0, 0, 0, 0]));
  assert.equal(state.rejectionById.bilan, "hankui");
  assert.equal(state.rejectionById.hankui, "bilan");
  assert.equal(state.rejectionById.duangui, "guosheng");
  assert.equal(state.rejectionById.guosheng, "duangui");
  state = startJiedang(state, eunuchIds, createSequenceRng([0, 0, 0, 0, 0]));
  const deputyId = state.candidateIds.find((id) => canPair(state.currentMainId, id, state.rejectionById));
  assert.ok(deputyId);
  state = confirmJiedang(state, deputyId);
  assert.equal(state.usedIds.length, 2);
  assert.ok(state.usedIds.includes(state.currentMainId));
  assert.ok(state.usedIds.includes(deputyId));
  assert.equal(finishRest({ ...state, resting: true }).currentMainId, null);
});
