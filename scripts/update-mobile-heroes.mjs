import { mkdir, readFile, writeFile } from "node:fs/promises";
import faceToFaceConfig from "../app/data/face-to-face.json" with { type: "json" };
import { classifyHeroSkills } from "./granted-skill-rules.mjs";
import { getExistingImage } from "./mobile-data-cache.mjs";
import { getPresetLevel } from "./mobile-pool-rules.mjs";

const dataUrl = new URL("../app/data/heroes.json", import.meta.url);
const cacheUrl = new URL("./.cache/", import.meta.url);
const mobileRosterUrl = "https://www.sanguosha.cn/index.php/pc/hero-list.html";
const wikiApiUrl = "https://wiki.biligame.com/msgs/api.php";
const pageSize = 250;
const refresh = process.argv.includes("--refresh");
const unreleasedWithoutArtwork = new Set(["关羽兔", "赵云兔"]);

const assistedModulesByHero = new Map();
for (const [moduleId, module] of Object.entries(faceToFaceConfig.modules)) {
  for (const heroName of module.heroNames) {
    const current = assistedModulesByHero.get(heroName) ?? [];
    current.push(moduleId);
    assistedModulesByHero.set(heroName, current);
  }
}

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function decodeHtml(value) {
  const entities = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };

  return value.replace(
    /&(#x[\da-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/gi,
    (_, entity) => {
      if (entity.startsWith("#x")) {
        return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
      }
      if (entity.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
      }
      return entities[entity.toLowerCase()] ?? `&${entity};`;
    },
  );
}

function selectIdentityModeText(value) {
  return value.replace(
    /<ruby[^>]*>\s*<rb[^>]*>([\s\S]*?)<\/rb>\s*<rt[^>]*>([\s\S]*?)<\/rt>\s*<\/ruby>/gi,
    (_, content, modeLabel) => {
      const mode = modeLabel.replace(/<[^>]+>/g, "");
      return /军争|身份/.test(mode)
        ? `\uE000${content}\uE001`
        : "\uE002";
    },
  );
}

