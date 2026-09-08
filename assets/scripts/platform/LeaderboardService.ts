import type { RunSummary } from "../data/types";
import { platformAdapter } from "./PlatformRuntime";

export class LeaderboardService {
  static async submit(run: RunSummary): Promise<{
    ok: boolean;
    score?: number;
    reasons?: string[];
  }> {
    const leaderboard = platformAdapter().leaderboard;
    if (!leaderboard) return { ok: false, reasons: ["unsupported"] };
    return leaderboard.submit(run);
  }

  static submitStyleScore(score: number): void {
    platformAdapter().leaderboard?.submitStyleScore(score);
  }

  static showFriendRank(openDataContext: {
    postMessage(message: unknown): void;
  }): void {
    openDataContext.postMessage({ type: "showFriendRank", key: "best_style" });
  }
}
