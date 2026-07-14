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
  assert.match(html, /只收身份局/);
  assert.match(html, /全屏查看原牌/);
  assert.match(html, /166/);
  assert.match(html, /og-v2\.png/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});

test("ships a normalized physical identity-card catalog", async () => {
  const source = await readFile(
    new URL("../app/data/identity-cards.json", import.meta.url),
    "utf8",
  );
  const cards = JSON.parse(source);

  assert.equal(cards.length, 166);
  assert.equal(new Set(cards.map((card) => card.id)).size, 166);
  assert.ok(cards.every((card) => card.name && card.year && card.code));
  assert.ok(
    cards.every((card) =>
      /^https:\/\/patchwiki\.biligame\.com\/images\/tg\//.test(card.image),
    ),
  );
  assert.deepEqual(
    [...new Set(cards.map((card) => card.year))].sort(),
    ["2008", "2010", "2011", "2012", "2013", "2014"],
  );
});
