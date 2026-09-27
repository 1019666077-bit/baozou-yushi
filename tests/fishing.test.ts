import { describe, expect, it } from "vitest";
import { SeededRandom } from "../assets/scripts/domain/SeededRandom";
import { createDefaultSave, mergeSaves } from "../assets/scripts/domain/SaveMerge";
import {
  activity,
  biteDelay,
  habitatAt,
  pickSpecies,
  rollWeight,
} from "../assets/scripts/fishing/Bites";
import { BiteController, hookWindowSeconds } from "../assets/scripts/fishing/BiteController";
import { CatchMinigame } from "../assets/scripts/fishing/CatchMinigame";
import { castReach, chargePower } from "../assets/scripts/fishing/Cast";
import { FISH, FISH_IDS, fishLengthCm, fishValue } from "../assets/scripts/fishing/FishTable";
import { applyFishingState, gameStateFromSave, normalizeFishing } from "../assets/scripts/fishing/FishingSave";
import { FishingTrip } from "../assets/scripts/fishing/FishingTrip";
import { GameState } from "../assets/scripts/fishing/GameState";
import { gearStats, UPGRADES } from "../assets/scripts/fishing/Gear";
import { fishingHarborGate } from "../assets/scripts/fishing/HarborGate";
import { bendExponent, RodRig } from "../assets/scripts/fishing/RodRig";
import { dominantHabitat, sampleCast } from "../assets/scripts/fishing/SpotQuery";
import { PERIODS } from "../assets/scripts/fishing/Waters";

function rngOf(seed: number): () => number {
  const random = new SeededRandom(seed);
  return () => random.next();
}

describe("tidewater bite table", () => {
  it("keeps all eighteen species and the original mullet row", () => {
    expect(FISH_IDS).toHaveLength(18);
    expect(FISH_IDS[0]).toBe("silverside");
    expect(FISH.mullet.kg).toEqual([0.4, 2.2]);
    expect(FISH.mullet.price).toBe(5);
    expect(FISH.mullet.fight).toBe(0.3);
    expect(FISH.tarpon.time).toBe("night");
    expect(FISH.tuna.habitat.deep).toBe(1);
    expect(FISH.mahi.name).toBe("Mahi-mahi");
    expect(FISH.silverside.nameZh).toBe("银汉鱼");
  });

  it("prices a small fish flat and a trophy a bit higher per kilo", () => {
    expect(fishValue("mullet", 0.4)).toBe(2);
    const trophy = fishValue("mullet", 2.02);
    expect(trophy).toBe(Math.round(5 * 2.02 * (1 + 0.25 * 0.2 / 0.3)));
    expect(trophy).toBeGreaterThan(Math.round(5 * 2.02));
  });

  it("turns weight into length with the species curve", () => {
    const [a, b] = FISH.redSnapper.lw;
    expect(fishLengthCm("redSnapper", 2)).toBeCloseTo(Math.pow(2000 / a, 1 / b), 6);
  });

  it("rolls toward the small end of the weight range", () => {
    let small = 0;
    const random = rngOf(7);
    for (let i = 0; i < 400; i++) {
      const kg = rollWeight("jack", random);
      expect(kg).toBeGreaterThanOrEqual(1);
      expect(kg).toBeLessThanOrEqual(9);
      if (kg < 5) small++;
    }
    expect(small).toBeGreaterThan(280);
  });

  it("leaves dry sand empty and the three cast spots inhabited", () => {
    const dry = habitatAt({ depth: 0.1, reefDist: 0, pierDist: 0 });
    expect(biteDelay(dry, 12, () => 0.2)).toBe(Infinity);
    expect(pickSpecies(dry, 12, () => 0.2)).toBeNull();
    const beach = sampleCast("beach", "bay", 0.2, 22);
    const pier = sampleCast("pier", "bay", 0.15, 22);
    const deep = sampleCast("boat", "deep", 1, 22);
    expect(dominantHabitat(beach.habitat)).toBe("shallows");
    expect(dominantHabitat(pier.habitat)).toBe("pier");
    expect(dominantHabitat(deep.habitat)).toBe("deep");
    expect(biteDelay(beach.habitat, 12, () => 0.4)).not.toBe(Infinity);
    expect(pickSpecies(deep.habitat, PERIODS.dawn.hour, () => 0.4)).toBeTruthy();
  });

  it("bites mullet in the day shallows and more tuna at dawn than at noon", () => {
    const count = (spot: "beach" | "boat", hour: number, species: string) => {
      const habitat = spot === "beach"
        ? sampleCast("beach", "bay", 0.2, 22).habitat
        : sampleCast("boat", "deep", 1, 22).habitat;
      const random = rngOf(11);
      let hits = 0;
      for (let i = 0; i < 2500; i++) if (pickSpecies(habitat, hour, random) === species) hits++;
      return hits;
    };
    const shallows = sampleCast("beach", "bay", 0.2, 22).habitat;
    const random = rngOf(4);
    const tally: { [id: string]: number } = {};
    for (let i = 0; i < 2500; i++) {
      const id = pickSpecies(shallows, PERIODS.day.hour, random)!;
      tally[id] = (tally[id] ?? 0) + 1;
    }
    const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0];
    expect(top).toBe("mullet");
    expect(count("boat", PERIODS.dawn.hour, "tuna")).toBeGreaterThan(
      count("boat", PERIODS.day.hour, "tuna"),
    );
    expect(activity("night", 22)).toBeGreaterThan(activity("night", 12));
  });
});

