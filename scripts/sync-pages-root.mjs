import { cp, mkdir, rm } from "node:fs/promises";

await rm("_next", { force: true, recursive: true });
await mkdir("_next", { recursive: true });
await Promise.all([
  cp("out/index.html", "index.html", { force: true }),
  cp("out/404.html", "404.html", { force: true }),
  cp("out/favicon.svg", "favicon.svg", { force: true }),
  cp("out/_next", "_next", { force: true, recursive: true }),
]);

console.log("GitHub Pages root snapshot updated.");
