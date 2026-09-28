/**
 * 把钓鱼预览的 TypeScript 打成一份脚本再送给浏览器。非 Cocos 实机。
 *
 *   node tools/fishing-preview/serve.mjs
 *   打开 http://127.0.0.1:8771/
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const port = Number(process.env.PORT || 8771);
const outFile = path.join(here, "generated", "app.js");

function bundle() {
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const result = spawnSync(
    "npx",
    ["--yes", "esbuild", path.join(here, "main.ts"), "--bundle", "--format=esm", `--outfile=${outFile}`, "--target=es2020"],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`esbuild 失败\n${result.stdout}\n${result.stderr}`);
  }
}

bundle();
const html = fs.readFileSync(path.join(here, "index.html"));

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  if (url.pathname === "/preview.js") {
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
    res.end(fs.readFileSync(outFile));
    return;
  }
  if (
    url.pathname === "/"
    || url.pathname === "/tools/fishing-preview/"
    || url.pathname === "/tools/fishing-preview/index.html"
  ) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }
  res.writeHead(404);
  res.end("not found");
});

server.listen(port, "127.0.0.1", () => {
  console.log(`fishing preview http://127.0.0.1:${port}/`);
});
