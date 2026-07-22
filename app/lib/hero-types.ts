export type PresetLevel = 1 | 2 | 3 | 4;
export type FaceToFaceStatus = "native" | "assisted" | "excluded";

export type HeroSkill = {
  id: string;
  name: string;
  description: string;
  kind: "base" | "granted";
  grants: string[];
  grantedBy: string[];
};

export type Hero = {
  id: string;
  name: string;
  faction: string;
  hp: number;
  maxHp?: number;
  armor?: number;
  rarity: string;
  pack: string;
  sourcePack: string;
  image: string;
  officialUrl: string;
  wikiUrl: string;
  presetLevel: PresetLevel;
  faceToFace: FaceToFaceStatus;
  assistantModules: string[];
  excludedReason?: string;
  skills: HeroSkill[];
};
