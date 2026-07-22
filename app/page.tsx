"use client";

import { useEffect, useMemo, useState } from "react";
import { HeroCard } from "./components/HeroCard";
import { HeroDetail } from "./components/HeroDetail";
import { PoolSelector } from "./components/PoolSelector";
import { SkillAssistant } from "./components/SkillAssistant";
import heroData from "./data/heroes.json";
import { cryptoIndex } from "./lib/assistant-rules.mjs";
import { filterCatalog, filterDrawPool } from "./lib/pool-filter.mjs";
import type { Hero, PresetLevel } from "./lib/hero-types";

const heroes = heroData as Hero[];
const orderedValues = (values: string[], preferred: string[]) => {
  const available = new Set(values);
  return [
    ...preferred.filter((value) => available.has(value)),
    ...[...available]
      .filter((value) => !preferred.includes(value))
      .sort((left, right) => left.localeCompare(right, "zh-CN")),
  ];
};
const FACTIONS = orderedValues(
  heroes.map((hero) => hero.faction),
  ["魏", "蜀", "吴", "群", "晋", "神", "魔"],
);
const PACKS = orderedValues(
  heroes.map((hero) => hero.pack),
  [
  "标准",
  "神话再临",
  "一将成名",
  "界限突破",
  "SP",
  "神将",
  "始计篇",
  "谋",
  "星",
  "势",
  "门阀士族",
  "友",
  "骥",
  "缘",
  "乱世英杰",
  "袖里乾坤",
  "龙血玄黄",
  "最新武将",
  "限时武将",
  "魔",
  ],
);
const RARITIES = orderedValues(
  heroes.map((hero) => hero.rarity),
  ["普通", "精良", "精品", "稀有", "史诗", "传说", "限定"],
);
const VISIBLE_LIMIT = 18;

const counts = {
  factions: Object.fromEntries(
    FACTIONS.map((value) => [
      value,
      heroes.filter((hero) => hero.faction === value).length,
    ]),
  ),
  packs: Object.fromEntries(
    PACKS.map((value) => [
      value,
      heroes.filter((hero) => hero.pack === value).length,
    ]),
  ),
  rarities: Object.fromEntries(
    RARITIES.map((value) => [
      value,
      heroes.filter((hero) => hero.rarity === value).length,
    ]),
  ),
};

function toggleChoice(current: string[], value: string, universe: string[]) {
  if (current.length === universe.length) return [value];
  if (current.includes(value)) return current.filter((item) => item !== value);
  return [...current, value];
}

function randomize<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = cryptoIndex(index + 1);
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

