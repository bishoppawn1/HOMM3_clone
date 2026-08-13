import { cp, mkdir, rm } from "node:fs/promises";

const exportDirectory = process.argv[2] ?? "out";

await rm("_next", { force: true, recursive: true });
await rm("assets", { force: true, recursive: true });
await mkdir("_next", { recursive: true });
await Promise.all([
  cp(`${exportDirectory}/index.html`, "index.html", { force: true }),
  cp(`${exportDirectory}/404.html`, "404.html", { force: true }),
  cp(`${exportDirectory}/favicon.svg`, "favicon.svg", { force: true }),
  cp(`${exportDirectory}/assets`, "assets", { force: true, recursive: true }),
  cp(`${exportDirectory}/_next`, "_next", { force: true, recursive: true }),
]);

console.log("GitHub Pages root snapshot updated.");
