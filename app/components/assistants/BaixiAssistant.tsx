"use client";

import { useEffect, useMemo, useState } from "react";
import { BAIXI_PUPPETS, createBaixiRound, selectBaixiPuppet, turnBaixiValve } from "../../lib/minigame-rules.mjs";
import type { AssistantPanelProps } from "./types";

type BaixiState = {
  version: number;
  phase: string;
  selectedIds: string[];
  progress: Record<string, number>;
  awards: Array<{ puppetId: string; category: string; count: number }>;
  merchantThreshold: number;
};

export function BaixiAssistant({ state, onChange }: AssistantPanelProps) {
  const initial = useMemo(() => createBaixiRound(), []);
  const current = (state as BaixiState | null) ?? initial;
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(12);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (seconds <= 1) {
        setRunning(false);
        onChange({ ...current, phase: "finished" });
      } else {
        setSeconds((value) => value - 1);
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [current, onChange, running, seconds]);

  const choose = (id: string) => {
    try { onChange(selectBaixiPuppet(current, id)); setError(""); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "无法选择"); }
  };

  if (current.phase === "finished") {
    return (
      <div className="assistant-result baixi-result">
        <span>水转百戏结果</span>
        {current.awards.length ? current.awards.map((award) => <p key={award.puppetId}><b>{award.count}</b> 张随机【{award.category}】</p>) : <p>本轮没有完成机关。</p>}
        <small>请从实体牌堆中随机取得相应类别；若需检索，完成后洗牌。本助手不记录牌名。</small>
        <button onClick={() => onChange(createBaixiRound())} type="button">重开一轮</button>
      </div>
    );
  }

  return (
    <div className="assistant-flow">
      <div className="assistant-callout"><b>水转百戏</b><span>{running ? `剩余 ${seconds} 秒，快速转动已选机关` : "先选择至多三个机关，再开始十二秒挑战"}</span></div>
      {error && <p className="assistant-error">{error}</p>}
      <div className="puppet-grid">
        {Object.entries(BAIXI_PUPPETS).map(([id, puppet]) => {
          const threshold = id === "shang" ? current.merchantThreshold : puppet.threshold;
          const selected = current.selectedIds.includes(id);
          const completed = current.awards.some((award) => award.puppetId === id);
          return (
            <button
              aria-pressed={selected}
              className={`${selected ? "selected" : ""} ${completed ? "completed" : ""}`}
              disabled={running ? !selected || completed : false}
              key={id}
              onClick={() => running ? onChange(turnBaixiValve(current, id)) : choose(id)}
              type="button"
            >
              <strong>{puppet.name}</strong>
              <span>{current.progress[id] ?? 0} / {threshold}</span>
              <i>{completed ? "已完成" : running ? "转动" : selected ? "已选择" : "选择"}</i>
            </button>
          );
        })}
      </div>
      {!running && <div className="assistant-actions"><button disabled={!current.selectedIds.length} onClick={() => { setSeconds(12); setRunning(true); }} type="button">开始 12 秒百戏</button></div>}
    </div>
  );
}
