import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://127.0.0.1:5173");
await page.getByRole("button", { name: "Starta mitt bolag" }).click();
await page.getByRole("heading", { name: "Översikt", exact: true }).waitFor();
await page.evaluate(async () => {
  const { newGame } = await import("/src/game/engine.ts");
  const g = newGame("Lind & Partners", "Systemutveckling", 111, 36);
  localStorage.setItem("konsultbolaget-v1", JSON.stringify(g));
});
await page.reload();
await page.getByRole("button", { name: "Stäng introduktion" }).click();
const read = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem("konsultbolaget-v1")));
const nav = async (name) => {
  await page.locator("nav").getByRole("button", { name, exact: false }).click();
};
await fs.mkdir("/tmp/konsult-shots", { recursive: true });
await page.screenshot({
  path: "/tmp/konsult-shots/overview-desktop.png",
  fullPage: true,
});
// Play through real controls, with a founder-led strategy.
for (let month = 1; month <= 36; month++) {
  const g = await read();
  assert.equal(g.month, month);
  assert.equal(g.bankrupt, false);
  const active = g.deals.find((d) => d.stage === 5 && d.remaining > 0);
  await nav("Personal");
  for (const activity of [
    "Leverans",
    "Försäljning",
    "Rekrytering",
    "Utveckling",
    "Utbildning",
  ])
    await page
      .getByRole("slider", { name: `Du · grundare: ${activity}`, exact: true })
      .press("Home");
  await page
    .getByRole("slider", {
      name: `Du · grundare: ${active ? "Leverans" : "Försäljning"}`,
      exact: true,
    })
    .press("End");
  if (active) {
    await nav("Uppdrag");
    const card = page
      .locator(".contract")
      .filter({
        has: page.getByRole("heading", { name: active.customer, exact: true }),
      })
      .first();
    await card
      .getByRole("combobox")
      .first()
      .selectOption(String(Math.min(1, active.scope) * 100));
  } else {
    await nav("Försäljning");
    const state = await read();
    const lead = state.deals.find((d) => d.stage < 5);
    for (const card of await page.locator(".deal").all()) {
      const h = await card.locator("h2").textContent();
      const button = card.getByRole("button");
      if (h === lead?.customer) {
        if ((await button.innerText()) !== "Prioriterad affär")
          await button.click();
      } else if ((await button.innerText()) === "Prioriterad affär")
        await button.click();
    }
  }
  await page.getByRole("button", { name: "Nästa månad", exact: true }).click();
  await page.getByRole("button", { name: "Genomför månad" }).click();
  await page.getByRole("button", { name: "Tillbaka till bolaget" }).click();
  assert.equal((await read()).month, month + 1);
}
assert.equal((await read()).bankrupt, false);
await nav("Översikt");
await page
  .getByRole("heading", { name: "Du har byggt mer än ett bolag." })
  .waitFor();
await page.screenshot({
  path: "/tmp/konsult-shots/campaign-results.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Fortsätt bygga" }).click();
assert.equal((await read()).continued, true);
const saved = await read();
await page.reload();
assert.deepEqual(await read(), saved);
// Import/export replay and invalid file handling.
const downloadPromise = page.waitForEvent("download");
await page.getByRole("button", { name: "Exportera sparfil" }).click();
const download = await downloadPromise;
await download.saveAs("/tmp/konsult-shots/campaign.json");
await page.locator("input[type=file]").setInputFiles({
  name: "bad.json",
  mimeType: "application/json",
  buffer: Buffer.from('{"version":2}'),
});
await page.getByRole("alert").waitFor();
assert.deepEqual(await read(), saved);
await page.locator(".toast button").click();
await page
  .locator("input[type=file]")
  .setInputFiles("/tmp/konsult-shots/campaign.json");
assert.deepEqual(await read(), saved);
// Restart, inspect all views and responsive overflow.
await page.getByRole("button", { name: "Ny spelomgång", exact: true }).click();
await page
  .getByRole("dialog")
  .getByRole("button", { name: "Ny spelomgång" })
  .click();
await page.getByRole("button", { name: "Starta mitt bolag" }).click();
await page.getByRole("button", { name: "Stäng introduktion" }).click();
for (const width of [1440, 768, 390]) {
  await page.setViewportSize({ width, height: 1000 });
  for (const name of [
    "Översikt",
    "Personal",
    "Försäljning",
    "Uppdrag",
    "Marknad",
    "Ekonomi",
  ]) {
    await nav(name);
    await page.getByRole("heading", { name, exact: true }).waitFor();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    assert.equal(overflow, false, `${name} overflows at ${width}`);
  }
  await nav("Översikt");
  await page.screenshot({
    path: `/tmp/konsult-shots/overview-${width}.png`,
    fullPage: true,
  });
}
assert.deepEqual(errors, []);
console.log(
  "PASS: 36 months via UI, continuation, reload, export/import, invalid import, all six views at 1440/768/390px; no browser errors.",
);
await browser.close();