describe("tidewater fight", () => {
  it("uses the source hook window and a fixed green band", () => {
    expect(hookWindowSeconds(FISH.tuna.fight)).toBeCloseTo(2.4 - 0.85 * 0.5, 6);
    const fight = new CatchMinigame({
      species: "mullet",
      kg: 0.5,
      lineKg: 13,
      reelSpeed: 1.1,
      distance: 8,
      rng: () => 0.5,
    });
    expect(fight.band).toEqual([0.3, 0.85]);
  });

  it("snaps a heavy fish on a light line, lands a short fight, and drops a slack fish", () => {
    const snap = new CatchMinigame({
      species: "tuna",
      kg: 14,
      lineKg: 7,
      reelSpeed: 1.1,
      distance: 18,
      rng: () => 0.5,
    });
    let guard = 0;
    while (snap.state === "fighting" && guard < 400) {
      snap.update(0.05, true);
      guard++;
    }
    expect(snap.state).toBe("snapped");

    const land = new CatchMinigame({
      species: "mullet",
      kg: 0.4,
      lineKg: 26,
      reelSpeed: 2.2,
      distance: 3,
      rng: () => 0.5,
    });
    guard = 0;
    while (land.state === "fighting" && guard < 400) {
      land.update(0.05, true);
      guard++;
    }
    expect(land.state).toBe("caught");
    expect(land.distance).toBeLessThan(1.2);

    const slack = new CatchMinigame({
      species: "mullet",
      kg: 0.4,
      lineKg: 50,
      reelSpeed: 1.1,
      distance: 12,
      rng: () => 0.5,
    });
    guard = 0;
    while (slack.state === "fighting" && guard < 400) {
      slack.update(0.05, false);
      guard++;
    }
    expect(slack.state).toBe("escaped");
  });

  it("lets line rating and reel speed change the fight", () => {
    const peak = (lineKg: number) => {
      const random = new SeededRandom(3);
      const fight = new CatchMinigame({
        species: "jack",
        kg: 4,
        lineKg,
        reelSpeed: 1.1,
        distance: 20,
        rng: () => random.next(),
      });
      let max = 0;
      for (let i = 0; i < 160; i++) {
        fight.update(0.05, true);
        max = Math.max(max, fight.tension);
      }
      return max;
    };
    expect(peak(50)).toBeLessThan(peak(7));

    const dist = (reelSpeed: number) => {
      const fight = new CatchMinigame({
        species: "mullet",
        kg: 0.5,
        lineKg: 26,
        reelSpeed,
        distance: 15,
        rng: () => 0.5,
      });
      fight.update(1, true);
      return fight.distance;
    };
    expect(dist(2.2)).toBeLessThan(dist(1.1));
    expect(gearStats({ ...gearStatsZero(), line: 1 }).lineKg).toBe(13);
    expect(gearStats({ ...gearStatsZero(), reel: 2 }).reelSpeed).toBe(2.2);
  });
});

function gearStatsZero(): { [key: string]: number } {
  const upgrades: { [key: string]: number } = {};
  for (const key of Object.keys(UPGRADES)) upgrades[key] = 0;
  return upgrades;
}

