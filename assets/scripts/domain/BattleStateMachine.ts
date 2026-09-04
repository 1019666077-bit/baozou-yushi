export type BattleState =
  | "idle"
  | "casting"
  | "hooked"
  | "fighting"
  | "reeling"
  | "captured"
  | "escaped"
  | "finished";

const ALLOWED: Record<BattleState, BattleState[]> = {
  idle: ["casting", "finished"],
  casting: ["hooked", "idle", "finished"],
  hooked: ["fighting", "escaped", "finished"],
  fighting: ["reeling", "escaped", "finished"],
  reeling: ["captured", "escaped", "fighting", "finished"],
  captured: ["casting", "finished"],
  escaped: ["casting", "finished"],
  finished: [],
};

export class BattleStateMachine {
  private current: BattleState = "idle";

  get state(): BattleState {
    return this.current;
  }

  canTransition(next: BattleState): boolean {
    return ALLOWED[this.current].includes(next);
  }

  transition(next: BattleState): BattleState {
    if (!this.canTransition(next)) {
      throw new Error(`Invalid battle transition: ${this.current} -> ${next}`);
    }
    this.current = next;
    return this.current;
  }

  reset(): void {
    this.current = "idle";
  }
}
