export type FishTier = "normal" | "elite" | "boss";
export type ToolKind = "rod" | "cannon" | "harpoon";
export type FishBehavior =
  | "cruise"
  | "dash"
  | "shield"
  | "split"
  | "burrow"
  | "school"
  | "boss";
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
  behavior: FishBehavior;
  escapeSeconds: number;
}

export interface ToolLevel {
  level: number;
  power: number;
  cooldownMs: number;
  lineStrength?: number;
  upgradeCost: number;
  modifiers?: ToolModifiers;
}

export interface ToolModifiers {
  weakPointRadiusScale?: number;
  freshnessFloorBonus?: number;
  shieldPierce?: number;
  multiHit?: number;
  airborneBonus?: number;
  chargeTimeScale?: number;
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
  stylePoints?: number;
  styleGrade?: import("../domain/StyleGrade").StyleGrade;
  captureChain?: number;
  airborneCapture?: boolean;
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

export type StyleGrade = "C" | "B" | "A" | "S";

export interface FishMastery {
  fishId: string;
  captures: number;
  bestGrade: StyleGrade;
  mastery: number;
}

export type OrderMetric =
  | "capture"
  | "airborne"
  | "gradeA"
  | "tool"
  | "island";

export interface ChallengeProgress {
  id: string;
  current: number;
  target: number;
  claimed: boolean;
}

export interface DailyOrderState {
  dateKey: string;
  generatedAt: number;
  lastSeenAt: number;
  clockTrusted?: boolean;
  orders: ChallengeProgress[];
}

export interface WeeklyChallengeState {
  weekKey: string;
  score: number;
  bestRun: number;
  attempts: number;
  leaderboardEligible: boolean;
}

export interface EndlessTideState {
  unlocked: boolean;
  bestRound: number;
  bestBankedCoins: number;
  runs: number;
}

export interface VerifiedEntitlement {
  productId: string;
  source: "google-play" | "crazygames" | "admin";
  verifiedAt: number;
  authorityExpiresAt: number;
  authorityToken: string;
}

export interface PendingTransaction {
  id: string;
  productId: string;
  platform: "android" | "crazygames";
  purchaseToken?: string;
  state:
    | "purchasing"
    | "awaiting_verification"
    | "finalize_pending"
    | "verification_failed";
  verifiedAt?: number;
  authorityExpiresAt?: number;
  authorityToken?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AdGrantState {
  dayKey: string;
  lastInterstitialAt: number;
  settlementRewards: number;
  reliefGrants: number;
  grantIds: string[];
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
  fishMastery: Record<string, FishMastery>;
  challengeProgress: Record<string, number>;
  cosmeticShards: number;
  dailyOrders: DailyOrderState | null;
  weeklyChallenge: WeeklyChallengeState | null;
  endlessTide: EndlessTideState;
  entitlements: Record<string, VerifiedEntitlement>;
  cosmetics: string[];
  selectedCosmetics: {
    boat?: string;
    trail?: string;
  };
  adGrants: AdGrantState;
  pendingTransactions: PendingTransaction[];
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
  bestStyleGrade?: import("../domain/StyleGrade").StyleGrade;
  bestCaptureChain?: number;
  tutorialCompleted?: boolean;
  endlessRound?: number;
  endlessFailed?: boolean;
}

export interface RemoteConfig {
  version: number;
  minClientVersion: string;
  stylePointScale: number;
  economyScale: number;
  disabledIslands: string[];
  notice?: string;
}
