"use client";

import { useState } from "react";
import equipmentData from "../../data/jingxie-equipment.json";
import type { AssistantPanelProps } from "./types";

export function JingxieReference({}: AssistantPanelProps) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase("zh-CN");
  const equipment = equipmentData.filter((item) => !needle
    || `${item.from}${item.to}`.toLocaleLowerCase("zh-CN").includes(needle));
  return (
    <div className="assistant-flow">
      <label className="assistant-search"><span>精械对照</span><input onChange={(event) => setQuery(event.target.value)} placeholder="搜索原装备或精械名" value={query} /></label>
      <div className="reference-list">
        {equipment.map((item) => (
          <article key={item.from}>
            <div><span>{item.from}</span><b>→</b><strong>{item.to}</strong></div>
            <p>{item.effect}</p>
          </article>
        ))}
      </div>
      <p className="assistant-footnote">把对应实体装备牌翻面或放置标记表示升级；离开装备区后恢复原装备。</p>
    </div>
  );
}
