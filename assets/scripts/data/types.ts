export type FishTier = "normal" | "elite" | "boss";
export type ToolKind = "rod" | "cannon" | "harpoon";
export type StyleAction =
  | "weakPoint"
  | "airborne"
  | "combo"
  | "perfectReel";

export interface FishConfig {
  id: string;
  name: string;
  tier: FishTier;
  islandId: string;
  toughness: number;
  speed: number;
  basePrice: number;
  rarityMultiplier: number;
  weakPointMultiplier: number;
  behavior: "cruise" | "dash" | "shield" | "split" | "boss";
  escapeSeconds: number;
}

export interface ToolLevel {
  level: number;
  power: number;
  cooldownMs: number;
  lineStrength?: number;
  upgradeCost: number;
}

export interface ToolConfig {
  id: string;
  name: string;
  kind: ToolKind;
  unlockIsland: string;
  levels: ToolLevel[];
}

export interface WaveConfig {
  durationSeconds: number;
  fishPool: string[];
  maxAlive: number;
  spawnIntervalSeconds: number;
}

export interface BossPhase {
  threshold: number;
  behavior: string;
  speedMultiplier: number;
  patternIntervalSeconds: number;
}

export interface IslandConfig {
  id: string;
  name: string;
  unlockCost: number;
  targetSessionSeconds: number;
  waves: WaveConfig[];
  bossId?: string;
  bossPhases?: BossPhase[];
}

export interface StyleEvent {
  action: StyleAction;
  atMs: number;
  quality?: number;
}

export interface StyleSnapshot {
  points: number;
  multiplier: number;
  combo: number;
  lastActionAtMs: number;
  triggered: Record<StyleAction, number>;
}

export interface CapturedFish {
  fishId: string;
  freshness: number;
  styleMultiplier: number;
  price: number;
  capturedAt: number;
}

export interface ToolProgress {
  toolId: string;
  level: number;
}

export interface RecentRun {
  islandId: string;
  coins: number;
  bestMultiplier: number;
  fishCount: number;
}

export interface PlayerSave {
  schemaVersion: number;
  revision: number;
  updatedAt: number;
  coins: number;
  unlockedIslands: string[];
  tools: ToolProgress[];
  discoveredFish: string[];
  bestStyleScore: number;
  tutorialComplete: boolean;
  completedRuns: number;
  recentRuns: RecentRun[];
  settings: {
    music: boolean;
    sfx: boolean;
    vibration: boolean;
    lowPower: boolean;
  };
}

export interface RunSummary {
  runId: string;
  islandId: string;
  startedAt: number;
  finishedAt: number;
  toolId: string;
  toolLevel: number;
  fish: CapturedFish[];
  styleEvents: StyleEvent[];
  totalCoins: number;
  bestMultiplier: number;
}

export interface RemoteConfig {
  version: number;
  minClientVersion: string;
  stylePointScale: number;
  economyScale: number;
  disabledIslands: string[];
  notice?: string;
}
