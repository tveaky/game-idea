import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:5173");
await page.getByLabel("Spellängd").selectOption("120");
await page.getByRole("button", { name: "Starta mitt bolag" }).click();
assert.equal(
  await page.evaluate(
    () => JSON.parse(localStorage.getItem("konsultbolaget-v1")).campaignMonths,
  ),
  120,
);
// Seed a live two-person scenario; all staffing changes below use actual game controls.
await page.evaluate(async () => {
  const { newGame, emptyAllocation } = await import("/src/game/engine.ts");
  const g = newGame("Teamtest", "Systemutveckling", 42);
  g.tutorial = 3;
  g.people[0].allocation = { ...emptyAllocation(), delivery: 1 };
  g.people.push({
    ...structuredClone(g.people[0]),
    id: "c0",
    name: "Maja Lind",
    role: "consultant",
    salary: 52000,
  });
  g.deals[0] = {
    ...g.deals[0],
    customer: "Teamuppdrag",
    stage: 5,
    start: 1,
    scope: 1,
    rate: 1200,
    price: 1,
    remaining: 6,
    paymentTerms: 1,
    assignments: [],
  };
  g.deals[1] = {
    ...structuredClone(g.deals[0]),
    id: "shared",
    customer: "Delat uppdrag",
    scope: 0.5,
  };
  g.seed = 42;
  localStorage.setItem("konsultbolaget-v1", JSON.stringify(g));
});
await page.reload();
const nav = async (n) =>
  page.locator("nav").getByRole("button", { name: n, exact: false }).click();
const read = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("konsultbolaget-v1")));
await nav("Uppdrag");
await page
  .getByRole("combobox", { name: "Teamuppdrag: Du · grundare bemanning" })
  .selectOption("50");
await page
  .getByRole("combobox", { name: "Teamuppdrag: Maja Lind bemanning" })
  .selectOption("50");
await page
  .getByRole("combobox", { name: "Delat uppdrag: Du · grundare bemanning" })
  .selectOption("50");
assert.equal((await read()).deals[0].assignments.length, 2);
assert.equal((await read()).deals[1].assignments[0].fraction, 0.5);
assert.equal(
  await page
    .getByRole("combobox", { name: "Delat uppdrag: Du · grundare bemanning" })
    .locator('option[value="100"]')
    .evaluate((el) => el.disabled),
  true,
);
await page
  .getByRole("combobox", { name: "Teamuppdrag: Maja Lind bemanning" })
  .selectOption("33");
assert.equal(
  (await read()).deals[0].assignments.find((a) => a.personId === "c0").fraction,
  0.33,
);
await page
  .getByRole("combobox", { name: "Teamuppdrag: Maja Lind bemanning" })
  .selectOption("50");
await page.screenshot({
  path: "/tmp/konsult-shots/team-staffing-desktop.png",
  fullPage: true,
});
await nav("Ekonomi");
assert.ok(
  await page
    .locator(".main")
    .innerText()
    .then((t) => t.includes("288")),
);
await page.getByRole("button", { name: "Nästa månad", exact: true }).click();
await page.getByRole("button", { name: "Genomför månad" }).click();
await page.getByRole("button", { name: "Tillbaka till bolaget" }).click();
assert.equal((await read()).history[0].revenue, 288000);
const saved = await read();
await page.reload();
assert.deepEqual(await read(), saved);
await page.setViewportSize({ width: 390, height: 844 });
await nav("Uppdrag");
assert.equal(
  await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  false,
);
await page.screenshot({
  path: "/tmp/konsult-shots/team-staffing-mobile.png",
  fullPage: true,
});
// A v1 browser save upgrades in place, including its old single-person assignment.
await page.evaluate(async () => {
  const { newGame, emptyAllocation } = await import("/src/game/engine.ts");
  const g = newGame("Äldre bolag", "Data/AI", 89);
  g.tutorial = 3;
  g.people[0].allocation = { ...emptyAllocation(), delivery: 1 };
  g.deals[0].stage = 5;
  g.deals[0].start = 1;
  g.deals[0].scope = 1;
  g.deals[0].remaining = 6;
  g.version = 1;
  delete g.campaignMonths;
  g.deals = g.deals.map((d, i) => {
    const { assignments, ...rest } = d;
    return { ...rest, assigned: i === 0 ? "founder" : "" };
  });
  localStorage.setItem("konsultbolaget-v1", JSON.stringify(g));
});
await page.reload();
await page.getByRole("heading", { name: "Översikt", exact: true }).waitFor();
const migrated = await read();
assert.equal(migrated.version, 2);
assert.equal(migrated.campaignMonths, 60);
assert.deepEqual(migrated.deals[0].assignments, [
  { personId: "founder", fraction: 1 },
]);
assert.deepEqual(errors, []);
console.log(
  "PASS: chosen horizon, 50/50 staffing, 33% input, shared consultant, capacity limits, 288000 SEK actual invoicing, reload, mobile layout and legacy-save migration.",
);
await browser.close();
