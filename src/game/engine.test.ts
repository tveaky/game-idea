import { describe, it, expect } from "vitest";
import {
  newGame,
  advance,
  assign,
  emptyAllocation,
  setAllocation,
  forecast,
} from "./engine";
import { balance, candidates } from "./data";
import { parseSave, serialize } from "./save";
import type { Game } from "./types";
function contracted(): Game {
  const g = newGame();
  const d = g.deals[0];
  d.stage = 5;
  d.start = 1;
  d.remaining = 6;
  d.rate = 1200;
  d.scope = 1;
  d.paymentTerms = 1;
  d.assigned = "founder";
  g.people[0].allocation = { ...emptyAllocation(), delivery: 1 };
  return g;
}
describe("Economy and capacity", () => {
  it("does not turn pipeline into revenue", () => {
    const g = advance(newGame());
    expect(g.history[0].revenue).toBe(0);
    expect(g.invoices).toHaveLength(0);
    expect(g.cash).toBe(
      600000 - balance.founderSalary * 1.42 - balance.overhead,
    );
  });
  it("invoices delivery now and settles only a later month", () => {
    const g = contracted();
    g.seed = 42;
    const n = advance(g);
    expect(n.history[0].revenue).toBe(192000);
    expect(n.cash).toBe(538300);
    expect(n.invoices[0].due).toBe(2);
    const k = advance(n);
    expect(k.cash).toBe(n.cash - 61700 + 192000);
  });
  it("never bills contracts before their start", () => {
    const g = contracted();
    g.deals[0].start = 3;
    const n = advance(g);
    expect(n.history[0].revenue).toBe(0);
    expect(n.deals[0].remaining).toBe(6);
  });
  it("limits allocations and rejects malformed excess capacity", () => {
    const g = newGame();
    const n = setAllocation(g, "founder", "delivery", 1);
    expect(n.people[0].allocation.delivery).toBe(0);
    g.people[0].allocation.delivery = 1;
    expect(() => advance(g)).toThrow("kapacitet");
  });
  it("cannot double-book or double-bill a person", () => {
    const g = contracted();
    g.deals[1] = { ...g.deals[0], id: "second" };
    expect(assign(g, "second", "founder")).toBe(g);
    const n = advance(g);
    expect(n.history[0].revenue).toBeLessThanOrEqual(192000);
    expect(n.history[0].utilization).toBeLessThanOrEqual(1);
  });
  it("does not deliver with a future starter", () => {
    const g = contracted();
    g.people[0].start = 3;
    expect(advance(g).history[0].revenue).toBe(0);
  });
  it("credit is finite and cannot prevent insolvency forever", () => {
    let g = newGame();
    g.cash = 10;
    g.debt = 300000;
    g = advance(g);
    expect(g.bankrupt).toBe(true);
    expect(advance(g)).toBe(g);
  });
  it("forecast excludes pipeline and shows later receivables separately", () => {
    const g = contracted();
    g.invoices.push({ id: "i", customer: "Kund", amount: 100000, due: 2 });
    expect(forecast(g).payments).toBe(0);
    expect(forecast(g).revenue).toBe(192000);
  });
});
describe("Recruitment and materials", () => {
  it("requires assessment and recruitment time", () => {
    const g = newGame();
    g.plan.hires = ["c0"];
    const n = advance(g);
    expect(n.people).toHaveLength(1);
    expect(n.history[0].costs).toBe(61700);
  });
  it("accepted hires begin later and salary starts on their start month", () => {
    const g = newGame();
    g.assessed = ["c0"];
    g.plan.hires = ["c0"];
    g.people[0].allocation = { ...emptyAllocation(), recruitment: 1 };
    g.seed = 1;
    const n = advance(g);
    const hired = n.people.find((p) => p.id === "c0");
    expect(hired).toBeDefined();
    expect(hired!.start).toBe(3);
    expect(n.history[0].costs).toBe(75700);
    expect(advance(n).history[1].costs).toBe(61700);
  });
  it("does not finish projects with money alone or repeatedly pay for the same project", () => {
    const g = newGame();
    g.plan.project = { type: 0, segment: "Industri" };
    g.people[0].allocation = { ...emptyAllocation(), sales: 1 };
    let n = advance(g);
    expect(n.materials[0].progress).toBe(0);
    n.plan.project = { type: 0, segment: "Industri" };
    n = advance(n);
    expect(n.materials).toHaveLength(1);
    expect(n.history[1].costs).toBe(61700);
  });
  it("shares internal project hours rather than counting them twice", () => {
    const g = newGame();
    g.people[0].allocation = {
      ...emptyAllocation(),
      internal: 0.8,
      sales: 0.2,
    };
    g.materials = [
      {
        id: "a",
        type: 0,
        segment: "Industri",
        progress: 0,
        completed: 0,
        approved: true,
      },
      {
        id: "b",
        type: 0,
        segment: "Energi",
        progress: 0,
        completed: 0,
        approved: true,
      },
    ];
    const n = advance(g);
    expect(n.materials.reduce((s, p) => s + p.progress, 0)).toBeCloseTo(0.6);
  });
  it("requires successful delivery before a customer case", () => {
    const g = newGame();
    g.plan.project = { type: 2, segment: "Industri" };
    const n = advance(g);
    expect(n.materials).toHaveLength(0);
  });
  it("does not unlock national markets just by paying", () => {
    const g = newGame();
    g.plan.expansion = true;
    expect(advance(g).national).toBe(false);
  });
});
describe("Expansion time", () => {
  it("reserves internal capacity before advancing material projects", () => {
    const g = newGame();
    g.people[0].allocation = {
      ...emptyAllocation(),
      internal: 0.8,
      sales: 0.2,
    };
    g.markets.Produktbolag = { knowledge: 50, relation: 50, credibility: 50 };
    g.plan.expansion = true;
    g.plan.project = { type: 0, segment: "Produktbolag" };
    const n = advance(g);
    expect(n.national).toBe(true);
    expect(n.materials[0].progress).toBeCloseTo(0.55 * 0.75);
  });
});
describe("Replay and a complete campaign", () => {
  it("preserves state and the next random outcome on save/import", () => {
    const g = advance(newGame("Test", "Data/AI", 934));
    expect(parseSave(serialize(g))).toEqual(g);
    expect(advance(parseSave(serialize(g)))).toEqual(advance(g));
  });
  it("rejects tampering, invalid versions and malformed JSON", () => {
    const g = newGame();
    expect(() => parseSave("{")).toThrow();
    expect(() =>
      parseSave(serialize({ ...g, version: 2 } as unknown as Game)),
    ).toThrow();
    g.people[0].allocation.delivery = 1;
    expect(() => parseSave(serialize(g))).toThrow();
  });
  it("plays 36 months with a founder-led strategy and can continue", () => {
    let g = newGame("Strategitest", "Systemutveckling", 111);
    for (let i = 1; i <= 36; i++) {
      const active = g.deals.find((d) => d.stage === 5 && d.remaining > 0);
      g.people[0].allocation = {
        ...emptyAllocation(),
        delivery: active ? 1 : 0,
        sales: active ? 0 : 1,
      };
      if (active) g = assign(g, active.id, "founder");
      else {
        g.deals.forEach((d) => (d.priority = false));
        const lead = g.deals.find((d) => d.stage < 5);
        if (lead) lead.priority = true;
      }
      g = advance(g);
      expect(g.bankrupt, `month ${i}, cash ${g.cash}`).toBe(false);
      g = parseSave(serialize(g));
    }
    expect(g.month).toBe(37);
    expect(g.history).toHaveLength(36);
    expect(advance(g)).toBe(g);
    g.continued = true;
    expect(advance(g).month).toBe(38);
  });
  it("makes no retroactive revenue when a deal is newly won", () => {
    let g = newGame();
    g.deals[0].stage = 4;
    g.deals[0].priority = true;
    g.people[0].allocation = { ...emptyAllocation(), sales: 1 };
    g.seed = 1;
    g = advance(g);
    expect(g.deals[0].stage).toBe(5);
    expect(g.deals[0].start).toBeGreaterThan(1);
    expect(g.history[0].revenue).toBe(0);
  });
  it("supports all three specializations and reproducible campaigns", () => {
    for (const s of ["Systemutveckling", "Cybersäkerhet", "Data/AI"] as const) {
      expect(advance(newGame("Test", s, 99))).toEqual(
        advance(newGame("Test", s, 99)),
      );
    }
    expect(candidates.filter((c) => c.role === "consultant")).toHaveLength(12);
  });
});
