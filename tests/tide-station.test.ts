import { describe, expect, it } from "vitest";
import { HARBOR_CAM_REST } from "../assets/scripts/domain/CameraFeel";
import { STAGE_BUDGET, findPart } from "../assets/scripts/domain/ProcGeom";
import {
  TIDE_STATION,
  TIDE_STATION_LAYERS,
  TIDE_STATION_TREE,
  expandFoundationGrid,
  fishermanParts,
  flotsamAnchor,
  foundationCellCenter,
  foundationParts,
  foundationTileName,
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
    expect(TIDE_STATION_TREE).toContain("Foundation_0_0");
    expect(TIDE_STATION_TREE).toContain("OrderBoard");
    expect(TIDE_STATION_TREE).toContain("Fisherman");
  });

  it("builds a waving ocean plus a half-sunk horizon ring", () => {
    const ocean = oceanParts(LOOK.near, LOOK.deep);
    expect(findPart(ocean, "Water")?.wave).toBe(true);
    expect(findPart(ocean, "Water")!.sx).toBeGreaterThanOrEqual(24);
    expect(findPart(ocean, "Foam")).toBeTruthy();
    const horizon = horizonParts(LOOK);
    const ring = horizon.filter((part) => part.name.startsWith("Horizon_"));
    expect(ring).toHaveLength(TIDE_STATION.horizonCount);
    const radius = ring.map((part) => Math.hypot(part.x, part.z));
    expect(Math.min(...radius)).toBeGreaterThan(10);
    expect(findPart(horizon, "HorizonHaze")).toBeTruthy();
    expect(findPart(horizon, "HorizonSun")).toBeTruthy();
  });

  it("exposes an NxN foundation grid with an expand hook", () => {
    const tiles = foundationParts(1);
    expect(tiles).toHaveLength(TIDE_STATION.foundationGrid ** 2);
    expect(tiles[0].name).toBe(foundationTileName(0, 0));
    expect(findPart(tiles, foundationTileName(2, 2))).toBeTruthy();
    const a = foundationCellCenter(0, 0);
    const b = foundationCellCenter(2, 2);
    expect(b.x).toBeGreaterThan(a.x);
    expect(b.z).toBeGreaterThan(a.z);
    expect(expandFoundationGrid(5)).toBe(5);
    expect(foundationParts(1, 4)).toHaveLength(16);
    const wide = foundationParts(2);
    expect(wide[0].sx).toBeGreaterThan(tiles[0].sx);
  });

  it("places a 3D order board and a standing fisherman graybox", () => {
    const board = orderBoardParts();
    expect(findPart(board, "Board")).toBeTruthy();
    expect(findPart(board, "BoardPost")).toBeTruthy();
    expect(findPart(board, "BoardHeader")).toBeTruthy();
    const fisher = fishermanParts();
    expect(findPart(fisher, "FisherHead")).toBeTruthy();
    expect(findPart(fisher, "FisherTorso")).toBeTruthy();
    expect(findPart(fisher, "FisherLegL")).toBeTruthy();
    expect(findPart(fisher, "FisherLegR")).toBeTruthy();
    expect(findPart(fisher, "FisherHead")!.y).toBeGreaterThan(
      findPart(fisher, "FisherTorso")!.y,
    );
    expect(findPart(fisher, "FisherTorso")!.y).toBeGreaterThan(
      findPart(fisher, "FisherLegL")!.y,
    );
    expect(TIDE_STATION.fisherman.x).toBeLessThan(2);
    expect(Math.abs(TIDE_STATION.orderBoard.x)).toBeLessThan(2.2);
    expect(flotsamAnchor().y).toBeGreaterThan(0);
    expect(findPart(raftPropParts(1), "Crate")).toBeTruthy();
    expect(findPart(raftPropParts(2), "Shed")).toBeTruthy();
  });

  it("keeps the harbor graybox inside the primitive budget", () => {
    expect(STAGE_BUDGET.textureBytes).toBe(0);
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
    expect(names).toContain("Horizon_0");
    expect(names).toContain("Foundation_0_0");
    expect(names).toContain("Board");
    expect(names).toContain("FisherTorso");
    expect(names.join(" ")).not.toMatch(/crazy|waterworld|疯狂水世界/i);
  });

  it("uses an oblique top-down harbor camera", () => {
    expect(HARBOR_CAM_REST.pitch).toBeLessThanOrEqual(-38);
    expect(HARBOR_CAM_REST.y).toBeGreaterThanOrEqual(9);
    expect(HARBOR_CAM_REST.z).toBeGreaterThan(8);
    expect(HARBOR_CAM_REST.x).toBe(TIDE_STATION.cam.x);
    expect(HARBOR_CAM_REST.pitch).toBe(TIDE_STATION.cam.pitch);
    expect(TIDE_STATION.cam.fov).toBeGreaterThanOrEqual(36);
  });
});