describe("hold, sell, shop", () => {
  it("logs a full hold without keeping the extra fish", () => {
    const state = new GameState();
    expect(state.addFish("jack", 20, 12)).not.toBeNull();
    expect(state.addFish("jack", 15, 12)).toBeNull();
    expect(state.lastCatch?.kept).toBe(false);
    expect(state.log.jack.count).toBe(2);
    expect(state.inventory).toHaveLength(1);
    expect(state.holdKg).toBe(20);
  });

  it("marks a new species, then a heavier fish as the record, and pays the card price", () => {
    const state = new GameState();
    state.addFish("mullet", 0.5, 12);
    expect(state.lastCatch).toMatchObject({ newSpecies: true, record: false, kept: true });
    state.addFish("mullet", 1.2, 12);
    expect(state.lastCatch?.record).toBe(true);
    expect(state.log.mullet.bestKg).toBe(1.2);
    const total = state.holdValue;
    expect(state.sell(null)).toEqual({ total, count: 2 });
    expect(state.money).toBe(total);
    expect(state.inventory).toHaveLength(0);
    expect(state.log.mullet.count).toBe(2);
  });

  it("sells gear only when the wallet can pay, and the stats follow", () => {
    for (const key of ["line", "reel", "rod", "hold"]) {
      expect(UPGRADES[key].levels.length).toBeGreaterThanOrEqual(3);
    }
    const state = new GameState();
    state.money = 59;
    expect(state.buy("line")).toBeNull();
    expect(state.stats.lineKg).toBe(7);
    state.money = 60;
    expect(state.buy("line")?.index).toBe(1);
    expect(state.money).toBe(0);
    expect(state.stats.lineKg).toBe(13);
    expect(state.stats.holdKg).toBe(30);
    state.money = 120;
    expect(state.buy("hold")?.index).toBe(1);
    expect(state.stats.holdKg).toBe(70);
    expect(state.fits(40)).toBe(true);
  });
});

describe("fishing save beside the 11 coin wallet", () => {
  it("fills a legacy save without moving coins, tools, or schema", () => {
    const legacy = createDefaultSave(1);
    legacy.coins = 11;
    delete legacy.fishing;
    const merged = mergeSaves(legacy, null);
    expect(merged.coins).toBe(11);
    expect(merged.schemaVersion).toBe(3);
    expect(merged.tools[0]).toEqual({ toolId: "tool_rod", level: 1 });
    expect(merged.fishing?.upgrades.line).toBe(0);
    expect(merged.fishing?.inventory).toEqual([]);
    expect(normalizeFishing({ v: 1, upgrades: { line: 99 } }).upgrades.line).toBe(3);
  });

  it("writes fishing coins back onto the shared wallet only", () => {
    const save = { ...createDefaultSave(5), coins: 11 };
    const state = gameStateFromSave(save);
    expect(state.money).toBe(11);
    state.money = 16;
    const next = applyFishingState(save, state);
    expect(next.coins).toBe(16);
    expect(next.tutorialComplete).toBe(false);
    expect(next.tools).toEqual(save.tools);
    expect(next.fishing?.v).toBe(1);
  });
});

describe("fishing trip", () => {
  it("charges for 1.1s and casts farther and deeper", () => {
    expect(chargePower(0, 1.1)).toBe(1);
    expect(castReach(22, 0)).toBeCloseTo(22 * 0.35, 6);
    expect(castReach(22, 1)).toBe(22);
    const trip = new FishingTrip({ rng: () => 0, money: 0 });
    trip.skipGuide();
    trip.setSpot("beach");
    trip.toReady();
    trip.setHeld(true);
    trip.tick(0.05);
    trip.setHeld(false);
    const shortDepth = trip.view.depth;
    trip.toReady();
    trip.setHeld(true);
    trip.tick(1.1);
    expect(trip.view.power).toBeCloseTo(1, 5);
    trip.setHeld(false);
    expect(trip.view.reach).toBeCloseTo(22, 5);
    expect(trip.view.depth).toBeGreaterThan(shortDepth);
    expect(trip.view.phase).toBe("waiting");
  });

  it("only hints on an early strike, then loses the fish when the window expires", () => {
    const early = scriptedCast();
    advanceUntil(early, "nibbling");
    early.setHeld(true);
    expect(early.view.phase).toBe("nibbling");
    expect(early.view.notice).toContain("还没到");

    const late = scriptedCast();
    advanceUntil(late, "hook");
    advanceUntil(late, "miss");
    expect(late.view.notice).toContain("太晚");
  });

  it("lands only after the fish is inside 1.2 m", () => {
    const trip = scriptedCast(1.1);
    advanceUntil(trip, "hook");
    trip.setHeld(true);
    let guard = 0;
    while (trip.view.phase === "fighting" && guard < 800) {
      trip.tick(0.05);
      guard++;
    }
    expect(trip.view.phase).toBe("card");
    expect(trip.view.distance).toBeLessThan(1.2);
    expect(trip.view.kept).toBe(true);
    expect(trip.view.isNew).toBe(true);
    expect(trip.state.inventory).toHaveLength(1);
    expect(trip.consumeDirty()).toBe(true);
  });

  it("keeps the green band fixed when the rod is upgraded and casts farther", () => {
    const trip = new FishingTrip({ rng: () => 0, money: 400 });
    trip.skipGuide();
    expect(trip.buy("rod")?.index).toBe(1);
    expect(trip.buy("rod")?.index).toBe(2);
    expect(trip.view.castM).toBe(45);
    expect(trip.view.coins).toBe(400 - 75 - 260);
    trip.toReady();
    trip.setHeld(true);
    trip.tick(1.1);
    trip.setHeld(false);
    advanceUntil(trip, "hook");
    trip.setHeld(true);
    trip.tick(0.05);
    expect(trip.view.phase).toBe("fighting");
    expect(trip.view.bandLo).toBe(0.3);
    expect(trip.view.bandHi).toBe(0.85);
    expect(trip.view.reach).toBeCloseTo(45, 5);
  });

  it("sells the catch and refuses an upgrade the wallet cannot afford", () => {
    const trip = scriptedCast(1.1);
    advanceUntil(trip, "hook");
    trip.setHeld(true);
    advanceUntil(trip, "card");
    trip.toDock();
    const sold = trip.sellAll();
    expect(sold.count).toBe(1);
    expect(sold.total).toBe(trip.view.coins);
    expect(trip.buy("line")).toBeNull();
    trip.state.money = 60;
    expect(trip.buy("line")?.index).toBe(1);
    expect(trip.view.lineKg).toBe(13);
    expect(trip.shopRows().find((row) => row.key === "line")?.currentLabel).toContain("15磅");
  });
});

