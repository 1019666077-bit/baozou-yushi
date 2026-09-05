/**
 * 自绘简笔卡通矢量：湾鳍鱼、木码头、分层水面。
 * 写入 assets/art/vector/，供 Runtime 对照；预览用同一造型手绘，不引入外部立绘包。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../assets/art/vector");
fs.mkdirSync(out, { recursive: true });

const bayfin = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="-80 -40 160 80" width="320" height="160">
  <ellipse cx="0" cy="22" rx="46" ry="9" fill="rgba(8,28,40,0.32)"/>
  <path d="M-24 0 L-68 -20 L-52 0 L-68 20 Z" fill="#128e7c"/>
  <path d="M8 8 L28 36 L34 6 Z" fill="#128e7c"/>
  <path d="M6 -6 L0 -30 L18 -8 Z" fill="#24d6b2"/>
  <ellipse cx="6" cy="2" rx="36" ry="18" fill="#24d6b2"/>
  <ellipse cx="16" cy="8" rx="22" ry="10" fill="#d2fade"/>
  <ellipse cx="18" cy="-2" rx="8" ry="5" fill="rgba(255,168,140,0.55)"/>
  <path d="M-6 2 Q8 12 26 3" fill="none" stroke="#128e7c" stroke-width="2.2"/>
  <circle cx="30" cy="1" r="6.2" fill="#fffaf0"/>
  <circle cx="32" cy="0" r="3" fill="#121c18"/>
  <circle cx="33.2" cy="-1.2" r="1.1" fill="#fff"/>
  <ellipse cx="34" cy="10" rx="4" ry="2" fill="#162820"/>
  <circle cx="26" cy="16" r="7" fill="#ffe24a" stroke="#fff8c0" stroke-width="2.4"/>
</svg>
`;

const dock = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 140" width="440" height="140">
  <ellipse cx="210" cy="128" rx="200" ry="10" fill="rgba(10,32,46,0.45)"/>
  <rect x="16" y="86" width="14" height="42" rx="2" fill="#6a4a28"/>
  <rect x="86" y="86" width="14" height="42" rx="2" fill="#6a4a28"/>
  <rect x="156" y="86" width="14" height="42" rx="2" fill="#6a4a28"/>
  <rect x="226" y="86" width="14" height="42" rx="2" fill="#6a4a28"/>
  <rect x="296" y="86" width="14" height="42" rx="2" fill="#6a4a28"/>
  <rect x="8" y="28" width="400" height="72" rx="8" fill="#cc8a44"/>
  <rect x="8" y="28" width="400" height="16" rx="6" fill="#ecba6c"/>
  <g fill="#8a5a2c">
    <rect x="24" y="46" width="6" height="48"/>
    <rect x="76" y="46" width="6" height="48"/>
    <rect x="128" y="46" width="6" height="48"/>
    <rect x="180" y="46" width="6" height="48"/>
    <rect x="232" y="46" width="6" height="48"/>
    <rect x="284" y="46" width="6" height="48"/>
    <rect x="336" y="46" width="6" height="48"/>
    <rect x="388" y="46" width="6" height="48"/>
  </g>
  <path d="M20 40 H396" stroke="#6e4622" stroke-width="2"/>
  <path d="M20 70 H396" stroke="#6e4622" stroke-width="1.4" opacity="0.7"/>
  <rect x="84" y="8" width="76" height="54" rx="8" fill="#18a0aa"/>
  <rect x="92" y="16" width="60" height="16" rx="4" fill="#125a68"/>
  <rect x="104" y="20" width="16" height="6" rx="2" fill="#ffe9b4"/>
</svg>
`;

const water = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffa456"/>
      <stop offset="0.22" stop-color="#ffc480"/>
      <stop offset="0.4" stop-color="#ffdca8"/>
      <stop offset="0.52" stop-color="#24a8ba"/>
      <stop offset="0.72" stop-color="#0a5c7e"/>
      <stop offset="1" stop-color="#062c44"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#sky)"/>
  <ellipse cx="1060" cy="168" rx="220" ry="22" fill="rgba(255,236,210,0.18)"/>
  <path d="M0 316 H1280" stroke="rgba(210,232,236,0.45)" stroke-width="4"/>
  <path d="M0 322 H1280" stroke="rgba(255,252,236,0.16)" stroke-width="2"/>
  <path d="M40 420 C120 408,200 432,280 418 S440 404,520 422" fill="none" stroke="rgba(210,232,236,0.22)" stroke-width="3"/>
  <path d="M600 500 C700 488,800 512,900 498 S1100 486,1220 508" fill="none" stroke="rgba(210,232,236,0.16)" stroke-width="3"/>
  <ellipse cx="360" cy="560" rx="160" ry="12" fill="rgba(210,232,236,0.08)"/>
</svg>
`;

fs.writeFileSync(path.join(out, "bayfin.svg"), bayfin);
fs.writeFileSync(path.join(out, "dock.svg"), dock);
fs.writeFileSync(path.join(out, "water.svg"), water);
fs.writeFileSync(
  path.join(out, "README.md"),
  `# 自绘矢量（非外部立绘包）

\`generate-vector-art.mjs\` 写出的简笔卡通：湾鳍鱼、木码头、分层水面。

Runtime 用 Graphics 复刻同一造型；代理预览用 canvas 复刻。**不能当作 Cocos 实机截图。**
`,
);
console.log(`wrote vector art → ${out}`);
