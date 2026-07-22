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
