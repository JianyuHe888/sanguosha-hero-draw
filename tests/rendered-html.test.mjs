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
  assert.match(html, /<title>武将台｜三国杀面杀选将器<\/title>/i);
  assert.match(html, /定下牌池/);
  assert.match(html, /抽将开战/);
  assert.match(html, /681/);
  assert.match(html, /推荐将池/);
  assert.match(html, /og\.png/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("ships a complete and normalized official hero catalog", async () => {
  const source = await readFile(
    new URL("../app/data/heroes.json", import.meta.url),
    "utf8",
  );
  const heroes = JSON.parse(source);

  assert.equal(heroes.length, 681);
  assert.equal(new Set(heroes.map((hero) => hero.id)).size, 681);
  assert.ok(heroes.every((hero) => hero.name && hero.faction && hero.pack));
  assert.ok(heroes.every((hero) => /^https:\/\//.test(hero.image)));
  assert.ok(heroes.every((hero) => Array.isArray(hero.skills) && hero.skills.length > 0));
  assert.ok(
    heroes.every((hero) =>
      hero.skills.every((skill) => skill.name && skill.description),
    ),
  );
  assert.ok(
    heroes.every((hero) =>
      /^https:\/\/www\.sanguosha\.com\/hero\/\d+$/.test(hero.officialUrl),
    ),
  );
  assert.deepEqual(
    [...new Set(heroes.map((hero) => hero.faction))].sort(),
    ["吴", "晋", "神", "群", "蜀", "魏"].sort(),
  );
});
