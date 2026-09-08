const islands = [
  "island_tutorial",
  "island_foam_bay",
  "island_prism_reef",
  "island_storm_eye",
];

const tools = [
  { id: "tool_rod", levels: [{ level: 1 }, { level: 2 }, { level: 3 }] },
  { id: "tool_cannon", levels: [{ level: 1 }, { level: 2 }, { level: 3 }] },
  { id: "tool_harpoon", levels: [{ level: 1 }, { level: 2 }, { level: 3 }] },
];

const fish = [
  { id: "fish_bayfin", basePrice: 8, rarityMultiplier: 1 },
  { id: "fish_shellback", basePrice: 14, rarityMultiplier: 1.05 },
  { id: "fish_silver_ribbon", basePrice: 20, rarityMultiplier: 1.1 },
  { id: "fish_lantern_pod", basePrice: 27, rarityMultiplier: 1.15 },
  { id: "fish_ember_eel", basePrice: 36, rarityMultiplier: 1.2 },
  { id: "fish_reef_hopper", basePrice: 43, rarityMultiplier: 1.25 },
  { id: "elite_prism_sail", basePrice: 65, rarityMultiplier: 1.4 },
  { id: "elite_iron_jaw", basePrice: 100, rarityMultiplier: 1.5 },
  { id: "elite_tempest_ray", basePrice: 145, rarityMultiplier: 1.6 },
  { id: "boss_tide_singer", basePrice: 480, rarityMultiplier: 2 },
];

module.exports = { islands, tools, fish };
