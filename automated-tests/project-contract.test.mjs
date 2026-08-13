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
