"use client";

import eunuchData from "../../data/ten-eunuchs.json";
import { canPair, confirmJiedang, createJiedangState, enterRest, finishRest, startJiedang } from "../../lib/eunuch-rules.mjs";
import type { AssistantPanelProps } from "./types";

type JiedangState = {
  version: number;
  rejectionById: Record<string, string>;
  usedIds: string[];
  currentMainId: string | null;
  candidateIds: string[];
  currentDeputyId: string | null;
  resting: boolean;
};

const ids = eunuchData.map((item) => item.id);
const byId = new Map(eunuchData.map((item) => [item.id, item]));

function EunuchCard({ id, note }: { id: string; note?: string }) {
  const item = byId.get(id)!;
  return <div className="eunuch-card"><span>{note}</span><strong>{item.name}</strong><b>{item.skill}</b><p>{item.summary}</p></div>;
}

export function JiedangAssistant({ state, onChange }: AssistantPanelProps) {
  const current = state as JiedangState | null;
  const start = () => {
    const base = current ?? createJiedangState(ids);
    onChange(startJiedang(base, ids));
  };

  if (!current || !current.currentMainId) {
    return <div className="assistant-empty"><span className="assistant-emblem">党</span><h3>准备结党</h3><p>系统会抽一名主将和至多四名候选副将，自动排除互不认可的组合；本局用过的常侍不再出现。</p><button onClick={start} type="button">开始结党</button></div>;
  }

  const main = byId.get(current.currentMainId)!;
  const rejected = byId.get(current.rejectionById[current.currentMainId]);
  if (current.resting) {
    return (
      <div className="assistant-result"><span>休整一轮</span><strong>{main.name}</strong><b>与 {byId.get(current.currentDeputyId!)?.name}</b><p>本轮不自动推进真实回合。桌面确认休整结束后，再重新结党。</p><button onClick={() => onChange(finishRest(current))} type="button">休整结束，重新结党</button></div>
    );
  }
  if (current.currentDeputyId) {
    return (
      <div className="assistant-flow"><div className="jiedang-pair"><EunuchCard id={current.currentMainId} note="主将" /><i>＋</i><EunuchCard id={current.currentDeputyId} note="副将" /></div><div className="assistant-callout"><b>剩余 {ids.length - current.usedIds.length} 名</b><span>二者本局已消耗，不会再次出现。</span></div><div className="assistant-actions"><button onClick={() => onChange(enterRest(current))} type="button">进入休整</button></div></div>
    );
  }

  return (
    <div className="assistant-flow">
      <div className="assistant-callout"><b>主将 {main.name}</b><span>不认可：{rejected?.name}；从可认可候选中选副将。</span></div>
      <div className="jiedang-candidates">
        <EunuchCard id={current.currentMainId} note="主将" />
        {current.candidateIds.map((id) => {
          const legal = canPair(current.currentMainId, id, current.rejectionById);
          return <button disabled={!legal} key={id} onClick={() => onChange(confirmJiedang(current, id))} type="button"><EunuchCard id={id} note={legal ? "选择副将" : "互不认可"} /></button>;
        })}
      </div>
    </div>
  );
}
