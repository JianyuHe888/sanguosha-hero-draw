import type { Hero } from "../../lib/hero-types";

export type AssistantPanelProps = {
  hero: Hero;
  heroes: Hero[];
  state: unknown;
  onChange: (state: unknown) => void;
};
