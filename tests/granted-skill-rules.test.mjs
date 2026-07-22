import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  classifyHeroSkills,
  extractGrantReferences,
  validateSkillGraph,
} from "../scripts/granted-skill-rules.mjs";

const row = (id, name, rawDescription, description = name) => ({
  id,
  name,
  rawDescription,
  description,
  order: 1,
});

test("extracts only links after an acquisition trigger", () => {
  const raw = "失去技能<span data-name=\"良助/SP孙尚香@\">良助</span>并获得技能<span data-name=\"枭姬/SP孙尚香@\">枭姬</span>。";
  assert.deepEqual(extractGrantReferences(raw), ["枭姬/SP孙尚香"]);
  assert.deepEqual(extractGrantReferences("若你拥有技能“极略”，你摸一张牌。"), []);
});

test("keeps innate skills base and marks Sun Ce gains as click-only", () => {
  const skills = [
    row("激昂/孙策", "激昂", ""),
    row("魂姿/孙策", "魂姿", "获得技能“英姿”和“英魂”。"),
    row("制霸/孙策", "制霸", ""),
    row("英姿/孙策", "英姿", ""),
    row("英魂/孙策", "英魂", ""),
  ];
  const classified = classifyHeroSkills(skills, skills);
  assert.deepEqual(
    classified.filter((skill) => skill.kind === "base").map((skill) => skill.name),
    ["激昂", "魂姿", "制霸"],
  );
  assert.deepEqual(
    classified.find((skill) => skill.name === "魂姿").grants.map(
      (id) => classified.find((skill) => skill.id === id).name,
    ),
    ["英姿", "英魂"],
  );
});

test("does not mark a lost skill as granted", () => {
  const skills = [
    row("良助/SP孙尚香", "良助", ""),
    row("返乡", "返乡", "失去技能“良助”并获得技能“枭姬”。"),
    row("枭姬/SP孙尚香", "枭姬", ""),
  ];
  const classified = classifyHeroSkills(skills, skills);
  assert.equal(classified.find((skill) => skill.name === "良助").kind, "base");
  assert.equal(classified.find((skill) => skill.name === "枭姬").kind, "granted");
});

test("builds the nested Divine Sima Yi graph without cycles", () => {
  const skills = [
    row("忍戒", "忍戒", ""),
    row("拜印", "拜印", "获得技能“极略”。"),
    row("连破", "连破", "若你拥有技能“极略”，你选择并获得一个“极略”中包含的技能。"),
    row("极略", "极略", "获得技能“鬼才”，然后获得对应的技能：“放逐”“集智”“制衡”“完杀”。②选择并获得一个“极略”中包含的技能。"),
    row("鬼才/神司马懿", "鬼才", ""),
    row("放逐/神司马懿", "放逐", ""),
    row("集智/神司马懿", "集智", ""),
    row("制衡/神司马懿", "制衡", ""),
    row("完杀/神司马懿", "完杀", ""),
  ];
  const classified = classifyHeroSkills(skills, skills);
  assert.doesNotThrow(() => validateSkillGraph(classified));
  assert.deepEqual(
    classified.find((skill) => skill.name === "拜印").grants.map(
      (id) => classified.find((skill) => skill.id === id).name,
    ),
    ["极略"],
  );
  assert.deepEqual(
    classified.find((skill) => skill.name === "极略").grants.map(
      (id) => classified.find((skill) => skill.id === id).name,
    ),
    ["鬼才", "放逐", "集智", "制衡", "完杀"],
  );
});

test("generated data keeps Sun Ce acquired skills out of the base list", async () => {
  const heroes = JSON.parse(
    await readFile(new URL("../app/data/heroes.json", import.meta.url), "utf8"),
  );
  const sunce = heroes.find((hero) => hero.name === "孙策");
  assert.deepEqual(
    sunce.skills.filter((skill) => skill.kind === "base").map((skill) => skill.name),
    ["激昂", "魂姿", "制霸"],
  );
  const simayi = heroes.find((hero) => hero.name === "神司马懿");
  assert.deepEqual(
    simayi.skills.find((skill) => skill.name === "极略").grants.map(
      (id) => simayi.skills.find((skill) => skill.id === id).name,
    ),
    ["鬼才", "放逐", "集智", "制衡", "完杀"],
  );
  assert.ok(
    ["极略", "鬼才", "放逐", "集智", "制衡", "完杀"].every(
      (name) => simayi.skills.find((skill) => skill.name === name).kind === "granted",
    ),
  );
});
