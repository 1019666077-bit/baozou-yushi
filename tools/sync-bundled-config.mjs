import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configDir = path.join(root, "assets", "config");
const fish = fs.readFileSync(path.join(configDir, "fish.json"), "utf8").trim();
const tools = fs.readFileSync(path.join(configDir, "tools.json"), "utf8").trim();
const islands = fs.readFileSync(path.join(configDir, "islands.json"), "utf8").trim();
const remote = fs.readFileSync(path.join(configDir, "remote-default.json"), "utf8").trim();

const source = `import type {
  FishConfig,
  IslandConfig,
  RemoteConfig,
  ToolConfig,
} from "./types";

export const bundledFish = ${fish} as FishConfig[];

export const bundledTools = ${tools} as ToolConfig[];

export const bundledIslands = ${islands} as IslandConfig[];

export const bundledRemote = ${remote} as RemoteConfig;
`;

fs.writeFileSync(
  path.join(root, "assets", "scripts", "data", "bundledConfig.ts"),
  source,
);
console.log("bundledConfig.ts updated");
