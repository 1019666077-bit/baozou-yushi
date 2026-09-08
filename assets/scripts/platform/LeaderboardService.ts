import type { RunSummary } from "../data/types";
import { platformAdapter } from "./PlatformRuntime";
import { WechatAdapter } from "./WechatAdapter";

export class LeaderboardService {
  static async submit(run: RunSummary): Promise<{
    ok: boolean;
    score?: number;
    reasons?: string[];
  }> {
    const platform = platformAdapter();
    if (platform.kind === "wechat" && !WechatAdapter.signedIn) {
      return { ok: false, reasons: ["unsigned"] };
    }
    const leaderboard = platform.leaderboard;
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
