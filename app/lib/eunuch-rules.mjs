import { cryptoIndex, drawUnique } from "./assistant-rules.mjs";

const FIXED_REJECTIONS = Object.freeze({
  bilan: "hankui",
  hankui: "bilan",
  duangui: "guosheng",
  guosheng: "duangui",
});

export function createJiedangState(ids, rng = cryptoIndex) {
  if (new Set(ids).size !== 10) throw new RangeError("结党需要十名常侍且不能重复");
  const rejectionById = { ...FIXED_REJECTIONS };
  const remaining = ids.filter((id) => !Object.hasOwn(FIXED_REJECTIONS, id));
  for (const id of remaining) {
    const candidates = ids.filter((target) => target !== id && rejectionById[target] !== id);
    rejectionById[id] = candidates[rng(candidates.length)];
  }
  return {
    version: 1,
    rejectionById,
    usedIds: [],
    currentMainId: null,
    candidateIds: [],
    currentDeputyId: null,
    resting: false,
  };
}

export function canPair(mainId, deputyId, rejectionById) {
  return Boolean(mainId && deputyId && mainId !== deputyId
    && rejectionById[mainId] !== deputyId
    && rejectionById[deputyId] !== mainId);
}

export function startJiedang(state, ids, rng = cryptoIndex) {
  const available = ids.filter((id) => !state.usedIds.includes(id));
  if (available.length < 2) throw new RangeError("没有足够的常侍可以结党");
  const [mainId] = drawUnique(available, 1, new Set(), rng);
  const others = available.filter((id) => id !== mainId);
  let candidateIds = drawUnique(others, Math.min(4, others.length), new Set(), rng);
  if (!candidateIds.some((id) => canPair(mainId, id, state.rejectionById))) {
    const legal = others.find((id) => canPair(mainId, id, state.rejectionById));
    if (!legal) throw new RangeError("当前常侍没有可结党的副将");
    candidateIds = [legal, ...candidateIds.filter((id) => id !== legal)].slice(0, 4);
  }
  return { ...state, currentMainId: mainId, candidateIds, currentDeputyId: null, resting: false };
}

export function confirmJiedang(state, deputyId) {
  if (!state.candidateIds.includes(deputyId)) throw new RangeError("副将不在候选中");
  if (!canPair(state.currentMainId, deputyId, state.rejectionById)) throw new RangeError("二者互不认可");
  return {
    ...state,
    currentDeputyId: deputyId,
    usedIds: [...new Set([...state.usedIds, state.currentMainId, deputyId])],
  };
}

export function enterRest(state) {
  if (!state.currentDeputyId) throw new RangeError("请先确认副将");
  return { ...state, resting: true };
}

export function finishRest(state) {
  return { ...state, currentMainId: null, candidateIds: [], currentDeputyId: null, resting: false };
}
