import { describe, it, expect } from "vitest";
import {
  newGame,
  advance,
  assign,
  emptyAllocation,
  setAllocation,
  forecast,
  setStaffing,
  bookingAvailable,
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
  d.assignments = [{ personId: "founder", fraction: 1 }];
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
    g.deals[1] = { ...g.deals[0], id: "second", assignments: [] };
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
      parseSave(serialize({ ...g, version: 999 } as unknown as Game)),
    ).toThrow();
    g.people[0].allocation.delivery = 1;
    expect(() => parseSave(serialize(g))).toThrow();
  });
  it.each([36, 60])(
    "plays %i months with a founder-led strategy and can continue",
    (months) => {
      let g = newGame("Strategitest", "Systemutveckling", 111, months);
      for (let i = 1; i <= months; i++) {
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
      expect(g.month).toBe(months + 1);
      expect(g.history).toHaveLength(months);
      expect(advance(g)).toBe(g);
      g.continued = true;
      expect(advance(g).month).toBe(months + 2);
    },
  );
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

function teammate(g: Game) {
  g.people.push({
    ...structuredClone(g.people[0]),
    id: "c0",
    name: "Maja Lind",
    role: "consultant",
    salary: 52000,
  });
}
describe("Team staffing", () => {
  it("splits one assignment 50/50 and invoices only actual combined delivery", () => {
    let g = contracted();
    teammate(g);
    g = setStaffing(g, g.deals[0].id, "founder", 0.5);
    g = setStaffing(g, g.deals[0].id, "c0", 0.5);
    expect(g.deals[0].assignments).toHaveLength(2);
    expect(forecast(g).revenue).toBe(192000);
    g.seed = 42;
    expect(advance(g).history[0].revenue).toBe(192000);
  });
  it("allows one person to share 40/60 between two contracts", () => {
    const g = contracted();
    g.deals[0].scope = 0.4;
    g.deals[0].assignments[0].fraction = 0.4;
    g.deals[1] = {
      ...structuredClone(g.deals[0]),
      id: "second",
      scope: 0.6,
      assignments: [],
    };
    const n = setStaffing(g, "second", "founder", 0.6);
    expect(n.deals[1].assignments[0].fraction).toBe(0.6);
    expect(forecast(n).revenue).toBe(192000);
    n.seed = 42;
    expect(advance(n).history[0].revenue).toBe(192000);
  });
  it("clamps overlapping bookings and never plans beyond contract scope", () => {
    const g = contracted();
    teammate(g);
    g.deals[0].assignments[0].fraction = 0.7;
    g.deals[1] = {
      ...structuredClone(g.deals[0]),
      id: "second",
      assignments: [],
    };
    const n = setStaffing(g, "second", "founder", 1);
    expect(n.deals[1].assignments[0].fraction).toBeCloseTo(0.3);
    const k = setStaffing(n, g.deals[0].id, "c0", 1);
    expect(k.deals[0].assignments[1].fraction).toBeCloseTo(0.3);
  });
  it("allows sequential future contracts without counting them as concurrent", () => {
    const g = contracted();
    g.deals[0].remaining = 2;
    g.deals[1] = {
      ...structuredClone(g.deals[0]),
      id: "second",
      start: 3,
      assignments: [],
    };
    expect(bookingAvailable(g, "second", "founder")).toBe(1);
    expect(
      setStaffing(g, "second", "founder", 1).deals[1].assignments[0].fraction,
    ).toBe(1);
  });
  it("supports a two-person full-time contract", () => {
    let g = contracted();
    teammate(g);
    g.deals[0].scope = 2;
    g = setStaffing(g, g.deals[0].id, "c0", 1);
    expect(forecast(g).revenue).toBe(384000);
    g.seed = 42;
    expect(advance(g).history[0].revenue).toBe(384000);
  });
  it("caps delivery by each persons allocated time and ignores future starters", () => {
    let g = contracted();
    teammate(g);
    g.deals[0].scope = 2;
    g = setStaffing(g, g.deals[0].id, "c0", 1);
    g.people[0].allocation = { ...emptyAllocation(), delivery: 0.5 };
    g.people[1].start = 3;
    expect(forecast(g).revenue).toBe(96000);
    g.seed = 42;
    expect(advance(g).history[0].revenue).toBe(96000);
  });
  it("subcontractors fill only the remaining delivery gap", () => {
    const g = contracted();
    g.deals[0].assignments[0].fraction = 0.5;
    g.plan.subcontract = [g.deals[0].id];
    const f = forecast(g);
    expect(f.costs).toBe(61700 + 0.5 * 160 * 820);
    expect(f.revenue).toBe(192000);
    g.seed = 42;
    const n = advance(g);
    expect(n.history[0].costs).toBe(f.costs);
    expect(n.history[0].revenue).toBe(f.revenue);
  });
  it("updates happiness once for total workload across contracts", () => {
    const g = contracted();
    g.deals[0].scope = 0.5;
    g.deals[0].assignments[0].fraction = 0.5;
    g.deals[1] = { ...structuredClone(g.deals[0]), id: "second" };
    g.seed = 42;
    expect(advance(g).people[0].happiness).toBe(80);
  });
  it("rejects unknown or duplicate team members and overlapping imported bookings", () => {
    const g = contracted();
    g.deals[0].assignments.push({ personId: "founder", fraction: 0.1 });
    expect(() => parseSave(serialize(g))).toThrow();
    g.deals[0].assignments = [{ personId: "unknown", fraction: 1 }];
    expect(() => parseSave(serialize(g))).toThrow("okänd");
    g.deals[0].assignments = [{ personId: "founder", fraction: 1 }];
    g.deals[1] = { ...structuredClone(g.deals[0]), id: "second" };
    expect(() => parseSave(serialize(g))).toThrow("dubbelbokad");
  });
  it("migrates old saved assignments without changing RNG or earned balances", () => {
    const current = contracted();
    const legacy: any = structuredClone(current);
    legacy.version = 1;
    delete legacy.campaignMonths;
    legacy.deals = legacy.deals.map((d: any) => {
      const { assignments, ...rest } = d;
      return { ...rest, assigned: assignments[0]?.personId || "" };
    });
    const migrated = parseSave(JSON.stringify(legacy));
    expect(migrated.version).toBe(2);
    expect(migrated.campaignMonths).toBe(60);
    expect(migrated.deals[0].assignments).toEqual([
      { personId: "founder", fraction: 1 },
    ]);
    expect(migrated.seed).toBe(current.seed);
    expect(migrated.cash).toBe(current.cash);
    expect(advance(migrated)).toEqual(advance(current));
  });
});
describe("Sales balance and campaign length", () => {
  it("normally signs the warm first deal within 3–5 months with default sales time", () => {
    const timings: number[] = [];
    for (let seed = 1; seed <= 100; seed++) {
      let g = newGame("Balans", "Systemutveckling", seed);
      for (let month = 1; month <= 12; month++) {
        g = advance(g);
        if (g.deals[0].stage === 5) {
          timings.push(month);
          break;
        }
      }
    }
    timings.sort((a, b) => a - b);
    expect(timings.length).toBeGreaterThanOrEqual(95);
    expect(timings[49]).toBeLessThanOrEqual(4);
    expect(timings[89]).toBeLessThanOrEqual(6);
  });
  it("does not advance the warm pipeline without sales effort", () => {
    const g = newGame();
    g.people[0].allocation = emptyAllocation();
    const n = advance(g);
    expect(n.deals[0].stage).toBe(2);
    expect(n.history[0].revenue).toBe(0);
  });
  it("defaults to five years and supports chosen horizons", () => {
    expect(newGame().campaignMonths).toBe(60);
    const g = newGame("Test", "Data/AI", 1, 120);
    g.month = 121;
    expect(advance(g)).toBe(g);
    g.continued = true;
    expect(advance(g).month).toBe(122);
  });
});

describe("Subcontractor utilization", () => {
  it("keeps internal utilization below 100 percent when subcontracting a larger contract", () => {
    const g = contracted();
    g.deals[0].scope = 2;
    g.plan.subcontract = [g.deals[0].id];
    g.seed = 42;
    const n = advance(g);
    expect(n.history[0].revenue).toBe(384000);
    expect(n.history[0].utilization).toBe(1);
    expect(() => parseSave(serialize(n))).not.toThrow();
  });
});

describe("Renewal capacity", () => {
  it("does not renew into already reserved future capacity", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const g = contracted();
      g.seed = seed;
      g.deals[0].remaining = 2;
      g.deals[0].quality = 95;
      g.deals[1] = {
        ...structuredClone(g.deals[0]),
        id: "future",
        start: 3,
        remaining: 6,
      };
      const n = advance(g);
      expect(n.deals[0].remaining).toBe(1);
      expect(() => parseSave(serialize(n))).not.toThrow();
    }
  });
});
