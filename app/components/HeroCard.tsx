"use client";

import type { Hero } from "../lib/hero-types";

const POOL_LABELS = ["", "经典身份", "界限平衡", "进阶平衡", "完整将池"];

export function HeroCard({
  hero,
  compact = false,
  disabled = false,
  onInspect,
}: {
  hero: Hero;
  compact?: boolean;
  disabled?: boolean;
  onInspect?: (hero: Hero) => void;
}) {
  const className = ["hero-card", compact && "compact", disabled && "disabled"]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={className} data-faction={hero.faction}>
      <div className="card-grain" />
      <div className="card-topline">
        <span className="faction-seal">{hero.faction}</span>
        <span className="rarity">{hero.rarity}</span>
      </div>
      <div className="card-statuses">
        {hero.faceToFace === "assisted" && <span>需辅助</span>}
        {hero.faceToFace === "excluded" && <span>不可面杀</span>}
        <small>{POOL_LABELS[hero.presetLevel]}</small>
      </div>
      {/* Remote art comes from the official/mobile Wiki catalog and cannot use a fixed local loader. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={`${hero.name}移动版武将形象`}
        className="hero-art"
        loading={compact ? "lazy" : "eager"}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
        src={hero.image}
      />
      <div className="silhouette" aria-hidden="true">将</div>
      <div className="ink-wash" />
      <div className="hero-caption">
        <div>
          <p>{hero.pack}</p>
          <h3>{hero.name}</h3>
        </div>
        <div
          className="hp"
          aria-label={`${hero.hp}${hero.maxHp ? `/${hero.maxHp}` : ""}点体力${hero.armor ? `，${hero.armor}点护甲` : ""}`}
        >
          {Array.from({ length: Math.min(hero.hp, 6) }, (_, index) => <i key={index}>◆</i>)}
          {hero.hp > 6 && <b>+{hero.hp - 6}</b>}
          {hero.maxHp && <b>/{hero.maxHp}</b>}
          {hero.armor && <b>盾{hero.armor}</b>}
        </div>
      </div>
      {onInspect && (
        <button
          aria-label={`查看${hero.name}`}
          className="card-hitarea"
          onClick={() => onInspect(hero)}
          type="button"
        />
      )}
    </article>
  );
}
