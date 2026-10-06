import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const b = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://127.0.0.1:5173");
await p.getByRole("button", { name: "Starta mitt bolag" }).click();
await p.getByRole("button", { name: "Stäng introduktion" }).click();
const nav = async (n) =>
  p.locator("nav").getByRole("button", { name: n, exact: false }).click();
const read = () =>
  p.evaluate(() => JSON.parse(localStorage.getItem("konsultbolaget-v1")));
const turn = async () => {
  await p.getByRole("button", { name: "Nästa månad", exact: true }).click();
  await p.getByRole("button", { name: "Genomför månad" }).click();
  await p.getByRole("button", { name: "Tillbaka till bolaget" }).click();
};
await nav("Personal");
const card = p
  .locator(".candidate")
  .filter({ has: p.getByRole("heading", { name: "Maja Lind", exact: true }) });
await card.getByRole("button", { name: "Bedöm kandidat" }).click();
await card.getByRole("button", { name: "Planerat", exact: true }).click();
assert.equal((await read()).plan.assess.length, 0);
await card.getByRole("button", { name: "Bedöm kandidat" }).click();
await turn();
assert.ok((await read()).assessed.includes("c0"));
await card.getByRole("button", { name: "Lämna erbjudande" }).click();
assert.deepEqual((await read()).plan.hires, ["c0"]);
await card.getByRole("button", { name: "Planerat", exact: true }).click();
assert.deepEqual((await read()).plan.hires, []);
await nav("Marknad");
await p
  .locator(".market")
  .filter({ has: p.getByRole("heading", { name: "Industri", exact: true }) })
  .click();
const material = p
  .locator(".material")
  .filter({
    has: p.getByRole("heading", { name: "Branschpresentation", exact: true }),
  });
await material.getByRole("button", { name: "Starta projekt" }).click();
await material.getByRole("button", { name: "Projekt planerat" }).click();
assert.equal((await read()).plan.project, null);
await material.getByRole("button", { name: "Starta projekt" }).click();
await turn();
assert.equal((await read()).materials.length, 1);
assert.ok((await read()).materials[0].progress > 0);
await nav("Ekonomi");
await p.getByRole("combobox").first().selectOption("50000");
assert.equal((await read()).plan.credit, 50000);
await turn();
assert.equal((await read()).debt, 50000);
for (const width of [1440, 768, 390]) {
  await p.setViewportSize({ width, height: 1000 });
  for (const n of [
    "Översikt",
    "Personal",
    "Försäljning",
    "Uppdrag",
    "Marknad",
    "Ekonomi",
  ]) {
    await nav(n);
    assert.equal(
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      `${n} @ ${width}`,
    );
  }
  await nav("Översikt");
  await p.screenshot({
    path: `/tmp/konsult-shots/final-${width}.png`,
    fullPage: true,
  });
}
assert.deepEqual(errs, []);
console.log(
  "PASS: reversible plans, assessment, market targeting and project progress, credit, final desktop/tablet/mobile layout.",
);
await b.close();
