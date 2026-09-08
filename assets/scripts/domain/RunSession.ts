import type {
  CapturedFish,
  FishConfig,
  RunSummary,
  StyleEvent,
  StyleSnapshot,
} from "../data/types";
import { PriceCalculator } from "./PriceCalculator";
import { StyleScoreSystem } from "./StyleScoreSystem";
import {
  advanceCaptureChain,
  createCaptureChain,
  type CaptureChainSnapshot,
} from "./CaptureChain";
import { styleGradeFor, type StyleGrade } from "./StyleGrade";

export interface RunSessionOptions {
  stylePointScale?: number;
  economyScale?: number;
  tutorial?: boolean;
}

export class RunSession {
  private readonly startedAt: number;
  private readonly style: StyleScoreSystem;
  private readonly fish: CapturedFish[] = [];
  private readonly styleEvents: StyleEvent[] = [];
  private bestMultiplier = 1;
  private bestGrade: StyleGrade = "C";
  private chain: CaptureChainSnapshot = createCaptureChain();

  constructor(
    private readonly runId: string,
    private readonly islandId: string,
    private readonly toolId: string,
    private readonly toolLevel: number,
    now = Date.now(),
    private readonly options: RunSessionOptions = {},
  ) {
    this.startedAt = now;
    this.style = new StyleScoreSystem(undefined, options.stylePointScale ?? 1);
  }

  addStyle(event: StyleEvent): StyleSnapshot {
    this.styleEvents.push(event);
    const snapshot = this.style.apply(event);
    this.bestMultiplier = Math.max(
      this.bestMultiplier,
      snapshot.multiplier,
    );
    return snapshot;
  }

  getStyleSnapshot(): StyleSnapshot {
    return this.style.getSnapshot();
  }

  resetStyle(): void {
    this.style.reset();
  }

  preview(): {
    coins: number;
    count: number;
    bestMultiplier: number;
    captureChain: number;
    bestCaptureChain: number;
  } {
    return {
      coins: this.fish.reduce((sum, item) => sum + item.price, 0),
      count: this.fish.length,
      bestMultiplier: this.bestMultiplier,
      captureChain: this.chain.count,
      bestCaptureChain: this.chain.best,
    };
  }

  capture(
    config: FishConfig,
    freshness: number,
    now = Date.now(),
    economyScale = this.options.economyScale ?? 1,
    traits: { airborneCapture?: boolean } = {},
  ): CapturedFish {
    const styleSnapshot = this.style.getSnapshot();
    const styleMultiplier = styleSnapshot.multiplier;
    const styleGrade = styleGradeFor(styleSnapshot.points);
    this.chain = advanceCaptureChain(this.chain, styleGrade, now);
    if (gradeRank(styleGrade) > gradeRank(this.bestGrade)) {
      this.bestGrade = styleGrade;
    }
    const price = PriceCalculator.calculate(
      config,
      freshness,
      styleMultiplier,
      economyScale,
    ).total;
    const captured: CapturedFish = {
      fishId: config.id,
      freshness,
      styleMultiplier,
      stylePoints: styleSnapshot.points,
      styleGrade,
      captureChain: this.chain.count,
      airborneCapture: traits.airborneCapture,
      price,
      capturedAt: now,
    };
    this.fish.push(captured);
    this.style.reset();
    return { ...captured };
  }

  finish(now = Date.now()): RunSummary {
    return {
      runId: this.runId,
      islandId: this.islandId,
      startedAt: this.startedAt,
      finishedAt: now,
      toolId: this.toolId,
      toolLevel: this.toolLevel,
      fish: this.fish.map((item) => ({ ...item })),
      styleEvents: this.styleEvents.map((event) => ({ ...event })),
      totalCoins: this.fish.reduce((sum, item) => sum + item.price, 0),
      bestMultiplier: this.bestMultiplier,
      bestStyleGrade: this.bestGrade,
      bestCaptureChain: this.chain.best,
      tutorialCompleted: this.options.tutorial || undefined,
    };
  }
}

function gradeRank(grade: StyleGrade): number {
  return ["C", "B", "A", "S"].indexOf(grade);
}
