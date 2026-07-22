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
