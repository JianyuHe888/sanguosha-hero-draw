export function getExistingImage(heroName, heroes) {
  return heroes.find((hero) => hero.name === heroName)?.image ?? "";
}
