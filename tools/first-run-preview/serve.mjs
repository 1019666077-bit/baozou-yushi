/**
 * 第一局体验代理静态服。非 Cocos 实机。
 * 先抽取源码文案，再在 8766 提供单页预览。
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { dumpLayout } from "../tide-station-preview/dump.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const tideRoot = path.join(root, "tools/tide-station-preview");
const port = Number(process.env.PREVIEW_PORT ?? 8766);
const host = process.env.PREVIEW_HOST ?? "0.0.0.0";

const extract = spawnSync(process.execPath, [path.join(here, "extract-copy.mjs")], {
  stdio: "inherit",
});
if (extract.status !== 0) {
  process.exit(extract.status ?? 1);
}
dumpLayout({ skipExtract: true });

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  if (url.pathname.startsWith("/tide-station/")) {
    const rel = decodeURIComponent(url.pathname.slice("/tide-station/".length));
    if (!rel || rel.includes("..")) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    const absTide = path.normalize(path.join(tideRoot, rel));
    if (
      !absTide.startsWith(tideRoot + path.sep) ||
      !fs.existsSync(absTide) ||
      fs.statSync(absTide).isDirectory()
    ) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const ext = path.extname(absTide);
    res.writeHead(200, {
      "Content-Type": TYPES[ext] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(absTide).pipe(res);
    return;
  }
  let file = url.pathname === "/" ? "/index.html" : url.pathname;
  const abs = path.normalize(path.join(here, file));
  if (!abs.startsWith(here)) {
    res.writeHead(403);
    res.end("forbidden");
    return;
  }
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  const ext = path.extname(abs);
  res.writeHead(200, { "Content-Type": TYPES[ext] ?? "application/octet-stream" });
  fs.createReadStream(abs).pipe(res);
});

server.listen(port, host, () => {
  console.log(`first-run proxy http://127.0.0.1:${port}/`);
  console.log(`listening ${host}:${port} (Cursor 端口转发可用)`);
  console.log("非 Cocos 实机：港口是潮退浮站浏览器 3D 灰盒，猎场仍是 2D。2D/辅助 ≠ Creator 3D");
  console.log("可浏览器代验玩法/画面。2D/辅助 ≠ Creator 3D，不能当 3D 实机证据。");
});