function cleanText(value, { multiline = false } = {}) {
  const cleaned = selectIdentityModeText(decodeHtml(String(value ?? "")))
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\[\[(?:file|文件):[^\]]+\]\]/gi, "")
    .replace(/\[\[[^\]|]+\|([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/[‘’]{2,3}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[“"']?\uE002[”"']?\s*\/\s*/g, "")
    .replace(/\s*\/\s*[“"']?\uE002[”"']?/g, "")
    .replace(/[“"']?\uE002[”"']?/g, "")
    .replace(/[\uE000-\uE001]/g, "")
    .replace(/[{}]/g, "")
    .replace(/[“”]\s*[“”]/g, "");
  const normalized = cleaned
    .replace(/\[杀\]/g, "【杀】")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();

  return multiline ? normalized.replace(/\n{3,}/g, "\n\n") : normalized.replace(/\s+/g, " ");
}

function literalText(value) {
  const source = value && typeof value === "object"
    ? value.fulltext ?? value.raw ?? value.timestamp ?? ""
    : value;
  return decodeHtml(String(source ?? "")).replace(/<[^>]+>/g, "").trim();
}

function selectIdentitySection(value) {
  const markers = [
    ...value.matchAll(
      /【((?:身份|军争|团战|斗地主)(?:\/?(?:身份|军争|团战|斗地主))*)(?:模式)?】/g,
    ),
  ];
  if (markers.length === 0) return value;

  const identity = markers.find((marker) => /身份|军争/.test(marker[1]));
  if (!identity) return value;
  const next = markers.find((marker) => (marker.index ?? 0) > (identity.index ?? 0));
  const prefix = value.slice(0, markers[0].index).trim();
  const section = value
    .slice((identity.index ?? 0) + identity[0].length, next?.index ?? value.length)
    .trim();
  return [prefix, section].filter(Boolean).join("\n");
}

function parseVitality(value) {
  const match = value.match(/^(\d+)(?:\/(\d+))?(?:-(\d+))?$/);
  if (!match) return null;
  const vitality = { hp: Number.parseInt(match[1], 10) };
  if (match[2]) vitality.maxHp = Number.parseInt(match[2], 10);
  if (match[3]) vitality.armor = Number.parseInt(match[3], 10);
  return vitality;
}

function correctSkillText(owner, name, value) {
  if (owner === "大乔小乔" && name === "星舞") {
    return value.replace("三张花色均不相同的舞”", "三张花色均不相同的“舞”");
  }
  if (owner === "神孙策" && name === "英霸") {
    return value.replace("使用牌无距离限制。", "使用牌无距离限制）。");
  }
  if (owner === "谋杨婉" && name === "暝眩") {
    return value
      .replace("其他角色数)", "其他角色数）")
      .replace("然后依次令这些角色依次选择", "然后令这些角色依次选择");
  }
  return value;
}

function normalizeName(value) {
  return cleanText(value).replace(/[·・•\s]/g, "");
}

async function fetchText(url, options = {}, attempts = 4) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          accept: "application/json,text/html;q=0.9,*/*;q=0.8",
          referer: "https://wiki.biligame.com/msgs/",
          "user-agent": "MianshaAssistantDataUpdater/2.0",
          ...options.headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (/请求已被站点的安全策略拦截|Restricted Access/i.test(text)) {
        throw new Error("数据源暂时限制访问");
      }
      return text;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 2_500);
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

async function askWiki(query) {
  return postWiki({
    action: "ask",
    format: "json",
    query,
  });
}

async function postWiki(parameters) {
  const body = new URLSearchParams(parameters);
  const raw = await fetchText(wikiApiUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`移动版 WIKI 返回了非 JSON 内容：${raw.slice(0, 80)}`);
  }
}

async function readCachedJson(name) {
  if (refresh) return null;
  try {
    return JSON.parse(await readFile(new URL(name, cacheUrl), "utf8"));
  } catch {
    return null;
  }
}

async function writeCachedJson(name, value) {
  await mkdir(cacheUrl, { recursive: true });
  await writeFile(new URL(name, cacheUrl), JSON.stringify(value), "utf8");
}

async function askWikiAll(cacheName, baseQuery, properties) {
  const cached = await readCachedJson(cacheName);
  if (cached) {
    console.log(`已使用缓存的移动版 WIKI ${cached.length} 条记录`);
    return cached;
  }

  const rows = [];
  let offset = 0;

  while (true) {
    const query = [
      baseQuery,
      ...properties.map((property) => `?${property}`),
      `limit=${pageSize}`,
      `offset=${offset}`,
    ].join("|");
    const response = await askWiki(query);
    const results = Object.values(response.query?.results ?? {});
    rows.push(...results);

    process.stdout.write(`\r已读取移动版 WIKI ${rows.length} 条记录`);
    const nextOffset = response["query-continue-offset"];
    if (!Number.isInteger(nextOffset) || results.length === 0) break;
    offset = nextOffset;
    await sleep(800);
  }

  process.stdout.write("\n");
  await writeCachedJson(cacheName, rows);
  return rows;
}

function printout(row, property) {
  return row.printouts?.[property] ?? [];
}

function firstText(row, property) {
  const value = printout(row, property)[0];
  if (value && typeof value === "object") {
    return cleanText(value.fulltext ?? value.raw ?? value.timestamp ?? "");
  }
  return cleanText(value ?? "");
}

function allText(row, property) {
  return printout(row, property)
    .map((value) =>
      cleanText(
        value && typeof value === "object"
          ? value.fulltext ?? value.raw ?? value.timestamp ?? ""
          : value,
      ),
    )
    .filter(Boolean);
}

async function readOfficialRoster() {
  const rosterCacheUrl = new URL("mobile-roster.html", cacheUrl);
  let html;

  if (!refresh) {
    try {
      html = await readFile(rosterCacheUrl, "utf8");
    } catch {
      // 首次运行时读取官网并建立缓存。
    }
  }

  if (!html) {
    html = await fetchText(
      mobileRosterUrl,
      { headers: { accept: "text/html,application/xhtml+xml" } },
      7,
    );
    await mkdir(cacheUrl, { recursive: true });
    await writeFile(rosterCacheUrl, html, "utf8");
  }
  const expression =
    /<a\s+href="(?<url>https:\/\/www\.sanguosha\.cn\/index\.php\/pc\/hero-detail-(?<id>\d+)\.html)"[\s\S]*?<div class="general-img"><img src="(?<image>[^"]+)" alt="(?<name>[^"]+)"/gi;
  const roster = new Map();

  for (const match of html.matchAll(expression)) {
    const entry = {
      id: match.groups.id,
      name: cleanText(match.groups.name),
      image: match.groups.image,
      officialUrl: match.groups.url,
    };
    roster.set(normalizeName(entry.name), entry);
  }

  if (roster.size < 500) {
    throw new Error(`移动版官网仅解析出 ${roster.size} 名武将，低于安全阈值。`);
  }

  return roster;
}

async function readWikiImages(wikiHeroes) {
  const imageTitlesByHero = new Map();
  const imageUrlByTitle = new Map();

  for (let index = 0; index < wikiHeroes.length; index += 30) {
    const batch = wikiHeroes.slice(index, index + 30);
    const response = await postWiki({
      action: "query",
      format: "json",
      formatversion: "2",
      imlimit: "500",
      prop: "images",
      titles: batch.map((hero) => hero.wikiName).join("|"),
    });

    for (const page of response.query?.pages ?? []) {
      const normalizedTitle = normalizeName(page.title);
      const classicPrefix = normalizeName(`文件:${normalizedTitle}-经典形象.`);
      const avatarPrefix = normalizeName(`文件:${normalizedTitle}-头像.`);
      const images = page.images ?? [];
      const image =
        images.find((candidate) =>
          normalizeName(candidate.title).startsWith(classicPrefix),
        ) ??
        images.find((candidate) =>
          normalizeName(candidate.title).startsWith(avatarPrefix),
        );
      if (image) imageTitlesByHero.set(page.title, image.title);
    }
    await sleep(500);
  }

  const imageTitles = [...new Set(imageTitlesByHero.values())];
  for (let index = 0; index < imageTitles.length; index += 30) {
    const batch = imageTitles.slice(index, index + 30);
    const response = await postWiki({
      action: "query",
      format: "json",
      formatversion: "2",
      iiprop: "url",
      prop: "imageinfo",
      titles: batch.join("|"),
    });

    for (const page of response.query?.pages ?? []) {
      const url = page.imageinfo?.[0]?.url;
      if (url) imageUrlByTitle.set(page.title, url);
    }
    await sleep(500);
  }

  return new Map(
    wikiHeroes.map((hero) => [
      hero.wikiName,
      imageUrlByTitle.get(imageTitlesByHero.get(hero.wikiName)) ?? "",
    ]),
  );
}

function normalizePack(heroName, rawPacks) {
  const source = rawPacks.join("、");

  if (heroName.startsWith("界") || /界限突破/.test(source)) return "界限突破";
  if (heroName.startsWith("谋") || /谋攻篇/.test(source)) return "谋";
  if (heroName.startsWith("星") || /星河璀璨|将星独具/.test(source)) return "星";
  if (heroName.startsWith("势") || /江山如故|兵势篇/.test(source)) return "势";
  if (heroName.startsWith("族") || /门阀|士族/.test(source)) return "门阀士族";
  if (heroName.startsWith("友")) return "友";
  if (heroName.startsWith("骥")) return "骥";
  if (heroName.startsWith("魔")) return "魔";
  if (heroName.startsWith("SP") || /SP/.test(source)) return "SP";
  if (heroName.startsWith("神") || /神将/.test(source)) return "神将";
  if (/神话再临|风包|火包|林包|山包/.test(source)) return "神话再临";
  if (/一将成名/.test(source)) return "一将成名";
  if (/标准/.test(source)) return "标准";
  if (/始计篇/.test(source)) return "始计篇";
  if (/乱世英杰/.test(source)) return "乱世英杰";
  if (/龙血玄黄/.test(source)) return "龙血玄黄";
  if (/袖里乾坤/.test(source)) return "袖里乾坤";
  if (/限时武将/.test(source)) return "限时武将";
  if (/缘包/.test(source)) return "缘";
  if (/未分组/.test(source)) return "最新武将";

  return cleanText(rawPacks[0] ?? "独立扩展").replace(/包$/, "") || "独立扩展";
}

function normalizeFaction(value) {
  return value === "群（晋）" ? "晋" : value;
}

function skillFromRow(row) {
  const owner = firstText(row, "所属武将");
  const name = firstText(row, "技能名");
  const rawDescription = printout(row, "经典技能描述")[0] ?? "";
  const description = cleanText(rawDescription, {
    multiline: true,
  });
  return {
    id: cleanText(row.fulltext) || `${name}/${owner}`,
    owner,
    name,
    rawDescription: String(rawDescription),
    description: correctSkillText(owner, name, selectIdentitySection(description)),
    order: Number.parseInt(firstText(row, "技能序号"), 10) || 999,
  };
}

async function main() {
  const oldHeroes = JSON.parse(await readFile(dataUrl, "utf8"));
  const officialRoster = await readOfficialRoster();
  const [wikiHeroRows, wikiSkillRows] = await Promise.all([
    askWikiAll(
      "wiki-identity-heroes.json",
      "[[分类:武将]][[出现模式::身份]][[经典体力::+]]",
      ["武将名", "势力", "出现模式", "武将包", "经典体力", "经典品质"],
    ),
    askWikiAll(
      "wiki-classic-skills.json",
      "[[分类:技能]][[所属武将::+]][[经典技能描述::+]]",
      ["所属武将", "技能名", "经典技能描述", "技能序号"],
    ),
  ]);

  const wikiHeroes = wikiHeroRows
    .map((row) => {
      const name = firstText(row, "武将名") || cleanText(row.fulltext);
      return {
        wikiName: cleanText(row.fulltext),
        name: normalizeName(name),
        faction: normalizeFaction(firstText(row, "势力")),
        modes: allText(row, "出现模式"),
        rawPacks: allText(row, "武将包"),
        hpText: literalText(printout(row, "经典体力")[0]),
        rarity: firstText(row, "经典品质") || "普通",
        wikiUrl: row.fullurl,
      };
    })
    .filter(
      (hero) =>
        hero.name !== "其他角色" &&
        !unreleasedWithoutArtwork.has(hero.name) &&
        !hero.rawPacks.some((pack) => pack.includes("废案武将")) &&
        !hero.rawPacks.some((pack) => pack.includes("武将试炼专属")),
    );
  const identityNames = new Set(wikiHeroes.map((hero) => hero.wikiName));
  const allSkills = wikiSkillRows.map((row) => skillFromRow(row));
  const unmatchedWikiHeroes = wikiHeroes.filter(
    (hero) => !officialRoster.has(normalizeName(hero.name)),
  );
  const cachedWikiImages = new Map(
    unmatchedWikiHeroes
      .map((hero) => [hero.wikiName, getExistingImage(hero.name, oldHeroes)])
      .filter(([, image]) => image),
  );
  const wikiImages = new Map([
    ...cachedWikiImages,
    ...await readWikiImages(
      unmatchedWikiHeroes.filter((hero) => !cachedWikiImages.has(hero.wikiName)),
    ),
  ]);
  const skillsByOwner = new Map();

  for (const skill of allSkills) {
    if (!identityNames.has(skill.owner) || !skill.name || !skill.description) continue;
    const current = skillsByOwner.get(skill.owner) ?? [];
    current.push(skill);
    skillsByOwner.set(skill.owner, current);
  }

  const missingOfficial = [];
  const missingSkills = [];
  const invalidHeroes = [];
  const heroes = [];

  for (const wikiHero of wikiHeroes) {
    const official = officialRoster.get(normalizeName(wikiHero.name));
    const ownedSkills = (skillsByOwner.get(wikiHero.wikiName) ?? [])
      .sort((left, right) => left.order - right.order || left.name.localeCompare(right.name, "zh-CN"))
      .filter(
        (skill, index, list) =>
          list.findIndex(
            (candidate) =>
              candidate.name === skill.name && candidate.description === skill.description,
          ) === index,
      );
    const skills = classifyHeroSkills(ownedSkills, allSkills);
    const vitality = parseVitality(wikiHero.hpText);

    const fallbackImage = wikiImages.get(wikiHero.wikiName) ?? "";
    if (!official && !fallbackImage) missingOfficial.push(wikiHero.name);
    if (skills.length === 0) missingSkills.push(wikiHero.name);
    if (!wikiHero.faction || !vitality || vitality.hp < 1) invalidHeroes.push(wikiHero.name);
    if ((!official && !fallbackImage) || skills.length === 0 || !wikiHero.faction || !vitality || vitality.hp < 1) {
      continue;
    }

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
  }

  const problems = { missingOfficial, missingSkills, invalidHeroes };
  if (Object.values(problems).some((items) => items.length > 0)) {
    console.error(JSON.stringify(problems, null, 2));
    throw new Error("移动版名录存在未完成映射，数据未写入。");
  }

  heroes.sort((left, right) => Number(left.id) - Number(right.id));
  const duplicateIds = heroes.filter(
    (hero, index) => heroes.findIndex((candidate) => candidate.id === hero.id) !== index,
  );
  const duplicateNames = heroes.filter(
    (hero, index) => heroes.findIndex((candidate) => candidate.name === hero.name) !== index,
  );
  if (duplicateIds.length || duplicateNames.length) {
    throw new Error(
      `存在重复数据：编号 ${duplicateIds.map((hero) => hero.id).join(", ")}；名称 ${duplicateNames.map((hero) => hero.name).join(", ")}`,
    );
  }

  await writeFile(dataUrl, `${JSON.stringify(heroes)}\n`, "utf8");

  const groupCounts = (property) =>
    Object.fromEntries(
      [...new Set(heroes.map((hero) => hero[property]))]
        .sort((left, right) => left.localeCompare(right, "zh-CN"))
        .map((value) => [value, heroes.filter((hero) => hero[property] === value).length]),
    );

  console.log(
    JSON.stringify(
      {
        before: oldHeroes.length,
        after: heroes.length,
        presets: Object.fromEntries(
          [1, 2, 3, 4].map((level) => [
            level,
            heroes.filter(
              (hero) => hero.presetLevel <= level && hero.faceToFace !== "excluded",
            ).length,
          ]),
        ),
        assisted: heroes.filter((hero) => hero.faceToFace === "assisted").length,
        excluded: heroes.filter((hero) => hero.faceToFace === "excluded").length,
        factions: groupCounts("faction"),
        packs: groupCounts("pack"),
        rarities: groupCounts("rarity"),
      },
      null,
      2,
    ),
  );
}

await main();
