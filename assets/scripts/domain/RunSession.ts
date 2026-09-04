import type {
  CapturedFish,
  FishConfig,
  RunSummary,
  StyleEvent,
  StyleSnapshot,
} from "../data/types";
import { PriceCalculator } from "./PriceCalculator";
import { StyleScoreSystem } from "./StyleScoreSystem";

export class RunSession {
  private readonly startedAt: number;
  private readonly style = new StyleScoreSystem();
  private readonly fish: CapturedFish[] = [];
  private readonly styleEvents: StyleEvent[] = [];
  private bestMultiplier = 1;

  constructor(
    private readonly runId: string,
    private readonly islandId: string,
    private readonly toolId: string,
    private readonly toolLevel: number,
    now = Date.now(),
  ) {
    this.startedAt = now;
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

  preview(): { coins: number; count: number; bestMultiplier: number } {
    return {
      coins: this.fish.reduce((sum, item) => sum + item.price, 0),
      count: this.fish.length,
      bestMultiplier: this.bestMultiplier,
    };
  }

  capture(
    config: FishConfig,
    freshness: number,
    now = Date.now(),
    economyScale = 1,
  ): CapturedFish {
    const styleMultiplier = this.style.getSnapshot().multiplier;
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
    };
  }
}
