import type { PresetLevel } from "../lib/hero-types";

const PRESETS = [
  { level: 1, name: "经典身份", note: "标准、风火林山、一将 2011—2015、SP 1—5" },
  { level: 2, name: "界限平衡", note: "加入界标与界一将、乱世 2016—2017、SP 6—9" },
  { level: 3, name: "进阶平衡", note: "加入阴雷、始计篇、SP 10—12 与早期袖里/将星" },
  { level: 4, name: "完整将池", note: "全部当前可面杀的移动版身份武将" },
] as const;

export function PoolSelector({
  value,
  counts,
  onChange,
}: {
  value: PresetLevel;
  counts: Record<PresetLevel, number>;
  onChange: (level: PresetLevel) => void;
}) {
  const selected = PRESETS.find((preset) => preset.level === value) ?? PRESETS[1];
  return (
    <section className="pool-selector" aria-label="将池强度分档">
      <div className="pool-presets">
        {PRESETS.map((preset) => (
          <button
            aria-pressed={value === preset.level}
            className={value === preset.level ? "pool-preset active" : "pool-preset"}
            key={preset.level}
            onClick={() => onChange(preset.level)}
            type="button"
          >
            <span>{preset.name}</span>
            <b>{counts[preset.level]}</b>
          </button>
        ))}
      </div>
      <p className="preset-note"><b>{selected.name}</b>：{selected.note}</p>
    </section>
  );
}
