"use client";

import { useEffect, useMemo, useState } from "react";
import heroData from "./data/heroes.json";

type Hero = {
  id: string;
  name: string;
  faction: string;
  hp: number;
  rarity: string;
  pack: string;
  image: string;
  officialUrl: string;
};

const heroes = heroData as Hero[];
const FACTIONS = ["魏", "蜀", "吴", "群", "晋", "神"];
const PACKS = [
  "标准",
  "风林火山",
  "一将成名",
  "界限突破",
  "谋",
  "神将",
  "国战",
  "门阀士族",
  "魔",
  "其他",
];
const RARITIES = ["普通", "稀有", "史诗", "传说", "限定"];
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

function normalize(value: string) {
  return value.toLocaleLowerCase("zh-CN").replace(/[·\s]/g, "");
}

function toggleChoice(current: string[], value: string, universe: string[]) {
  if (current.length === universe.length) return [value];
  if (current.includes(value)) return current.filter((item) => item !== value);
  return [...current, value];
}

function randomize<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const sample = new Uint32Array(1);
    window.crypto.getRandomValues(sample);
    const target = sample[0] % (index + 1);
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

function HeroCard({
  hero,
  compact = false,
  onInspect,
}: {
  hero: Hero;
  compact?: boolean;
  onInspect?: (hero: Hero) => void;
}) {
  return (
    <article
      className={compact ? "hero-card compact" : "hero-card"}
      data-faction={hero.faction}
    >
      <div className="card-grain" />
      <div className="card-topline">
        <span className="faction-seal">{hero.faction}</span>
        <span className="rarity">{hero.rarity}</span>
      </div>
      <img
        alt={`${hero.name}官方武将立绘`}
        className="hero-art"
        loading={compact ? "lazy" : "eager"}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
        src={hero.image}
      />
      <div className="silhouette" aria-hidden="true">
        将
      </div>
      <div className="ink-wash" />
      <div className="hero-caption">
        <div>
          <p>{hero.pack}</p>
          <h3>{hero.name}</h3>
        </div>
        <div className="hp" aria-label={`${hero.hp}点体力`}>
          {Array.from({ length: Math.min(hero.hp, 6) }, (_, index) => (
            <i key={index}>◆</i>
          ))}
          {hero.hp > 6 && <b>+{hero.hp - 6}</b>}
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

  const filteredHeroes = useMemo(() => {
    const needle = normalize(query);
    return heroes.filter(
      (hero) =>
        selectedFactions.includes(hero.faction) &&
        selectedPacks.includes(hero.pack) &&
        selectedRarities.includes(hero.rarity) &&
        (!needle ||
          normalize(hero.name).includes(needle) ||
          normalize(hero.pack).includes(needle)),
    );
  }, [query, selectedFactions, selectedPacks, selectedRarities]);

  const availableCount = noRepeat
    ? filteredHeroes.filter((hero) => !usedIds.has(hero.id)).length
    : filteredHeroes.length;

  useEffect(() => setShowAll(false), [query, selectedFactions, selectedPacks]);

  useEffect(() => {
    if (!inspected) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInspected(null);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [inspected]);

  const resetFilters = () => {
    setQuery("");
    setSelectedFactions([...FACTIONS]);
    setSelectedPacks([...PACKS]);
    setSelectedRarities([...RARITIES]);
  };

  const clearRound = () => {
    setDrawn([]);
    setHistory([]);
    setUsedIds(new Set());
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
    ? filteredHeroes
    : filteredHeroes.slice(0, VISIBLE_LIMIT);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="武将台首页">
          <span className="brand-seal">将</span>
          <span>
            <b>武将台</b>
            <small>线下面杀选将器</small>
          </span>
        </a>
        <div className="header-source">
          <span className="live-dot" />
          三国杀 OL 官网武将录
          <b>{heroes.length}</b>
        </div>
      </header>

      <div className="page-shell" id="top">
        <section className="hero-intro">
          <div className="intro-copy">
            <p className="kicker"><span>面杀利器</span> 公平 · 快速 · 不重复</p>
            <h1>定下牌池，<em>抽将开战。</em></h1>
            <p className="intro-note">
              从官方武将录中按势力、系列与稀有度圈定范围。输入姓名，也能立刻找到那位武将。
            </p>
          </div>
          <label className="search-box">
            <span>搜</span>
            <input
              aria-label="按武将名字搜索"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索武将名，如：赵云、界曹操、谋…"
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
              <button className="reset-button" onClick={resetFilters} type="button">
                重置
              </button>
            </div>

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
              title="稀有度"
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
                    <div><span>将</span><b>武将台</b></div>
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
            <span>找到 {filteredHeroes.length} 名武将 · 点击卡片查看</span>
          </div>

          {visibleHeroes.length ? (
            <div className="catalog-grid">
              {visibleHeroes.map((hero) => (
                <HeroCard
                  compact
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

          {filteredHeroes.length > VISIBLE_LIMIT && (
            <button
              className="show-more"
              onClick={() => setShowAll((value) => !value)}
              type="button"
            >
              {showAll ? "收起名录" : `展开全部 ${filteredHeroes.length} 名武将`}
            </button>
          )}
        </section>

        <footer>
          <div className="footer-mark"><span>将</span> 武将台</div>
          <p>数据整理自三国杀 OL 官网公开武将资料，立绘与角色版权归原权利方所有。</p>
          <a href="https://www.sanguosha.com/hero" rel="noreferrer" target="_blank">
            查看官方武将录 ↗
          </a>
        </footer>
      </div>

      {inspected && (
        <div
          aria-modal="true"
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setInspected(null);
          }}
          role="dialog"
        >
          <div className="hero-modal">
            <button
              aria-label="关闭"
              className="modal-close"
              onClick={() => setInspected(null)}
              type="button"
            >
              ×
            </button>
            <HeroCard hero={inspected} />
            <div className="modal-copy">
              <span>{inspected.pack} · {inspected.rarity}</span>
              <h2>{inspected.name}</h2>
              <dl>
                <div><dt>势力</dt><dd>{inspected.faction}</dd></div>
                <div><dt>体力</dt><dd>{inspected.hp}</dd></div>
                <div><dt>官方编号</dt><dd>#{inspected.id}</dd></div>
              </dl>
              <p>这张武将资料来自三国杀 OL 官网。技能、台词与背景故事可前往官方详情页查看。</p>
              <a href={inspected.officialUrl} rel="noreferrer" target="_blank">
                打开官方武将详情 ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
