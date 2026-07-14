"use client";

import { useEffect, useMemo, useState } from "react";
import cardData from "./data/identity-cards.json";

type IdentityCard = {
  id: string;
  name: string;
  year: string;
  code: string;
  series: string;
  image: string;
  sourceUrl: string;
};

const cards = cardData as IdentityCard[];
const YEARS = ["2008", "2010", "2011", "2012", "2013", "2014"];
const SERIES = ["标准与神话再临", "SP", "一将成名", "神将", "铜雀台", "特别版"];
const BACK_IMAGE =
  "https://patchwiki.biligame.com/images/tg/1/1b/qxxgvolrjaze1such21e8l4gzepse75.png";
const CATALOG_LIMIT = 20;

const counts = {
  years: Object.fromEntries(
    YEARS.map((year) => [year, cards.filter((card) => card.year === year).length]),
  ),
  series: Object.fromEntries(
    SERIES.map((series) => [
      series,
      cards.filter((card) => card.series === series).length,
    ]),
  ),
};

function normalize(value: string) {
  return value.toLocaleLowerCase("zh-CN").replace(/[·\s._-]/g, "");
}

function toggleChoice(current: string[], value: string, all: string[]) {
  if (current.length === all.length) return [value];
  if (current.includes(value)) return current.filter((item) => item !== value);
  return [...current, value];
}

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const sample = new Uint32Array(1);
    window.crypto.getRandomValues(sample);
    const target = sample[0] % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function ChoiceGroup({
  index,
  title,
  choices,
  selected,
  groupCounts,
  onChange,
}: {
  index: string;
  title: string;
  choices: string[];
  selected: string[];
  groupCounts: Record<string, number>;
  onChange: (next: string[]) => void;
}) {
  const allSelected = selected.length === choices.length;
  return (
    <section className="filter-group">
      <div className="filter-heading">
        <div>
          <span>{index}</span>
          <h3>{title}</h3>
        </div>
        <button
          className={allSelected ? "text-button active" : "text-button"}
          onClick={() => onChange([...choices])}
          type="button"
        >
          全部
        </button>
      </div>
      <div className="choice-grid">
        {choices.map((choice) => {
          const active = selected.includes(choice);
          return (
            <button
              aria-pressed={active}
              className={active ? "choice active" : "choice"}
              key={choice}
              onClick={() => onChange(toggleChoice(selected, choice, choices))}
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

function RealCard({
  card,
  size = "result",
  onOpen,
}: {
  card: IdentityCard;
  size?: "result" | "catalog";
  onOpen: (card: IdentityCard) => void;
}) {
  return (
    <button
      aria-label={`全屏查看${card.name}武将牌`}
      className={`real-card ${size}`}
      onClick={() => onOpen(card)}
      type="button"
    >
      <span className="real-card-image">
        <img
          alt={`${card.name} ${card.year}年完整武将牌`}
          loading={size === "catalog" ? "lazy" : "eager"}
          src={card.image}
        />
      </span>
      <span className="real-card-meta">
        <b>{card.name}</b>
        <small>{card.year} · {card.code}</small>
      </span>
    </button>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [selectedYears, setSelectedYears] = useState([...YEARS]);
  const [selectedSeries, setSelectedSeries] = useState([...SERIES]);
  const [drawCount, setDrawCount] = useState(1);
  const [noRepeat, setNoRepeat] = useState(true);
  const [drawn, setDrawn] = useState<IdentityCard[]>([]);
  const [history, setHistory] = useState<IdentityCard[]>([]);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [isDrawing, setIsDrawing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [openedCard, setOpenedCard] = useState<IdentityCard | null>(null);

  const filteredCards = useMemo(() => {
    const needle = normalize(query);
    return cards.filter(
      (card) =>
        selectedYears.includes(card.year) &&
        selectedSeries.includes(card.series) &&
        (!needle ||
          normalize(card.name).includes(needle) ||
          normalize(card.code).includes(needle)),
    );
  }, [query, selectedYears, selectedSeries]);

  const availableCount = noRepeat
    ? filteredCards.filter((card) => !usedIds.has(card.id)).length
    : filteredCards.length;

  useEffect(() => setShowAll(false), [query, selectedYears, selectedSeries]);

  useEffect(() => {
    if (!openedCard) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenedCard(null);
    };
    window.addEventListener("keydown", close);
    document.body.classList.add("viewer-open");
    return () => {
      window.removeEventListener("keydown", close);
      document.body.classList.remove("viewer-open");
    };
  }, [openedCard]);

  const resetFilters = () => {
    setQuery("");
    setSelectedYears([...YEARS]);
    setSelectedSeries([...SERIES]);
  };

  const clearRound = () => {
    setDrawn([]);
    setHistory([]);
    setUsedIds(new Set());
  };

  const drawCards = () => {
    if (filteredCards.length === 0 || isDrawing) return;
    let eligible = noRepeat
      ? filteredCards.filter((card) => !usedIds.has(card.id))
      : filteredCards;
    let nextUsed = new Set(usedIds);

    if (eligible.length === 0 && noRepeat) {
      eligible = filteredCards;
      nextUsed = new Set();
    }

    setIsDrawing(true);
    window.setTimeout(() => {
      const picks = shuffle(eligible).slice(
        0,
        Math.min(drawCount, eligible.length),
      );
      setDrawn(picks);
      setHistory((current) => [...picks, ...current].slice(0, 30));
      if (noRepeat) {
        picks.forEach((card) => nextUsed.add(card.id));
        setUsedIds(nextUsed);
      }
      setIsDrawing(false);
    }, 520);
  };

  const visibleCards = showAll
    ? filteredCards
    : filteredCards.slice(0, CATALOG_LIMIT);

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="武将台首页">
          <span className="brand-seal">将</span>
          <span>
            <b>武将台</b>
            <small>实体身份局选将器</small>
          </span>
        </a>
        <div className="header-source">
          <span className="live-dot" />
          身份局实体将面
          <b>{cards.length}</b>
        </div>
      </header>

      <div className="page-shell" id="top">
        <section className="hero-intro">
          <div className="intro-copy">
            <p className="kicker"><span>只收身份局</span> 实体卡面 · 原牌展示</p>
            <h1>抽到哪张，<em>就亮哪张。</em></h1>
            <p className="intro-note">
              牌池只保留实体身份局武将牌。点开任何武将，直接全屏查看原始完整卡面，不再用网页重画。
            </p>
          </div>
          <label className="search-box">
            <span>搜</span>
            <input
              aria-label="按武将名字搜索"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索武将名或编号，如：赵云、SP008…"
              type="search"
              value={query}
            />
            {query && <button onClick={() => setQuery("")} type="button">清除</button>}
          </label>
        </section>

        <section className="draw-workspace">
          <aside className="control-panel">
            <div className="panel-title">
              <div>
                <span>RANGE / 身份局范围</span>
                <h2>选择将池</h2>
              </div>
              <button className="reset-button" onClick={resetFilters} type="button">重置</button>
            </div>

            <ChoiceGroup
              choices={SERIES}
              groupCounts={counts.series}
              index="01"
              onChange={setSelectedSeries}
              selected={selectedSeries}
              title="卡牌系列"
            />
            <ChoiceGroup
              choices={YEARS}
              groupCounts={counts.years}
              index="02"
              onChange={setSelectedYears}
              selected={selectedYears}
              title="发行年份"
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
                <span><b>本轮不重复</b><small>抽完自动重新洗牌</small></span>
              </button>
            </section>

            <div className="source-note">
              <b>关于牌池</b>
              <p>当前使用 2008–2014 年实体身份局武将牌扫描图，不含国战专属牌。</p>
            </div>
          </aside>

          <section className="draw-stage">
            <div className="stage-heading">
              <div>
                <span>DRAW / 开牌</span>
                <h2>{drawn.length ? "本次抽取" : "牌已洗好"}</h2>
              </div>
              <div className="pool-counter">
                <strong>{filteredCards.length}</strong>
                <span>张实体牌<br />符合范围</span>
              </div>
            </div>

            <div className={isDrawing ? "result-area drawing" : "result-area"}>
              {isDrawing ? (
                <div className="shuffle-state">
                  <div className="deck-animation">
                    <i /><i />
                    <img alt="武将牌背面" src={BACK_IMAGE} />
                  </div>
                  <p>正在洗牌…</p>
                </div>
              ) : drawn.length ? (
                <div className={`drawn-grid count-${drawn.length}`}>
                  {drawn.map((card) => (
                    <RealCard card={card} key={card.id} onOpen={setOpenedCard} />
                  ))}
                </div>
              ) : (
                <div className="empty-stage">
                  <div className="deck-stack" aria-hidden="true">
                    <i /><i />
                    <img alt="" src={BACK_IMAGE} />
                  </div>
                  <div>
                    <p>当前身份将池</p>
                    <strong>{filteredCards.length}</strong>
                    <span>张实体武将牌</span>
                    <small>抽出后点击卡牌全屏查看</small>
                  </div>
                </div>
              )}
            </div>

            <div className="draw-actions">
              <button
                className="draw-button"
                disabled={filteredCards.length === 0 || isDrawing}
                onClick={drawCards}
                type="button"
              >
                <span>{filteredCards.length ? `抽取 ${drawCount} 张武将牌` : "当前范围没有武将牌"}</span>
                <b>开牌</b>
              </button>
              <div className="draw-meta">
                <span>
                  {noRepeat
                    ? availableCount === 0 && filteredCards.length
                      ? "本轮已抽完，下次自动洗牌"
                      : `本轮还可抽 ${availableCount} 张`
                    : "允许重复抽取"}
                </span>
                {history.length > 0 && <button onClick={clearRound} type="button">清空本轮</button>}
              </div>
            </div>

            {history.length > 0 && (
              <div className="history-strip">
                <span>最近抽到</span>
                <div>
                  {history.slice(0, 10).map((card, index) => (
                    <button key={`${card.id}-${index}`} onClick={() => setOpenedCard(card)} type="button">
                      {card.name} <small>{card.year}</small>
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
              <p>CATALOG / 实体将面</p>
              <h2>{query ? `“${query}” 的搜索结果` : "浏览当前身份将池"}</h2>
            </div>
            <span>找到 {filteredCards.length} 张 · 点击全屏查看原牌</span>
          </div>

          {visibleCards.length ? (
            <div className="catalog-grid">
              {visibleCards.map((card) => (
                <RealCard card={card} key={card.id} onOpen={setOpenedCard} size="catalog" />
              ))}
            </div>
          ) : (
            <div className="no-results">
              <span>无</span>
              <h3>当前范围没有匹配的实体牌</h3>
              <p>试试减少筛选条件，或检查武将姓名和编号。</p>
              <button onClick={resetFilters} type="button">恢复完整身份将池</button>
            </div>
          )}

          {filteredCards.length > CATALOG_LIMIT && (
            <button className="show-more" onClick={() => setShowAll((value) => !value)} type="button">
              {showAll ? "收起名录" : `展开全部 ${filteredCards.length} 张`}
            </button>
          )}
        </section>

        <footer>
          <div className="footer-mark"><span>将</span> 武将台</div>
          <p>实体卡面图源：桌游WIKI；《三国杀》角色、卡面与美术版权归原权利方所有。</p>
          <a href="https://wiki.biligame.com/tg/三国杀" rel="noreferrer" target="_blank">查看图源页面 ↗</a>
        </footer>
      </div>

      {openedCard && (
        <div aria-label={`${openedCard.name}完整武将牌`} aria-modal="true" className="card-viewer" role="dialog">
          <div className="viewer-bar">
            <div>
              <b>{openedCard.name}</b>
              <span>{openedCard.year} · {openedCard.series} · {openedCard.code}</span>
            </div>
            <div>
              <a href={openedCard.image} rel="noreferrer" target="_blank">查看原图 ↗</a>
              <button aria-label="关闭全屏武将牌" onClick={() => setOpenedCard(null)} type="button">×</button>
            </div>
          </div>
          <div className="viewer-canvas" onClick={() => setOpenedCard(null)}>
            <img
              alt={`${openedCard.name} ${openedCard.year}年完整武将牌原图`}
              onClick={(event) => event.stopPropagation()}
              src={openedCard.image}
            />
          </div>
        </div>
      )}
    </main>
  );
}
