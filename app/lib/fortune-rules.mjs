import { cryptoIndex } from "./assistant-rules.mjs";

export function buildFortuneUrn(signIds, cheatId = null) {
  if (cheatId && !signIds.includes(cheatId)) throw new RangeError("加签不在签池中");
  return cheatId ? [...signIds, cheatId] : [...signIds];
}

export function drawFortuneSign(urn, rng = cryptoIndex) {
  if (!urn.length) throw new RangeError("签池不能为空");
  return urn[rng(urn.length)];
}

export function resetFortuneState() {
  return { version: 1, cheatId: null, resultId: null, privateStep: false };
}