function scriptedCast(chargeSeconds = 0.4): FishingTrip {
  const trip = new FishingTrip({ rng: () => 0, money: 0 });
  trip.skipGuide();
  trip.setSpot("beach");
  trip.setPeriod("day");
  trip.toReady();
  trip.setHeld(true);
  trip.tick(chargeSeconds);
  trip.setHeld(false);
  return trip;
}

function advanceUntil(trip: FishingTrip, phase: string): void {
  let guard = 0;
  while (trip.view.phase !== phase && guard < 800) {
    trip.tick(0.05);
    guard++;
  }
  expect(trip.view.phase).toBe(phase);
}

describe("bite controller window", () => {
  it("opens the take window for the species fight stat", () => {
    const bites = new BiteController(() => 0, "hint");
    const habitat = sampleCast("pier", "bay", 0.15, 22).habitat;
    bites.start(habitat, 12);
    let guard = 0;
    while (bites.phase !== "take" && guard < 400) {
      bites.update(0.05);
      guard++;
    }
    expect(bites.phase).toBe("take");
    expect(bites.species).toBe("silverside");
    expect(bites.timeLeft).toBeCloseTo(hookWindowSeconds(FISH.silverside.fight), 5);
    expect(bites.strike()).toBe("hooked");
  });
});

describe("harbor gate before the tutorial", () => {
  it("locks fishing so a catch sale cannot raise the 11 coin wallet", () => {
    const save = createDefaultSave(1);
    save.coins = 11;
    expect(save.tutorialComplete).toBe(false);
    const gate = fishingHarborGate(save);
    expect(gate.locked).toBe(true);
    expect(gate.hint).toContain("教学");
    const state = gameStateFromSave(save);
    state.addFish("mullet", 1, 12);
    state.sell(null);
    expect(state.money).toBeGreaterThan(11);
    expect(save.coins).toBe(11);
    expect(fishingHarborGate(save).locked).toBe(true);
    save.tutorialComplete = true;
    expect(fishingHarborGate(save).locked).toBe(false);
  });
});

describe("rod rig feel", () => {
  it("fills the cast in 1.1s and sags the line", () => {
    const rig = new RodRig();
    rig.equip(true);
    rig.startWindup();
    const frame = { camX: 55, camY: 3.95, camZ: 38, yaw: 0, waterY: 0, fight: null, dip: 0 };
    rig.update(1.1, frame);
    expect(rig.power).toBeCloseTo(1, 5);
    rig.release(55, 52);
    for (let i = 0; i < 80; i++) rig.update(0.05, frame);
    expect(rig.state === "floating" || rig.state === "flying").toBe(true);
    if (rig.state === "floating") {
      const mid = LINE_MID(rig);
      const straight = (rig.tipY + rig.bobY) * 0.5;
      expect(mid).toBeLessThan(straight - 0.01);
    }
  });

  it("deepens the bend exponent under a heavy load", () => {
    expect(bendExponent(0)).toBeCloseTo(3.4, 5);
    expect(bendExponent(1)).toBeCloseTo(1.7, 5);
    const rig = new RodRig();
    rig.equip(true);
    rig.state = "fighting";
    const frame = {
      camX: 55, camY: 3.95, camZ: 38, yaw: 0, waterY: 0, dip: 0,
      fight: { distance: 12, tension: 1, surge: 0.2 },
    };
    for (let i = 0; i < 40; i++) rig.update(0.05, frame);
    expect(rig.bendP).toBeLessThan(2.4);
    expect(Math.abs(rig.bend)).toBeGreaterThan(0.05);
  });
});

function LINE_MID(rig: RodRig): number {
  return rig.line[(48 / 2) * 3 + 1];
}
