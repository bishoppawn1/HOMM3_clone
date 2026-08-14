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
    access(new URL("public/assets/map-v2/city-ancient.webp", root)),
  ]);
  assert.match(html, /Through the Ages/);
  assert.match(html, /HOMM3_clone\/_next/);
  assert.match(syncScript, /exportDirectory}\/assets/);
});

test("every age has distinct city and producer artwork", async () => {
  const ages = ["ancient", "classical", "medieval", "gunpowder", "industrial", "modern"];
  const producers = ["sawmill", "quarry", "dustworks"];
  await Promise.all(ages.flatMap((age) => [
    access(new URL(`public/assets/map-v2/city-${age}.webp`, root)),
    ...producers.map((producer) => access(new URL(`public/assets/map-v2/${producer}-${age}.webp`, root))),
  ]));
});

test("every troop line has an age-specific portrait and combat uses right-click orders with health feedback", async () => {
  const ages = ["ancient", "classical", "medieval", "gunpowder", "industrial", "modern"];
  const units = ["spearmen", "slingers", "scouts", "swordsmen", "horsemen", "artillery", "armor", "aircraft"];
  const [page, styles] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    ...ages.flatMap((age) => units.map((unit) => access(new URL(`public/assets/units/${age}-${unit}.png`, root)))),
  ]);
  assert.match(page, /assets\/units\/\$\{eraVisualFamily\(era\)\}-\$\{unitId\}\.png/);
  assert.match(page, /onContextMenu=\{\(event\) => \{ event\.preventDefault\(\); handleHex\(tile, stack\); \}\}/);
  assert.match(page, /className="unit-health"/);
  assert.match(page, /Right-click a yellow hex to move/);
  assert.match(page, /activeUnit\?\.flying && canMove/);
  assert.doesNotMatch(page, /disabled=\{Boolean\(combat\.result\) \|\| Boolean\(obstacle\)/);
  assert.match(styles, /\.combat-unit>img/);
  assert.match(styles, /\.unit-health>small/);
});

test("the map uses proportioned terrain, winding roads, enemies, pickups, and subtle territory tint", async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    ...["terrain-forest", "terrain-mountain", "pickup-timber", "pickup-stone", "pickup-gold", "pickup-dust"]
      .map((asset) => access(new URL(`public/assets/map-v2/${asset}.webp`, root))),
    access(new URL("public/assets/map-v2/enemy-bandit-unit.png", root)),
  ]);
  assert.match(page, /className={`territory-fill/);
  assert.match(page, /pickup-\$\{pickup\}/);
  assert.match(page, /enemy-bandit-unit\.png/);
  assert.doesNotMatch(page, /map-bandit-camp/);
  assert.doesNotMatch(page, /Bandit camp spoils/);
  assert.match(page, /const adventureRoads/);
  assert.match(page, /const terrainArtwork/);
  assert.match(page, /className="hill-ground"/);
  assert.match(page, /className="road-rut"/);
  assert.doesNotMatch(page, /terrain-glyph/);
  assert.match(page, /terrainPatchBounds/);
  assert.doesNotMatch(page, /className="territory-layer"/);
  assert.match(styles, /\.terrain-patch\{[^}]*height:auto/);
  assert.match(styles, /\.site\.enemy\{inset:-50% -10%;z-index:5/);
  assert.doesNotMatch(styles, /\.site\.enemy:before/);
  assert.match(styles, /\.hill-ground/);
  assert.doesNotMatch(styles, /\.terrain-glyph/);
  assert.doesNotMatch(styles, /object-fit:fill/);
});

test("the adventure map supports WASD camera panning and keeps roads above forest artwork", async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);
  assert.match(page, /MAP_PAN_DIRECTIONS/);
  assert.match(page, /window\.addEventListener\("keydown", panMap\)/);
  assert.match(page, /viewport\.scrollBy/);
  assert.match(page, /WASD to pan/);
  assert.match(page, /className="road-layer"/);
  assert.match(styles, /\.road-layer \{ z-index:3/);
  assert.match(styles, /\.map-tile \{[^}]*z-index:4/);
});

test("entering a city uses a dedicated full-screen management surface", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /className="city-screen"/);
  assert.match(page, /Return to adventure map/);
  assert.match(page, /construction-tree full-tree/);
  assert.match(page, /Permanent city guard/);
  assert.match(page, /Construction available: this city may complete one building this turn/);
  assert.match(page, /Construction complete for this turn/);
  assert.match(page, /construction-connectors/);
  assert.match(page, /buildingConnectorPath/);
  assert.match(page, /Requires:/);
  assert.match(page, /className=\{`recruit-unit/);
  assert.match(page, /unit-inspector/);
  assert.match(page, /Attack<\/span>/);
  assert.match(page, /Available next turn/);
  assert.match(page, /construction-cost/);
});

test("the age advancement control changes game state", async () => {
  const [page, core, styles] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/game-core.js", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);
  assert.match(page, /onClick=\{\(\) => setGame\(advanceEra\)\}/);
  assert.match(core, /export function advanceEra/);
  assert.doesNotMatch(core, /Administer at least two settlements/);
  assert.doesNotMatch(core, /Complete a Civic Workshop/);
  assert.match(styles, /\.world>\.right-rail\s*\{[^}]*height:100%[^}]*max-height:100%/);
  assert.match(styles, /\.world\s*\{height:calc\(100vh - 162px\);min-height:0\}/);
});

test("tactical combat exposes active-unit and movement feedback for both sides", async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);
  assert.match(page, /Enemy selected:/);
  assert.match(page, /active-marker/);
  assert.match(page, /combat-moving-token/);
  assert.match(page, /Finish Turn/);
  assert.match(styles, /@keyframes combat-stack-move/);
  assert.match(styles, /selected-stack-pulse/);
});

test("a prompted encounter offers deployment or holding position", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  assert.match(page, /Deploy on the battlefield/);
  assert.match(page, /Hold position/);
  assert.match(page, /declineBattle/);
});

test("the tactical battlefield renders an interlocking point-top honeycomb", async () => {
  const [page, styles] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
  ]);
  assert.match(page, /top: `\$\{row \* \.75 \/ verticalSpan \* 100\}%`/);
  assert.match(page, /left: `\$\{\(col \+ \(row % 2\) \* \.5\)/);
  assert.match(page, /className="hex-battlefield"/);
  assert.match(page, /within \$\{activeUnit\.range\} hexes/);
  assert.match(page, /Range \$\{unit\.range\}/);
  assert.match(styles, /clip-path:polygon\(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%\)/);
  assert.match(styles, /aspect-ratio:1\.86\/1/);
});
