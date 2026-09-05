import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const shots = [
  "01_harbor_wide.png",
  "02_dock_near.png",
  "03_bayfin_weak.png",
  "04_flop_smash.png",
] as const;
const expects = [
  "expect_harbor_composition.jpg",
  "expect_fish_five_parts.jpg",
  "expect_cast_flop_cam.jpg",
] as const;

function read(rel: string) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function runTool(file: string, args: string[] = [], extraEnv: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [file, ...args], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      ...extraEnv,
    },
  });
}

describe("Creator preview / shot path", () => {
  it("keeps a four-shot drop folder with README and no forged images", () => {
    const dir = path.join(root, "docs/stage3d/creator-shots");
    expect(fs.existsSync(dir)).toBe(true);
    const readme = read("docs/stage3d/creator-shots/README.md");
    expect(readme).toMatch(/不要.*伪造 png|未伪造 png|不要伪造/);
    expect(readme).toMatch(/期望构图 ≠ Creator/);
    expect(readme).toMatch(/必须本机 Cocos Creator 3\.8\.8/);
    expect(readme).toContain("Boot.scene");
    expect(readme).toMatch(/一律不算证据/);
    expect(readme).toContain("first-run-preview");
    expect(readme).toMatch(/何时截/);
    expect(readme).toMatch(/短滑/);
    expect(readme).toMatch(/完美窗口/);
    expect(readme).toMatch(/下半屏/);
    for (const file of shots) expect(readme).toContain(file);
    const images = fs
      .readdirSync(dir)
      .filter((name) => /\.(png|jpe?g|webp)$/i.test(name));
    expect(images).toEqual([]);
  });

  it("labels expect schematics as not Creator / device shots", () => {
    const readme = read("docs/stage3d/README.md");
    expect(readme).toMatch(/期望构图 ≠ Creator/);
    expect(readme).toMatch(/示意图/);
    expect(readme).toMatch(/不能.*冒充|禁止冒充/);
    const gallery = read("docs/stage3d/gallery.html");
    expect(gallery).toMatch(/期望构图 ≠ Creator/);
    expect(gallery).toMatch(/禁止冒充实机/);
    for (const file of expects) {
      expect(fs.existsSync(path.join(root, "docs/stage3d", file))).toBe(true);
      expect(readme).toContain(file);
      expect(gallery).toContain(file);
    }
  });

  it("keeps proxy first-run banner marked as 2D/辅助 ≠ Creator 3D", () => {
    const extract = read("tools/first-run-preview/extract-copy.mjs");
    expect(extract).toMatch(/2D\/辅助 ≠ Creator 3D/);
    expect(extract).toContain("docs/stage3d/creator-shots");
    expect(extract).toMatch(/可浏览器代验/);
    const html = read("tools/first-run-preview/index.html");
    expect(html).toMatch(/2D\/辅助 ≠ Creator 3D/);
    expect(html).toMatch(/ctaPulse/);
    expect(read("tools/first-run-preview/shots/README.md")).toMatch(/2D\/辅助 ≠ Creator 3D/);
  });

  it("documents the shortest Creator preview to four shots", () => {
    const local = read("docs/LOCAL_PREVIEW.md");
    const stage = read("docs/STAGE_3D.md");
    for (const doc of [local, stage]) {
      expect(doc).toContain("Boot.scene");
      expect(doc).toMatch(/Ctrl\+P/);
      expect(doc).toMatch(/期望构图 ≠ Creator/);
      expect(doc).toContain("docs/stage3d/creator-shots");
      for (const file of shots) expect(doc).toContain(file);
    }
    expect(local).toContain("build/web-desktop");
    expect(local).toContain("try-web-desktop-build.mjs");
    expect(local).toContain("shots:list");
    expect(local).toMatch(/何时截/);
    expect(stage).toMatch(/何时截/);
    expect(local).toMatch(/一律不算/);
    expect(stage).toMatch(/一律不算/);
    expect(local).toMatch(/短滑/);
    expect(local).toMatch(/完美窗口/);
    expect(local).toMatch(/下半屏/);
  });

  it("prints a human checklist and reports zero creator shots on this machine", () => {
    const result = runTool("tools/stage3d-shot-checklist.mjs");
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/期望构图 ≠ Creator/);
    expect(result.stdout).toMatch(/0\/4/);
    expect(result.stdout).toContain("01_harbor_wide.png");
    expect(result.stdout).toContain("02_dock_near.png");
    expect(result.stdout).toContain("03_bayfin_weak.png");
    expect(result.stdout).toContain("04_flop_smash.png");
    expect(result.stdout).toMatch(/一律不算证据/);
    expect(result.stdout).toContain("first-run-preview");
    expect(result.stdout).toMatch(/短滑/);
    expect(result.stdout).toMatch(/完美窗口/);
    expect(result.stdout).toMatch(/下半屏/);
    expect(result.stdout).toMatch(/何时截/);
    expect(result.stdout).toMatch(/没有 build\/web-desktop/);
  });

  it("exits 2 with 缺 Creator when the editor is missing", () => {
    const result = runTool("tools/try-web-desktop-build.mjs", [], {
      COCOS_CREATOR: "",
      CREATOR_BIN: "",
      COCOS_CREATOR_BIN: "",
    });
    expect(result.status).toBe(2);
    expect(`${result.stdout}\n${result.stderr}`).toMatch(/缺 Creator/);
  });

  it("probe-only stays green and still says 缺 Creator without an editor", () => {
    const result = runTool("tools/try-web-desktop-build.mjs", ["--probe-only"], {
      COCOS_CREATOR: "",
      CREATOR_BIN: "",
      COCOS_CREATOR_BIN: "",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/缺 Creator/);
    expect(result.stdout).toMatch(/"ok": false/);
  });
});
