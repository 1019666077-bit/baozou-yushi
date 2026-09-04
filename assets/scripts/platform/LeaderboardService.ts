import type { RunSummary } from "../data/types";
import { WechatAdapter } from "./WechatAdapter";

export class LeaderboardService {
  static async submit(run: RunSummary): Promise<{
    ok: boolean;
    score?: number;
    reasons?: string[];
  }> {
    return WechatAdapter.callCloud("submitScore", { run });
  }

  static showFriendRank(openDataContext: {
    postMessage(message: unknown): void;
  }): void {
    openDataContext.postMessage({ type: "showFriendRank", key: "best_style" });
  }
}
