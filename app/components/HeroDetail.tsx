"use client";

import type { Hero } from "../lib/hero-types";
import { HeroCard } from "./HeroCard";
import { SkillText } from "./SkillText";

const POOL_LABELS = ["", "经典身份", "界限平衡", "进阶平衡", "完整将池"];

export function HeroDetail({
  hero,
  onClose,
  onOpenAssistant,
}: {
  hero: Hero;
  onClose: () => void;
  onOpenAssistant: (hero: Hero) => void;
}) {
  const baseSkills = hero.skills.filter((skill) => skill.kind === "base");
  const skillIndex = new Map(hero.skills.map((skill) => [skill.id, skill]));

  return (
    <div
      aria-labelledby="hero-detail-title"
      aria-modal="true"
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      role="dialog"
    >
      <div className="hero-modal">
        <button aria-label="关闭" className="modal-close" onClick={onClose} type="button">×</button>
        <HeroCard hero={hero} />
        <div className="modal-copy">
          <span>CHARACTER CARD / 武将信息卡</span>
          <div className="modal-name-row">
            <div>
              <small>{hero.sourcePack} · {hero.rarity}</small>
              <h2 id="hero-detail-title">{hero.name}</h2>
            </div>
            <b className={`modal-faction faction-${hero.faction}`}>{hero.faction}</b>
          </div>
          <div className="detail-badges">
            <span>{POOL_LABELS[hero.presetLevel]}</span>
            {hero.faceToFace === "assisted" && <b>需辅助</b>}
            {hero.faceToFace === "excluded" && <b>不可面杀</b>}
          </div>
          <dl>
            <div><dt>势力</dt><dd>{hero.faction}</dd></div>
            <div><dt>体力</dt><dd>{hero.hp}{hero.maxHp ? ` / ${hero.maxHp}` : ""} 点{hero.armor ? ` · 护甲 ${hero.armor}` : ""}</dd></div>
            <div><dt>系列</dt><dd>{hero.pack}</dd></div>
          </dl>
          {hero.faceToFace === "excluded" && hero.excludedReason && (
            <p className="excluded-reason">{hero.excludedReason}</p>
          )}
          <section className="modal-skills" aria-label="武将技能">
            <div className="modal-section-title"><span>SKILLS</span><h3>武将技能</h3></div>
            <div className="skill-list">
              {baseSkills.map((skill) => (
                <article className="skill-item" key={skill.id}>
                  <h4>{skill.name}</h4>
                  <SkillText skill={skill} skillIndex={skillIndex} />
                </article>
              ))}
            </div>
          </section>
          <div className="modal-links">
            {hero.faceToFace === "assisted" && (
              <button className="assistant-open-button" onClick={() => onOpenAssistant(hero)} type="button">
                打开面杀辅助
              </button>
            )}
            <a href={hero.wikiUrl} rel="noreferrer" target="_blank">核对移动版现行技能 ↗</a>
          </div>
        </div>
      </div>
    </div>
  );
}
