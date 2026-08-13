import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("project includes its specification and agent instructions", async () => {
  await Promise.all([
    access(new URL("spec.md", root)),
    access(new URL("agent.md", root)),
    access(new URL("AGENTS.md", root)),
  ]);
});

test("GitHub Pages workflow builds and deploys the static export", async () => {
  const [workflow, config] = await Promise.all([
    readFile(new URL(".github/workflows/deploy-pages.yml", root), "utf8"),
    readFile(new URL("next.config.ts", root), "utf8"),
  ]);
  assert.match(workflow, /actions\/deploy-pages/);
  assert.match(workflow, /npm (?:run )?test/);
  assert.match(config, /output:\s*["']export["']/);
  assert.match(config, /HOMM3_clone/);
});

test("branch-based GitHub Pages serves the game instead of the README", async () => {
  const [html, syncScript] = await Promise.all([
    readFile(new URL("index.html", root), "utf8"),
    readFile(new URL("scripts/sync-pages-root.mjs", root), "utf8"),
    access(new URL(".nojekyll", root)),
    access(new URL("public/assets/map/city-preindustrial.webp", root)),
  ]);
  assert.match(html, /Through the Ages/);
  assert.match(html, /HOMM3_clone\/_next/);
  assert.match(syncScript, /exportDirectory}\/assets/);
});

test("entering a city uses a dedicated full-screen management surface", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /className="city-screen"/);
  assert.match(page, /Return to adventure map/);
  assert.match(page, /construction-tree full-tree/);
  assert.match(page, /Permanent city guard/);
  assert.match(page, /Construction available: this city may complete one building this turn/);
  assert.match(page, /Construction complete for this turn/);
});
