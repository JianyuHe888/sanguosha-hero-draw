"use client";

import { useEffect, useMemo, useState } from "react";
import { createZhengjingRound, finishZhengjingRound, hitZhengjingTarget } from "../../lib/minigame-rules.mjs";
import type { AssistantPanelProps } from "./types";

type ZhengjingState = {
  version: number;
  phase: "idle" | "active" | "finished";
  targets: Array<{ id: string; kind: "jing" | "ink"; x: number; y: number }>;
  hits: string[];
  score: number;
};

export function ZhengjingAssistant({ state, onChange }: AssistantPanelProps) {
  const current = useMemo(
    () => (state as ZhengjingState | null) ?? { version: 1, phase: "idle" as const, targets: [], hits: [], score: 0 },
    [state],
  );
  const [targetIndex, setTargetIndex] = useState(0);

  useEffect(() => {
    if (current.phase !== "active") return;
    if (targetIndex >= current.targets.length) {
      onChange(finishZhengjingRound(current));
      return;
    }
    const timer = window.setTimeout(() => setTargetIndex((value) => value + 1), 800);
    return () => window.clearTimeout(timer);
  }, [current, onChange, targetIndex]);

  const start = () => {
    setTargetIndex(0);
    onChange(createZhengjingRound());
  };

  if (current.phase === "idle") {
    return <div className="assistant-empty"><span className="assistant-emblem">经</span><h3>八秒整经</h3><p>十枚竹简依次出现，其中五枚写有“经”。点中“经”即可计一张，墨点不计分。</p><button onClick={start} type="button">开始整经</button></div>;
  }

  if (current.phase === "finished") {
    return (
      <div className="assistant-result">
        <span>本次整经</span><strong>{current.score}</strong><b>张牌</b>
        <p>从实体牌堆顶取 {current.score} 张牌：可将其中任意张置于武将牌上作为“经”，其余获得。本助手不会记录这些牌是什么。</p>
        <button onClick={start} type="button">再整经一次</button>
      </div>
    );
  }

  const target = current.targets[targetIndex];
  return (
    <div className="zhengjing-game">
      <div className="game-progress"><span>竹简 {Math.min(targetIndex + 1, 10)} / 10</span><b>已得 {current.score} 张</b></div>
      <div className="bamboo-field">
        {target && (
          <button
            aria-label="点击竹简"
            className="bamboo-target"
            onClick={() => onChange(hitZhengjingTarget(current, target.id))}
            style={{ left: `${target.x}%`, top: `${target.y}%` }}
            type="button"
          >
            {target.kind === "jing" ? "经" : "●"}
          </button>
        )}
      </div>
    </div>
  );
}
