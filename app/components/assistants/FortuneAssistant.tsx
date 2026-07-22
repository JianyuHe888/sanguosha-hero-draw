"use client";

import fortuneData from "../../data/fortune-signs.json";
import { buildFortuneUrn, drawFortuneSign, resetFortuneState } from "../../lib/fortune-rules.mjs";
import type { AssistantPanelProps } from "./types";

type FortuneState = ReturnType<typeof resetFortuneState>;

export function FortuneAssistant({ state, onChange }: AssistantPanelProps) {
  const current = (state as FortuneState | null) ?? resetFortuneState();
  const result = fortuneData.find((sign) => sign.id === current.resultId);
  const choosePrivate = (cheatId: string | null) => onChange({ ...current, cheatId, privateStep: false, resultId: null });
  const draw = () => {
    const urn = buildFortuneUrn(fortuneData.map((sign) => sign.id), current.cheatId);
    onChange({ ...current, resultId: drawFortuneSign(urn) });
  };

  if (current.privateStep) {
    return (
      <div className="private-choice">
        <span>仅周群玩家查看</span><h3>选择要额外放入的一签</h3><p>选择后页面会回到中性状态，再把屏幕交回全桌。</p>
        <div>{fortuneData.map((sign) => <button key={sign.id} onClick={() => choosePrivate(sign.id)} type="button">{sign.name}</button>)}</div>
        <button className="text-action" onClick={() => choosePrivate(null)} type="button">不加签</button>
      </div>
    );
  }

  if (result) {
    return (
      <div className={`fortune-result ${result.tone}`}>
        <span>命运签</span><strong>{result.name}</strong><p>{result.effect}</p>
        <button onClick={() => onChange({ ...current, resultId: null })} type="button">收起结果</button>
      </div>
    );
  }

  return (
    <div className="assistant-empty fortune-home">
      <span className="assistant-emblem">签</span><h3>屏幕已可交给全桌</h3>
      <p>{current.cheatId ? "加签选择已封存；当前签池共六签。" : "当前为五签等概率抽取。"}</p>
      <button onClick={draw} type="button">公开抽取命运签</button>
      <button className="secondary-action" onClick={() => onChange({ ...current, privateStep: true, resultId: null })} type="button">遮住屏幕选择加签</button>
    </div>
  );
}
