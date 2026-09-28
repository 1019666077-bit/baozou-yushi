/**
 * 潮退浮站浏览器 3D 灰盒。非 Cocos 实机。
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dumpLayout } from "./dump.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.TIDE_STATION_PORT ?? 8791);
const host = process.env.PREVIEW_HOST ?? "0.0.0.0";

dumpLayout();

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
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
  res.writeHead(200, {
    "Content-Type": TYPES[ext] ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(abs).pipe(res);
});

server.listen(port, host, () => {
  console.log(`tide-station graybox http://127.0.0.1:${port}/`);
  console.log(`listening ${host}:${port} (Cursor 端口转发可用)`);
  console.log("浏览器 3D 灰盒 ≠ Creator 实机，不能当 3D 证据。");
});
