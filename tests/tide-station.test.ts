import { describe, expect, it } from "vitest";
import { HARBOR_CAM_REST } from "../assets/scripts/domain/CameraFeel";
import { STAGE_BUDGET, findPart } from "../assets/scripts/domain/ProcGeom";
import { albedoContrast, paintWaterAlbedo, paintWoodAlbedo } from "../assets/scripts/domain/StageSkin";
import {
  HARBOR_HERO,
  TIDE_STATION,
  TIDE_STATION_LAYERS,
  TIDE_STATION_TREE,
  expandFoundationGrid,
  fishermanParts,
  flotsamAnchor,
  foundationCellCenter,
  foundationParts,
  foundationPlankName,
  foundationTileName,
  horizonKitName,
  horizonParts,
  oceanParts,
  orderBoardParts,
  raftPropParts,
  tideStationHarborParts,
  tideStationMeshCount,
  tideStationWithinBudget,
} from "../assets/scripts/domain/TideStation";

const LOOK = {
  near: [12, 112, 146] as const,
  deep: [8, 58, 86] as const,
  land: [236, 210, 118] as const,
  landDark: [72, 168, 112] as const,
  accent: [255, 148, 42] as const,
};

describe("潮退浮站灰盒", () => {
  it("names Ocean / Horizon / RaftRoot / OrderBoard / Fisherman layers", () => {
    expect([...TIDE_STATION_LAYERS]).toEqual([
      "Ocean",
      "Horizon",
      "RaftRoot",
      "OrderBoard",
      "Fisherman",
    ]);
    expect(TIDE_STATION_TREE).toContain("Ocean");
    expect(TIDE_STATION_TREE).toContain("Horizon");
    expect(TIDE_STATION_TREE).toContain("RaftRoot");
    expect(TIDE_STATION_TREE).toContain("Foundation_ix_iz_P0");
    expect(TIDE_STATION_TREE).toContain("OrderBoard");
    expect(TIDE_STATION_TREE).toContain("Fisherman");
    expect(TIDE_STATION_TREE).toContain("阿笠");
    expect(TIDE_STATION_TREE).toContain("Base / Wall / Roof");
  });

  it("builds a waving layered ocean plus a foam ring, not a solid white pad", () => {
    const ocean = oceanParts(LOOK.near, LOOK.deep);
    expect(findPart(ocean, "Water")?.wave).toBe(true);
    expect(findPart(ocean, "Water")!.sx).toBeGreaterThanOrEqual(24);
    expect(findPart(ocean, "Water")?.uvTiling?.[0]).toBeGreaterThan(1);
    expect(findPart(ocean, "Mid")).toBeTruthy();
    expect(findPart(ocean, "Deep")).toBeTruthy();
    expect(findPart(ocean, "FoamN")).toBeTruthy();
    expect(findPart(ocean, "FoamS")).toBeTruthy();
    expect(findPart(ocean, "FoamE")).toBeTruthy();
    expect(findPart(ocean, "FoamW")).toBeTruthy();
    expect(findPart(ocean, "Foam")).toBeUndefined();
    expect(findPart(ocean, "FoamN")!.sx).toBeGreaterThan(findPart(ocean, "FoamN")!.sz);
  });

  it("gives each horizon building a base, wall, and roof kit on a ring", () => {
    const horizon = horizonParts(LOOK);
    for (let i = 0; i < TIDE_STATION.horizonCount; i++) {
      const base = findPart(horizon, horizonKitName(i, "Base"));
      const wall = findPart(horizon, horizonKitName(i, "Wall"));
      const roof = findPart(horizon, horizonKitName(i, "Roof"));
      expect(base).toBeTruthy();
      expect(wall).toBeTruthy();
      expect(roof).toBeTruthy();
      expect(wall!.sy).toBeGreaterThan(base!.sy);
      expect(roof!.sx).toBeGreaterThan(wall!.sx * 0.95);
      expect(Math.hypot(wall!.x, wall!.z)).toBeGreaterThan(10);
    }
    expect(findPart(horizon, "HorizonHaze")).toBeTruthy();
    expect(findPart(horizon, "HorizonSun")).toBeTruthy();
  });

  it("exposes an NxN foundation grid with plank strips and an expand hook", () => {
    const tiles = foundationParts(1);
    expect(tiles).toHaveLength(
      TIDE_STATION.foundationGrid ** 2 * TIDE_STATION.planksPerTile,
    );
    expect(tiles[0].name).toBe(foundationPlankName(0, 0, 0));
    expect(findPart(tiles, foundationPlankName(2, 2, 4))).toBeTruthy();
    const cell = tiles.filter((part) => part.name.startsWith(`${foundationTileName(0, 0)}_P`));
    expect(cell).toHaveLength(TIDE_STATION.planksPerTile);
    expect(cell[1].x).toBeGreaterThan(cell[0].x);
    expect(cell[0].color[0]).not.toBe(cell[1].color[0]);
    const a = foundationCellCenter(0, 0);
    const b = foundationCellCenter(2, 2);
    expect(b.x).toBeGreaterThan(a.x);
    expect(b.z).toBeGreaterThan(a.z);
    expect(expandFoundationGrid(5)).toBe(5);
    expect(foundationParts(1, 4)).toHaveLength(16 * TIDE_STATION.planksPerTile);
    const wide = foundationParts(2);
    expect(wide[0].sz).toBeGreaterThan(tiles[0].sz);
  });

  it("places a framed order board and young 阿笠 with douli, mino, teal shirt, rod", () => {
    const board = orderBoardParts();
    expect(findPart(board, "BoardPost")).toBeTruthy();
    expect(findPart(board, "BoardFrame")).toBeTruthy();
    expect(findPart(board, "BoardFace")).toBeTruthy();
    expect(findPart(board, "BoardHeader")).toBeTruthy();
    expect(findPart(board, "BoardBar")).toBeTruthy();
    expect(findPart(board, "BoardFace")!.color[0]).toBeLessThan(80);
    expect(findPart(board, "BoardFrame")!.sx).toBeGreaterThan(findPart(board, "BoardFace")!.sx);
    const fisher = fishermanParts();
    for (const name of [
      "FisherHatCrown",
      "FisherHatBrim",
      "FisherHead",
      "FisherTorso",
      "FisherMino",
      "FisherMinoMid",
      "FisherMinoHem",
      "FisherArmL",
      "FisherArmR",
      "FisherLegL",
      "FisherLegR",
      "FisherBootL",
      "FisherBootR",
      "FisherRod",
    ]) {
      expect(findPart(fisher, name)).toBeTruthy();
    }
    expect(findPart(fisher, "FisherHatBrim")!.sx).toBeGreaterThan(
      findPart(fisher, "FisherHatCrown")!.sx * 1.8,
    );
    expect(findPart(fisher, "FisherMinoHem")!.sx).toBeGreaterThan(findPart(fisher, "FisherMino")!.sx);
    expect(findPart(fisher, "FisherMinoMid")!.sx).toBeGreaterThan(findPart(fisher, "FisherMino")!.sx);
    expect(findPart(fisher, "FisherTorso")!.color[1]).toBeGreaterThan(
      findPart(fisher, "FisherTorso")!.color[0],
    );
    expect(findPart(fisher, "FisherHead")!.sx).toBeGreaterThan(0.3);
    expect(findPart(fisher, "FisherTorso")!.sy).toBeLessThan(0.48);
    expect(findPart(fisher, "FisherRod")!.sy).toBeGreaterThan(1.2);
    expect(findPart(fisher, "FisherHatCrown")!.y).toBeGreaterThan(findPart(fisher, "FisherHead")!.y);
    expect(findPart(fisher, "FisherHead")!.y).toBeGreaterThan(findPart(fisher, "FisherTorso")!.y);
    expect(findPart(fisher, "FisherTorso")!.y).toBeGreaterThan(findPart(fisher, "FisherLegL")!.y);
    expect(findPart(fisher, "FisherLegL")!.y).toBeGreaterThan(findPart(fisher, "FisherBootL")!.y);
    expect(HARBOR_HERO.name).toBe("阿笠");
    expect(HARBOR_HERO.lock).toBe("年轻版 A");
    expect(HARBOR_HERO.look).toMatch(/斗笠/);
    expect(TIDE_STATION.fisherman.x).toBeLessThan(2);
    expect(Math.abs(TIDE_STATION.orderBoard.x)).toBeLessThan(2.2);
    expect(flotsamAnchor().y).toBeGreaterThan(0);
    expect(findPart(raftPropParts(1), "Crate")).toBeTruthy();
    expect(findPart(raftPropParts(2), "Shed")).toBeTruthy();
  });

  it("keeps the harbor graybox inside the primitive budget with 0 packaged textures", () => {
    expect(STAGE_BUDGET.textureBytes).toBe(0);
    expect(STAGE_BUDGET.runtimeTexSize).toBe(64);
    expect(STAGE_BUDGET.runtimeTexCount).toBe(2);
    expect(STAGE_BUDGET.maxLights).toBe(1);
    expect(tideStationWithinBudget(LOOK, { pontoonTier: 1 })).toBe(true);
    expect(tideStationWithinBudget(LOOK, { pontoonTier: 2, showFlotsam: true })).toBe(
      true,
    );
    expect(tideStationMeshCount(LOOK, { pontoonTier: 2, showFlotsam: true })).toBeLessThanOrEqual(
      STAGE_BUDGET.maxHarborMeshes,
    );
    const names = tideStationHarborParts(LOOK, { pontoonTier: 2 }).map((part) => part.name);
    expect(names).toContain("Water");
    expect(names).toContain("Horizon_0_Wall");
    expect(names).toContain("Foundation_0_0_P0");
    expect(names).toContain("BoardFace");
    expect(names).toContain("FisherTorso");
    expect(names).toContain("FisherHatBrim");
    expect(names).toContain("FisherMino");
    expect(names.join(" ")).not.toMatch(/crazy|waterworld|疯狂水世界|拾潮|港仔/i);
  });

  it("paints original wood-plank and water-ripple albedos with readable contrast", () => {
    const wood = paintWoodAlbedo(64);
    const water = paintWaterAlbedo(64);
    expect(wood.width).toBe(64);
    expect(water.height).toBe(64);
    expect(albedoContrast(wood)).toBeGreaterThan(40);
    expect(albedoContrast(water)).toBeGreaterThan(20);
  });

  it("uses an oblique doorway-style harbor camera", () => {
    expect(HARBOR_CAM_REST.pitch).toBeLessThanOrEqual(-30);
    expect(HARBOR_CAM_REST.pitch).toBeGreaterThan(-50);
    expect(HARBOR_CAM_REST.y).toBeGreaterThanOrEqual(7);
    expect(HARBOR_CAM_REST.z).toBeGreaterThan(8);
    expect(HARBOR_CAM_REST.x).toBe(TIDE_STATION.cam.x);
    expect(HARBOR_CAM_REST.pitch).toBe(TIDE_STATION.cam.pitch);
    expect(TIDE_STATION.cam.fov).toBeGreaterThanOrEqual(36);
  });
});
