import { _decorator, Component } from "cc";
import type { ToolConfig, ToolLevel } from "../data/types";

const { ccclass } = _decorator;

@ccclass("WeaponSystem")
export class WeaponSystem extends Component {
  private tool?: ToolConfig;
  private level?: ToolLevel;
  private readyAt = 0;

  equip(tool: ToolConfig, level: number): void {
    const config = tool.levels.find((entry) => entry.level === level);
    if (!config) throw new Error(`Invalid ${tool.id} level ${level}`);
    this.tool = tool;
    this.level = config;
    this.readyAt = 0;
  }

  fire(nowMs: number): ToolLevel | null {
    if (!this.level || nowMs < this.readyAt) return null;
    this.readyAt = nowMs + this.level.cooldownMs;
    return this.level;
  }

  get equippedLevel(): ToolLevel {
    if (!this.level) throw new Error("No tool equipped");
    return this.level;
  }

  get equippedTool(): ToolConfig {
    if (!this.tool) throw new Error("No tool equipped");
    return this.tool;
  }
}
