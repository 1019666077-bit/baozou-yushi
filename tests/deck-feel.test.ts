import { describe, expect, it } from "vitest";
import {
  DECK_BODY,
  DECK_Y,
  ESCAPE_FEEL,
  FLOP_FEEL,
  SMASH_WINDOW,
  WATER_X,
  airborneStyleQuality,
  applyEscape,
  carryDragHint,
  carryReleaseAt,
  carryReleaseCaption,
  clampCarry,
  createFlopBody,
  escapeCaption,
  escapePhaseAt,
  flopMassForTier,
  flopSlidePx,
  isAirborne,
  knock,
  knockKindOf,
  knockVector,
  smashGradeAt,
  smashWindowOpen,
  stepFlop,
} from "../assets/scripts/domain/FlopPhysics";
import { smashHighlightSpec } from "../assets/scripts/domain/HitJuice";
import {
  PLAY_LAYOUT,
  actionBandCaption,
  clampToActionBand,
  inActionBand,
} from "../assets/scripts/domain/PlayLayout";
import { comboHud, smashCallout } from "../assets/scripts/domain/StyleCallout";

describe("DeckFeel A 甲板刚体", () => {
  it("lands with mass and a short slide instead of sticking", () => {
    expect(flopMassForTier("boss")).toBeGreaterThan(flopMassForTier("elite"));
    expect(flopMassForTier("elite")).toBeGreaterThan(flopMassForTier("normal"));
    expect(flopSlidePx(1, false)).toBeGreaterThan(DECK_BODY.minSlidePx);
    const light = createFlopBody(-320, DECK_Y, 1);
    light.vx = -128;
    light.vy = -30;
    const heavy = createFlopBody(-320, DECK_Y, DECK_BODY.massBoss);
    heavy.vx = -128;
    heavy.vy = -30;
    let lite = light;
    let heft = heavy;
    for (let i = 0; i < 12; i++) {
      lite = stepFlop(lite, 0.016, false);
      heft = stepFlop(heft, 0.016, false);
    }
    expect(Math.abs(heft.vx)).toBeLessThan(Math.abs(lite.vx));
    let slide = createFlopBody(-320, DECK_Y, 1);
    slide.vx = FLOP_FEEL.launchVx;
    slide.vy = 0;
    const from = slide.x;
    for (let i = 0; i < 36; i++) slide = stepFlop(slide, 0.016, false);
    expect(Math.abs(slide.x - from)).toBeGreaterThan(DECK_BODY.minSlidePx);
  });
});

describe("DeckFeel A 逃水", () => {
  it("slides then leaps back to water with readable copy", () => {
    expect(
      escapePhaseAt({
        onDeck: true,
        airborne: false,
        inWater: false,
        stunned: false,
        unattended: ESCAPE_FEEL.slideAfter,
        waterTime: 0,
      }),
    ).toBe("slide");
    expect(
      escapePhaseAt({
        onDeck: true,
        airborne: false,
        inWater: false,
        stunned: false,
        unattended: ESCAPE_FEEL.leapAfter,
        waterTime: 0,
      }),
    ).toBe("leap");
    expect(
      escapePhaseAt({
        onDeck: false,
        airborne: false,
        inWater: true,
        stunned: false,
        unattended: 4,
        waterTime: ESCAPE_FEEL.waterGone,
      }),
    ).toBe("gone");
    expect(
      escapePhaseAt({
        onDeck: true,
        airborne: false,
        inWater: false,
        stunned: true,
        unattended: ESCAPE_FEEL.slideAfter,
        waterTime: 0,
      }),
    ).toBe("idle");
    const slid = applyEscape(createFlopBody(-320, DECK_Y), "slide", 0.016);
    expect(slid.vx).toBeGreaterThanOrEqual(ESCAPE_FEEL.slideVx);
    expect(escapeCaption("slide")).toContain("海里");
    expect(escapeCaption("leap")).toContain("跳");
    expect(escapeCaption("gone")).toContain("海里");
  });
});