function ChoiceGroup({
  title,
  eyebrow,
  choices,
  selected,
  groupCounts,
  onChange,
}: {
  title: string;
  eyebrow: string;
  choices: string[];
  selected: string[];
  groupCounts: Record<string, number>;
  onChange: (next: string[]) => void;
}) {
  const isAll = selected.length === choices.length;
  return (
    <section className="filter-group">
      <div className="filter-heading">
        <div>
          <span>{eyebrow}</span>
          <h3>{title}</h3>
        </div>
        <button
          className={isAll ? "text-button active" : "text-button"}
          onClick={() => onChange([...choices])}
          type="button"
        >
          全部
        </button>
      </div>
      <div className="choice-grid">
        {choices.map((choice) => {
          const isSelected = selected.includes(choice);
          return (
            <button
              aria-pressed={isSelected}
              className={isSelected ? "choice active" : "choice"}
              key={choice}
              onClick={() =>
                onChange(toggleChoice(selected, choice, choices))
              }
              type="button"
            >
              <span>{choice}</span>
              <small>{groupCounts[choice]}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [selectedFactions, setSelectedFactions] = useState([...FACTIONS]);
  const [selectedPacks, setSelectedPacks] = useState([...PACKS]);
  const [selectedRarities, setSelectedRarities] = useState([...RARITIES]);
  const [drawCount, setDrawCount] = useState(1);
  const [noRepeat, setNoRepeat] = useState(true);
  const [drawn, setDrawn] = useState<Hero[]>([]);
  const [history, setHistory] = useState<Hero[]>([]);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [isDrawing, setIsDrawing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [inspected, setInspected] = useState<Hero | null>(null);
  const [assistantHero, setAssistantHero] = useState<Hero | null>(null);
  const [presetLevel, setPresetLevel] = useState<PresetLevel>(2);

  const filterInput = useMemo(() => ({
    factions: selectedFactions,
    packs: selectedPacks,
    rarities: selectedRarities,
    presetLevel,
    query,
  }), [presetLevel, query, selectedFactions, selectedPacks, selectedRarities]);

  const filteredHeroes = useMemo(
    () => filterDrawPool(heroes, filterInput) as Hero[],
    [filterInput],
  );
  const catalogHeroes = useMemo(
    () => filterCatalog(heroes, filterInput) as Hero[],
    [filterInput],
  );

  const presetCounts = useMemo(() => Object.fromEntries(
    ([1, 2, 3, 4] as PresetLevel[]).map((level) => [
      level,
      heroes.filter(
        (hero) => hero.presetLevel <= level && hero.faceToFace !== "excluded",
      ).length,
    ]),
  ) as Record<PresetLevel, number>, []);

  const availableCount = noRepeat
    ? filteredHeroes.filter((hero) => !usedIds.has(hero.id)).length
    : filteredHeroes.length;

  useEffect(() => {
    if (!inspected) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !assistantHero) setInspected(null);
    };
    window.addEventListener("keydown", close);
    document.body.classList.add("modal-open");
    return () => {
      window.removeEventListener("keydown", close);
      document.body.classList.remove("modal-open");
    };
  }, [assistantHero, inspected]);

  const clearRound = () => {
    setDrawn([]);
    setHistory([]);
    setUsedIds(new Set());
  };

  const resetFilters = () => {
    setQuery("");
    setSelectedFactions([...FACTIONS]);
    setSelectedPacks([...PACKS]);
    setSelectedRarities([...RARITIES]);
    setPresetLevel(2);
    setShowAll(false);
    clearRound();
  };

  const selectPreset = (level: PresetLevel) => {
    if (level === presetLevel) return;
    setPresetLevel(level);
    setShowAll(false);
    clearRound();
  };

  const drawHeroes = () => {
    if (filteredHeroes.length === 0 || isDrawing) return;

    let eligible = noRepeat
      ? filteredHeroes.filter((hero) => !usedIds.has(hero.id))
      : filteredHeroes;
    let nextUsed = new Set(usedIds);

    if (eligible.length === 0 && noRepeat) {
      eligible = filteredHeroes;
      nextUsed = new Set();
    }

    setIsDrawing(true);
    window.setTimeout(() => {
      const picks = randomize(eligible).slice(
        0,
        Math.min(drawCount, eligible.length),
      );
      setDrawn(picks);
      setHistory((current) => [...picks, ...current].slice(0, 30));
      if (noRepeat) {
        picks.forEach((hero) => nextUsed.add(hero.id));
        setUsedIds(nextUsed);
      }
      setIsDrawing(false);
    }, 560);
  };

  const visibleHeroes = showAll
    ? catalogHeroes
    : catalogHeroes.slice(0, VISIBLE_LIMIT);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="面杀助手首页">
          <span className="brand-seal">将</span>
          <span>
            <b>面杀助手</b>
            <small>线下面杀选将器</small>
          </span>
        </a>
        <div className="header-source">
          <span className="live-dot" />
          三国杀移动版身份局
          <b>{heroes.length}</b>
        </div>
      </header>

      <div className="page-shell" id="top">
        <section className="hero-intro">
          <div className="intro-copy">
            <p className="kicker"><span>面杀利器</span> 公平 · 快速 · 不重复</p>
            <h1>定下牌池，<em>抽将开战。</em></h1>
            <p className="intro-note">
              以三国杀移动版身份局为基准，四档将池按出版阶段逐步扩展，并非逐将胜率排行。输入姓名可全局搜索，需线上操作的技能由内置面杀模块辅助。
            </p>
          </div>
          <label className="search-box">
            <span>搜</span>
            <input
              aria-label="按武将名字搜索"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索武将名，如：赵云、界曹操、谋夏侯惇…"
              type="search"
              value={query}
            />
            {query && (
              <button onClick={() => setQuery("")} type="button">
                清除
              </button>
            )}
          </label>
        </section>

        <section className="draw-workspace">
          <aside className="control-panel">
            <div className="panel-title">
              <div>
                <span>RANGE / 选将范围</span>
                <h2>圈定牌池</h2>
              </div>
              <div className="panel-actions">
                <button className="reset-button" onClick={resetFilters} type="button">
                  重置
                </button>
              </div>
            </div>

            <PoolSelector counts={presetCounts} onChange={selectPreset} value={presetLevel} />

            <ChoiceGroup
              choices={FACTIONS}
              eyebrow="01"
              groupCounts={counts.factions}
              onChange={setSelectedFactions}
              selected={selectedFactions}
              title="势力"
            />
            <ChoiceGroup
              choices={PACKS}
              eyebrow="02"
              groupCounts={counts.packs}
              onChange={setSelectedPacks}
              selected={selectedPacks}
              title="系列"
            />
            <ChoiceGroup
              choices={RARITIES}
              eyebrow="03"
              groupCounts={counts.rarities}
              onChange={setSelectedRarities}
              selected={selectedRarities}
              title="品质"
            />

            <section className="draw-settings">
              <div>
                <span>每次抽取</span>
                <div className="stepper" aria-label="每次抽取数量">
                  {[1, 2, 3, 4, 5].map((count) => (
                    <button
                      aria-pressed={drawCount === count}
                      className={drawCount === count ? "active" : ""}
                      key={count}
                      onClick={() => setDrawCount(count)}
                      type="button"
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>
              <button
                aria-pressed={noRepeat}
                className="repeat-toggle"
                onClick={() => setNoRepeat((value) => !value)}
                type="button"
              >
                <i className={noRepeat ? "on" : ""}><b /></i>
                <span>
                  <b>本轮不重复</b>
                  <small>抽完自动重新洗牌</small>
                </span>
              </button>
            </section>
          </aside>

          <section className="draw-stage">
            <div className="stage-heading">
              <div>
                <span>DRAW / 开牌</span>
                <h2>{drawn.length ? "本次抽取" : "牌已洗好"}</h2>
              </div>
              <div className="pool-counter">
                <strong>{filteredHeroes.length}</strong>
                <span>名武将<br />符合范围</span>
              </div>
            </div>

            <div className={isDrawing ? "result-area drawing" : "result-area"}>
              {isDrawing ? (
                <div className="shuffle-state">
                  <div className="deck-animation">
                    <i /><i /><i />
                    <span>将</span>
                  </div>
                  <p>正在洗牌…</p>
                </div>
              ) : drawn.length ? (
                <div className={`drawn-grid count-${drawn.length}`}>
                  {drawn.map((hero) => (
                    <HeroCard hero={hero} key={hero.id} onInspect={setInspected} />
                  ))}
                </div>
              ) : (
                <div className="empty-stage">
                  <div className="deck-stack" aria-hidden="true">
                    <i /><i />
                    <div><span>将</span><b>面杀助手</b></div>
                  </div>
                  <div>
                    <p>已从官方武将录中筛出</p>
                    <strong>{filteredHeroes.length}</strong>
                    <span>名武将</span>
                  </div>
                </div>
              )}
            </div>

            <div className="draw-actions">
              <button
                className="draw-button"
                disabled={filteredHeroes.length === 0 || isDrawing}
                onClick={drawHeroes}
                type="button"
              >
                <span>{filteredHeroes.length ? `抽取 ${drawCount} 名武将` : "当前范围没有武将"}</span>
                <b>开牌</b>
              </button>
              <div className="draw-meta">
                <span>
                  {noRepeat
                    ? availableCount === 0 && filteredHeroes.length
                      ? "本轮已抽完，下次自动洗牌"
                      : `本轮还可抽 ${availableCount} 名`
                    : "允许重复抽取"}
                </span>
                {history.length > 0 && (
                  <button onClick={clearRound} type="button">清空本轮</button>
                )}
              </div>
            </div>

            {history.length > 0 && (
              <div className="history-strip">
                <span>最近抽到</span>
                <div>
                  {history.slice(0, 9).map((hero, index) => (
                    <button
                      key={`${hero.id}-${index}`}
                      onClick={() => setInspected(hero)}
                      type="button"
                    >
                      {hero.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </section>

        <section className="catalog-section" id="catalog">
          <div className="catalog-heading">
            <div>
              <p>CATALOG / 武将名录</p>
              <h2>{query ? `“${query}” 的搜索结果` : "浏览当前牌池"}</h2>
            </div>
            <span>找到 {catalogHeroes.length} 名武将 · 点击卡片查看完整技能</span>
          </div>

          {visibleHeroes.length ? (
            <div className="catalog-grid">
              {visibleHeroes.map((hero) => (
                <HeroCard
                  compact
                  disabled={hero.faceToFace === "excluded"}
                  hero={hero}
                  key={hero.id}
                  onInspect={setInspected}
                />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <span>无</span>
              <h3>当前范围没有匹配武将</h3>
              <p>试试减少筛选条件，或检查名字里的前缀。</p>
              <button onClick={resetFilters} type="button">恢复完整牌池</button>
            </div>
          )}

          {catalogHeroes.length > VISIBLE_LIMIT && (
            <button
              className="show-more"
              onClick={() => setShowAll((value) => !value)}
              type="button"
            >
              {showAll ? "收起名录" : `展开全部 ${catalogHeroes.length} 名武将`}
            </button>
          )}
        </section>

        <footer>
          <div className="footer-mark"><span>将</span> 面杀助手</div>
          <p>身份局名录与现行技能以三国杀移动版为准；将池强度按出版阶段划分，标有“需辅助”的武将请使用内置面杀模块。</p>
          <a href="https://www.sanguosha.cn/index.php/pc/hero-list.html" rel="noreferrer" target="_blank">
            查看移动版武将录 ↗
          </a>
        </footer>
      </div>

      {inspected && (
        <HeroDetail
          hero={inspected}
          onClose={() => setInspected(null)}
          onOpenAssistant={setAssistantHero}
        />
      )}
      {assistantHero && (
        <SkillAssistant
          hero={assistantHero}
          heroes={heroes}
          onClose={() => {
            setAssistantHero(null);
            window.requestAnimationFrame(() => {
              document.querySelector<HTMLButtonElement>(".assistant-open-button")?.focus();
            });
          }}
        />
      )}
    </main>
  );
}
