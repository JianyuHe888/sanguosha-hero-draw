import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the finished hero draw app", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  const heroes = JSON.parse(
    await readFile(new URL("../app/data/heroes.json", import.meta.url), "utf8"),
  );
  const presetCounts = [1, 2, 3, 4].map(
    (level) => heroes.filter(
      (hero) => hero.presetLevel <= level && hero.faceToFace !== "excluded",
    ).length,
  );
  assert.match(html, /<title>面杀助手｜三国杀面杀选将器<\/title>/i);
  assert.match(html, /定下牌池/);
  assert.match(html, /抽将开战/);
  assert.match(html, new RegExp(String(heroes.length)));
  for (const label of ["经典身份", "界限平衡", "进阶平衡", "完整将池"]) {
    assert.match(html, new RegExp(label));
  }
  for (const count of presetCounts) assert.match(html, new RegExp(String(count)));
  assert.doesNotMatch(html, /推荐将池/);
  assert.match(html, /三国杀移动版身份局/);
  assert.match(html, /og\.png/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("ships a complete and normalized mobile identity catalog", async () => {
  const source = await readFile(
    new URL("../app/data/heroes.json", import.meta.url),
    "utf8",
  );
  const heroes = JSON.parse(source);

  assert.equal(heroes.length, 573);
  assert.equal(
    heroes.reduce((total, hero) => total + hero.skills.length, 0),
    1219,
  );
  assert.equal(heroes.filter((hero) => hero.presetLevel <= 1).length, 149);
  assert.equal(heroes.filter((hero) => hero.presetLevel <= 2).length, 293);
  assert.equal(heroes.filter((hero) => hero.presetLevel <= 3).length, 400);
  assert.equal(heroes.filter((hero) => hero.presetLevel <= 4).length, 573);
  assert.equal(heroes.filter((hero) => hero.faceToFace === "assisted").length, 6);
  assert.equal(new Set(heroes.map((hero) => hero.id)).size, heroes.length);
  assert.ok(heroes.every((hero) => hero.name && hero.faction && hero.pack && hero.sourcePack));
  assert.ok(heroes.every((hero) => /^https:\/\//.test(hero.image)));
  assert.ok(heroes.every((hero) => Array.isArray(hero.skills) && hero.skills.length > 0));
  assert.ok(
    heroes.every((hero) =>
      hero.skills.every((skill) => skill.name && skill.description),
    ),
  );
  assert.ok(
    heroes.every((hero) =>
      hero.skills.every(
        (skill) =>
          !/px\||class=|\|link=|[‘’]{2,}|军争\/|团战模式|斗地主模式|身份模式\/|\[\[|\{\{|<[^>]+>|文件:/.test(
            skill.description,
          ),
      ),
    ),
  );
  assert.ok(
    heroes.every((hero) =>
      /^https:\/\/www\.sanguosha\.cn\//.test(hero.officialUrl),
    ),
  );
  assert.ok(
    heroes.every((hero) =>
      /^https:\/\/wiki\.biligame\.com\/msgs\//.test(hero.wikiUrl),
    ),
  );
  assert.ok(heroes.every((hero) => !Object.hasOwn(hero, "recommended")));
  assert.ok(heroes.every((hero) => [1, 2, 3, 4].includes(hero.presetLevel)));
  assert.ok(
    heroes.every((hero) => ["native", "assisted", "excluded"].includes(hero.faceToFace)),
  );
  assert.ok(heroes.every((hero) => Array.isArray(hero.assistantModules)));
  assert.ok(heroes.every((hero) => ["魏", "蜀", "吴", "群", "晋", "神", "魔"].includes(hero.faction)));
  assert.ok(heroes.every((hero) => Number.isInteger(hero.hp) && hero.hp >= 1 && hero.hp <= 15));
  assert.ok(
    heroes.every((hero) =>
      hero.maxHp === undefined ||
      (Number.isInteger(hero.maxHp) && hero.maxHp >= hero.hp),
    ),
  );
  assert.ok(
    heroes.every((hero) =>
      hero.skills.every((skill) => !/【(?:身份|军争|团战|斗地主)/.test(skill.description)),
    ),
  );

  const shensunce = heroes.find((hero) => hero.name === "神孙策");
  assert.equal(shensunce?.hp, 1);
  assert.equal(shensunce?.maxHp, 6);
  assert.doesNotMatch(
    shensunce?.skills.find((skill) => skill.name === "英霸")?.description ?? "",
    /限制。$/,
  );

  const buzhidingspan = heroes
    .find((hero) => hero.name === "步骘")
    ?.skills.find((skill) => skill.name === "定叛");
  assert.match(buzhidingspan?.description ?? "", /反贼数/);
  assert.doesNotMatch(buzhidingspan?.description ?? "", /敌方角色数|农民数/);

  const zhuandui = heroes
    .find((hero) => hero.name === "秦宓")
    ?.skills.find((skill) => skill.name === "专对");
  assert.match(zhuandui?.description ?? "", /指定其他角色为目标后\/成为其他角色使用【杀】的目标后/);
  assert.match(zhuandui?.description ?? "", /不能响应此【杀】\/此【杀】对你无效/);

  const zaiqi = heroes
    .find((hero) => hero.name === "谋孟获")
    ?.skills.find((skill) => skill.name === "再起");
  assert.match(zaiqi?.description ?? "", /（0\/7）/);

  const luanqun = heroes
    .find((hero) => hero.name === "来敏")
    ?.skills.find((skill) => skill.name === "乱群");
  assert.match(luanqun?.description ?? "", /至多四张/);

  const tamo = heroes
    .find((hero) => hero.name === "神鲁肃")
    ?.skills.find((skill) => skill.name === "榻谟");
  assert.match(tamo?.description ?? "", /除“主公”以外/);

  const shixia = heroes
    .find((hero) => hero.name === "牵招")
    ?.skills.find((skill) => skill.name === "势吓");
  assert.match(shixia?.description ?? "", /防止其对你造成的伤害/);
  assert.doesNotMatch(shixia?.description ?? "", /己方角色|团战|斗地主/);

  const xiahoudun = heroes.find((hero) => hero.name === "界夏侯惇");
  assert.ok(xiahoudun);
  const qingjian = xiahoudun.skills.find((skill) => skill.name === "清俭");
  assert.match(qingjian?.description ?? "", /扣置于你的武将牌上/);
  assert.match(qingjian?.description ?? "", /大于一张，你摸一张牌/);
  assert.doesNotMatch(qingjian?.description ?? "", /手牌上限/);
});
