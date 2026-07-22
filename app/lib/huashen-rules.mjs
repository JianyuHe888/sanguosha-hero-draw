import { cryptoIndex, drawUnique } from "./assistant-rules.mjs";

function candidateIds(heroes) {
  return heroes
    .filter((hero) => hero.faceToFace === "native" && !["左慈", "界左慈"].includes(hero.name))
    .map((hero) => hero.id);
}

export function createHuashenState(ownerName, heroes, rng = cryptoIndex) {
  const count = ownerName === "界左慈" ? 3 : 2;
  const handIds = drawUnique(candidateIds(heroes), count, new Set(), rng);
  return {
    version: 1,
    ownerName,
    handIds,
    usedIds: [...handIds],
    revealedHeroId: null,
    revealedSkillName: null,
  };
}

export function revealHuashen(state, heroId, skillName) {
  if (!state.handIds.includes(heroId)) throw new RangeError("化身不在当前化身牌中");
  if (!skillName) throw new RangeError("请选择一个技能");
  return { ...state, revealedHeroId: heroId, revealedSkillName: skillName };
}

export function replaceHuashen(state, removeIds, heroes, rng = cryptoIndex) {
  if (state.ownerName !== "界左慈") throw new RangeError("只有界左慈可以移去并补充化身");
  const unique = [...new Set(removeIds)];
  if (!unique.length || unique.length > 2) throw new RangeError("每次须移去一至两张化身");
  if (unique.some((id) => !state.handIds.includes(id))) throw new RangeError("只能移去当前化身");
  if (unique.includes(state.revealedHeroId)) throw new RangeError("已亮明的化身不能移去");

  const retained = state.handIds.filter((id) => !unique.includes(id));
  const replacements = drawUnique(
    candidateIds(heroes),
    unique.length,
    new Set([...state.usedIds, ...retained]),
    rng,
  );
  return {
    ...state,
    handIds: [...retained, ...replacements],
    usedIds: [...new Set([...state.usedIds, ...replacements])],
  };
}

export function addXinsheng(state, heroes, rng = cryptoIndex) {
  const [next] = drawUnique(candidateIds(heroes), 1, new Set(state.usedIds), rng);
  if (!next) throw new RangeError("没有未使用的本地化身");
  return {
    ...state,
    handIds: [...state.handIds, next],
    usedIds: [...state.usedIds, next],
  };
}
