/**
 * 第一局体验代理静态服。非 Cocos 实机。
 * 先抽取源码文案，再在 8766 提供单页预览。
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PREVIEW_PORT ?? 8766);

const extract = spawnSync(process.execPath, [path.join(here, "extract-copy.mjs")], {
  stdio: "inherit",
});
if (extract.status !== 0) {
  process.exit(extract.status ?? 1);
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
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

server.listen(port, "127.0.0.1", () => {
  console.log(`first-run proxy http://127.0.0.1:${port}/`);
  console.log("非 Cocos 实机，仅体验代理");
});
