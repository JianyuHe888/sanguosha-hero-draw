"use client";

import { useState } from "react";
import { addXinsheng, createHuashenState, replaceHuashen, revealHuashen } from "../../lib/huashen-rules.mjs";
import type { AssistantPanelProps } from "./types";

type HuashenState = {
  version: number;
  ownerName: string;
  handIds: string[];
  usedIds: string[];
  revealedHeroId: string | null;
  revealedSkillName: string | null;
};

export function HuashenAssistant({ hero, heroes, state, onChange }: AssistantPanelProps) {
  const current = state as HuashenState | null;
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const hand = current?.handIds.map((id) => heroes.find((item) => item.id === id)).filter(Boolean) ?? [];

  const run = (action: () => HuashenState) => {
    try {
      onChange(action());
      setSelected([]);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "当前操作无法完成");
    }
  };

  if (!current) {
    return (
      <div className="assistant-empty">
        <span className="assistant-emblem">化</span>
        <h3>准备本局化身牌</h3>
        <p>{hero.name === "界左慈" ? "随机获得三张" : "随机获得两张"}不需要其他辅助的身份武将；已出现的化身本局不会重复。</p>
        <button onClick={() => run(() => createHuashenState(hero.name, heroes))} type="button">开始化身</button>
      </div>
    );
  }

  return (
    <div className="assistant-flow">
      <div className="assistant-callout">
        <b>当前亮明</b>
        <span>{current.revealedHeroId
          ? `${heroes.find((item) => item.id === current.revealedHeroId)?.name} · ${current.revealedSkillName}`
          : "点击一张化身上的技能来亮明"}</span>
      </div>
      {error && <p className="assistant-error" role="alert">{error}</p>}
      <div className="huashen-grid">
        {hand.map((candidate) => candidate && (
          <article className={current.revealedHeroId === candidate.id ? "huashen-card active" : "huashen-card"} key={candidate.id}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" src={candidate.image} />
            <div className="huashen-title"><b>{candidate.name}</b><span>{candidate.faction}</span></div>
            <div className="huashen-skills">
              {candidate.skills.filter((skill) => skill.kind === "base").map((skill) => (
                <button
                  aria-pressed={current.revealedHeroId === candidate.id && current.revealedSkillName === skill.name}
                  key={skill.id}
                  onClick={() => run(() => revealHuashen(current, candidate.id, skill.name))}
                  type="button"
                >
                  <b>{skill.name}</b><span>{skill.description}</span>
                </button>
              ))}
            </div>
            {hero.name === "界左慈" && current.revealedHeroId !== candidate.id && (
              <label className="huashen-remove">
                <input
                  checked={selected.includes(candidate.id)}
                  onChange={() => setSelected((value) => value.includes(candidate.id)
                    ? value.filter((id) => id !== candidate.id)
                    : value.length < 2 ? [...value, candidate.id] : value)}
                  type="checkbox"
                />
                待移去
              </label>
            )}
          </article>
        ))}
      </div>
      <div className="assistant-actions">
        <button onClick={() => run(() => addXinsheng(current, heroes))} type="button">新生：获得一张</button>
        {hero.name === "界左慈" && (
          <button disabled={!selected.length} onClick={() => run(() => replaceHuashen(current, selected, heroes))} type="button">
            移去并补充{selected.length ? `（${selected.length}）` : ""}
          </button>
        )}
      </div>
      <p className="assistant-footnote">性别按所亮明化身处理；此助手只记录公开的化身与技能，不记录实体牌堆内容。</p>
    </div>
  );
}