describe("DeckFeel A 击退", () => {
  it("gives weak and smash hits a stronger knockback vector", () => {
    const body = createFlopBody(-300, -80);
    const smash = knockVector(body, -400, -90, 20, "smash");
    const weak = knockVector(body, -400, -90, 20, "weak");
    const hip = knockVector(body, -400, -90, 20, "body");
    expect(smash.vy).toBeGreaterThan(weak.vy);
    expect(weak.vy).toBeGreaterThan(hip.vy);
    expect(knockKindOf(true, true)).toBe("smash");
    expect(knockKindOf(true, false)).toBe("weak");
    const heavy = knockVector({ ...body, mass: 2.2 }, -400, -90, 20, "smash");
    expect(heavy.vx).toBeLessThan(smash.vx);
    const hit = knock(body, -400, -90, 20, "smash");
    expect(hit.vy).toBeGreaterThan(body.vy);
  });
});

describe("DeckFeel A 搬运", () => {
  it("stashes on the crate, drops on deck, and escapes in water", () => {
    expect(carryReleaseAt(-520, -150)).toBe("stash");
    expect(carryReleaseAt(-400, -140)).toBe("drop_deck");
    expect(carryReleaseAt(WATER_X + 20, -40)).toBe("drop_water");
    expect(carryReleaseCaption("stash")).toContain("鱼箱");
    expect(carryReleaseCaption("drop_deck")).toContain("甲板");
    expect(carryReleaseCaption("drop_water")).toContain("海里");
    expect(carryDragHint()).toContain("下半屏");
    const held = clampCarry(200, 80);
    expect(held.x).toBeLessThanOrEqual(40);
    expect(held.y).toBeLessThanOrEqual(-8);
  });
});

describe("DeckFeel A 半屏操作", () => {
  it("keeps move/aim pads in the lower half", () => {
    expect(PLAY_LAYOUT.movePad.y).toBeLessThan(0);
    expect(PLAY_LAYOUT.aimPad.y).toBeLessThan(0);
    expect(PLAY_LAYOUT.movePad.y + PLAY_LAYOUT.movePad.h / 2).toBeLessThanOrEqual(0);
    expect(inActionBand(-120)).toBe(true);
    expect(inActionBand(80)).toBe(false);
    expect(clampToActionBand(0, 40).y).toBeLessThanOrEqual(0);
    expect(actionBandCaption()).toContain("下半屏");
  });
});

describe("DeckFeel B 空中砸", () => {
  it("opens a smash window around the flop apex with a perfect band", () => {
    const apex = DECK_Y + 160;
    expect(smashGradeAt({ y: DECK_Y + 8 }, apex)).toBe("none");
    expect(smashGradeAt({ y: DECK_Y + 160 * SMASH_WINDOW.perfectLo + 4 }, apex)).toBe(
      "perfect",
    );
    expect(smashGradeAt({ y: DECK_Y + 160 * 0.28 }, apex)).toBe("open");
    expect(smashWindowOpen("perfect")).toBe(true);
    expect(smashWindowOpen("none")).toBe(false);
    expect(airborneStyleQuality("perfect")).toBeGreaterThan(airborneStyleQuality("open"));
    expect(airborneStyleQuality("none")).toBe(0);
    expect(isAirborne({ y: DECK_Y + 40 })).toBe(true);
  });

  it("shows smash juice caption, readable multiplier, and highlight", () => {
    expect(smashCallout("perfect", true)).toContain("完美窗口");
    expect(smashCallout("open", false)).toBe("空中砸");
    expect(comboHud(1, 1)).toBe("精彩 ×1.00");
    expect(comboHud(1.4, 3, { rising: true, from: 1.1 })).toContain("→×1.40");
    expect(comboHud(1.4, 3, { rising: true, from: 1.1 })).toContain("↑");
    const glow = smashHighlightSpec("perfect", 0, false);
    expect(glow.visible).toBe(true);
    expect(glow.caption).toBe("完美窗口");
    expect(glow.radius).toBeGreaterThan(smashHighlightSpec("open", 0, false).radius);
    expect(smashHighlightSpec("none", 0, false).visible).toBe(false);
  });
});
