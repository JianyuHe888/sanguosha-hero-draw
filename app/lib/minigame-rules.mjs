import { cryptoIndex } from "./assistant-rules.mjs";

const POSITIONS = [
  [12, 12], [42, 8], [72, 14], [20, 38], [55, 34],
  [78, 45], [9, 68], [38, 66], [65, 73], [82, 78],
];

export function resetZhengjingRound() {
  return { version: 1, phase: "idle", targets: [], hits: [], score: 0 };
}

export function createZhengjingRound(rng = cryptoIndex) {
  const kinds = ["jing", "ink", "jing", "ink", "jing", "ink", "jing", "ink", "jing", "ink"];
  const targets = POSITIONS.map(([x, y], index) => ({
    id: `slip-${index}`,
    kind: kinds.splice(rng(kinds.length), 1)[0],
    x,
    y,
  }));
  return { version: 1, phase: "active", targets, hits: [], score: 0 };
}

export function hitZhengjingTarget(state, targetId) {
  if (state.phase !== "active" || state.hits.includes(targetId)) return state;
  const target = state.targets.find((item) => item.id === targetId);
  if (!target) return state;
  return {
    ...state,
    hits: [...state.hits, targetId],
    score: Math.min(5, state.score + (target.kind === "jing" ? 1 : 0)),
  };
}

export function finishZhengjingRound(state) {
  return { ...state, phase: "finished", score: Math.min(5, state.score) };
}

export const BAIXI_PUPPETS = Object.freeze({
  wang: { name: "王", threshold: 5 },
  shang: { name: "商", threshold: null },
  gong: { name: "工", threshold: 1 },
  nong: { name: "农", threshold: 1 },
  shi: { name: "士", threshold: 3 },
  jiang: { name: "将", threshold: 5 },
});

export function createBaixiRound(rng = cryptoIndex) {
  return {
    version: 1,
    phase: "selecting",
    selectedIds: [],
    progress: {},
    awards: [],
    merchantThreshold: 2 + rng(2),
  };
}

export function resetBaixiRound() {
  return createBaixiRound(() => 0);
}

export function selectBaixiPuppet(state, puppetId) {
  if (!BAIXI_PUPPETS[puppetId]) throw new RangeError("未知水转百戏机关");
  if (state.selectedIds.includes(puppetId)) {
    return { ...state, selectedIds: state.selectedIds.filter((id) => id !== puppetId) };
  }
  if (state.selectedIds.length >= 3) throw new RangeError("至多选择三个百戏机关");
  return { ...state, selectedIds: [...state.selectedIds, puppetId], phase: "active" };
}

function awardFor(puppetId, rng) {
  if (puppetId === "wang") return { puppetId, category: "锦囊", count: 2 };
  if (puppetId === "jiang") return { puppetId, category: "装备", count: 2 };
  const choices = {
    shang: ["杀", "酒"],
    gong: ["杀", "杀", "酒"],
    nong: ["闪", "闪", "桃"],
    shi: ["闪", "桃"],
  }[puppetId];
  return { puppetId, category: choices[rng(choices.length)], count: 1 };
}

export function turnBaixiValve(state, puppetId, rng = cryptoIndex) {
  if (!state.selectedIds.includes(puppetId)) throw new RangeError("请先选择该机关");
  if (state.awards.some((award) => award.puppetId === puppetId)) return state;
  const progress = (state.progress[puppetId] ?? 0) + 1;
  const threshold = puppetId === "shang"
    ? state.merchantThreshold
    : BAIXI_PUPPETS[puppetId].threshold;
  const awards = progress >= threshold
    ? [...state.awards, awardFor(puppetId, rng)]
    : state.awards;
  return { ...state, progress: { ...state.progress, [puppetId]: progress }, awards };
}
