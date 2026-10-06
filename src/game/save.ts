import type { Game } from "./types";
import { segments, specialties, candidates } from "./data";
const finite = (x: unknown, min = -1e12, max = 1e12): x is number =>
  typeof x === "number" && Number.isFinite(x) && x >= min && x <= max;
const str = (x: unknown): x is string =>
  typeof x === "string" && x.length <= 500;
const obj = (x: unknown): x is Record<string, any> =>
  !!x && typeof x === "object" && !Array.isArray(x);
const arr = (x: unknown, check: (x: any) => boolean, max = 2000): boolean =>
  Array.isArray(x) && x.length <= max && x.every(check);
const choice = (x: unknown, values: readonly unknown[]) => values.includes(x);
const alloc = (a: any) =>
  obj(a) &&
  ["delivery", "sales", "recruitment", "internal", "training"].every((k) =>
    finite(a[k], 0, 1),
  ) &&
  Object.values(a).every((v) => finite(v, 0, 1)) &&
  Object.values(a).reduce<number>((s, v) => s + Number(v), 0) <= 1.000001;
export function parseSave(text: string): Game {
  if (text.length > 2e6) throw new Error("Sparfilen är för stor.");
  let g: any;
  try {
    g = JSON.parse(text);
  } catch {
    throw new Error("Filen innehåller inte giltig JSON.");
  }
  // Keep the storage key so existing browser saves are upgraded in place.
  if (obj(g) && g.version === 1) {
    if (
      !arr(g.deals, (d) => obj(d) && str(d.assigned) && finite(d.scope, 0.1, 1))
    )
      throw new Error("Den äldre sparfilens bemanning är ogiltig.");
    g.deals = g.deals.map((d: any) => {
      const { assigned, ...rest } = d;
      return {
        ...rest,
        assignments: assigned
          ? [{ personId: assigned, fraction: d.scope }]
          : [],
      };
    });
    g.version = 2;
    g.campaignMonths = 60;
  }
  const id = (x: unknown) => str(x) && x.length > 0;
  const candidate = (x: any) => candidates.some((c) => c.id === x);
  const person = (p: any) =>
    obj(p) &&
    id(p.id) &&
    str(p.name) &&
    choice(p.specialty, specialties) &&
    finite(p.experience, 0, 6) &&
    finite(p.salary, 0, 1e6) &&
    finite(p.happiness, 0, 100) &&
    finite(p.sellability, 0, 1) &&
    Number.isInteger(p.start) &&
    p.start >= 1 &&
    finite(p.notice, 0, 1000) &&
    choice(p.role, ["founder", "consultant", "seller"]) &&
    alloc(p.allocation);
  const deal = (d: any) =>
    obj(d) &&
    id(d.id) &&
    str(d.customer) &&
    choice(d.segment, segments) &&
    choice(d.specialty, specialties) &&
    Number.isInteger(d.stage) &&
    finite(d.stage, 0, 7) &&
    finite(d.rate, 100, 10000) &&
    finite(d.scope, 0.1, 3) &&
    Number.isInteger(d.duration) &&
    finite(d.duration, 1, 100) &&
    Number.isInteger(d.start) &&
    d.start >= 1 &&
    Number.isInteger(d.decision) &&
    d.decision >= 1 &&
    finite(d.relation, 0, 100) &&
    finite(d.competition, 0, 1) &&
    typeof d.priority === "boolean" &&
    finite(d.price, 0.85, 1.15) &&
    arr(
      d.assignments,
      (a: any) => obj(a) && id(a.personId) && finite(a.fraction, 0.0001, 1),
      30,
    ) &&
    new Set(d.assignments.map((a: any) => a.personId)).size ===
      d.assignments.length &&
    d.assignments.reduce((sum: number, a: any) => sum + a.fraction, 0) <=
      d.scope + 0.000001 &&
    finite(d.quality, 0, 100) &&
    Number.isInteger(d.remaining) &&
    finite(d.remaining, 0, 1000) &&
    finite(d.postponed, 0, 10000) &&
    choice(d.paymentTerms, [1, 2]);
  const material = (p: any) =>
    obj(p) &&
    id(p.id) &&
    Number.isInteger(p.type) &&
    finite(p.type, 0, 4) &&
    choice(p.segment, segments) &&
    finite(p.progress, 0, 10) &&
    finite(p.completed, 0, 10000) &&
    typeof p.approved === "boolean";
  const invoice = (i: any) =>
    obj(i) &&
    id(i.id) &&
    str(i.customer) &&
    finite(i.amount, 0, 1e9) &&
    Number.isInteger(i.due) &&
    i.due >= 1;
  const history = (h: any) =>
    obj(h) &&
    Number.isInteger(h.month) &&
    h.month >= 1 &&
    ["revenue", "costs", "profit", "cash"].every((k) => finite(h[k])) &&
    finite(h.utilization, 0, 1) &&
    finite(h.happiness, 0, 100);
  const plan = (p: any) =>
    obj(p) &&
    arr(p.hires, candidate, 14) &&
    new Set(p.hires).size === p.hires.length &&
    arr(p.assess, candidate, 14) &&
    new Set(p.assess).size === p.assess.length &&
    typeof p.search === "boolean" &&
    (p.project === null ||
      (obj(p.project) &&
        Number.isInteger(p.project.type) &&
        finite(p.project.type, 0, 4) &&
        choice(p.project.segment, segments))) &&
    finite(p.credit, 0, 300000) &&
    finite(p.repay, 0, 300000) &&
    typeof p.expansion === "boolean" &&
    arr(p.subcontract, str) &&
    choice(p.salesFocus, ["new", "existing"]) &&
    choice(p.target, segments);
  if (
    !obj(g) ||
    g.version !== 2 ||
    !choice(g.campaignMonths, [36, 60, 120]) ||
    !str(g.name) ||
    !choice(g.specialty, specialties) ||
    !Number.isInteger(g.month) ||
    !finite(g.month, 1, 10000) ||
    !Number.isInteger(g.seed) ||
    !finite(g.seed, 0, 4294967295) ||
    !finite(g.cash) ||
    !finite(g.debt, 0, 300000) ||
    !arr(g.people, person, 30) ||
    g.people.length === 0 ||
    !arr(g.candidates, candidate, 14) ||
    !arr(g.assessed, candidate, 14) ||
    !arr(g.deals, deal) ||
    !arr(g.invoices, invoice) ||
    !arr(g.materials, material, 15) ||
    !obj(g.markets) ||
    !segments.every(
      (s) =>
        obj(g.markets[s]) &&
        ["knowledge", "relation", "credibility"].every((k) =>
          finite(g.markets[s][k], 0, 100),
        ),
    ) ||
    !arr(g.history, history, 10000) ||
    !arr(g.log, str, 200) ||
    !plan(g.plan) ||
    !["national", "bankrupt", "continued"].every(
      (k) => typeof g[k] === "boolean",
    ) ||
    !Number.isInteger(g.tutorial) ||
    !finite(g.tutorial, 0, 3)
  )
    throw new Error("Sparfilen har fel version eller ogiltiga spelvärden.");
  for (const list of [g.people, g.deals, g.invoices, g.materials])
    if (new Set(list.map((x: any) => x.id)).size !== list.length)
      throw new Error("Sparfilen innehåller dubbla identiteter.");
  if (
    g.deals.some((d: any) =>
      d.assignments.some(
        (a: any) =>
          !g.people.some(
            (p: any) => p.id === a.personId && p.role !== "seller",
          ),
      ),
    )
  )
    throw new Error("Sparfilen har en okänd konsult.");
  if (
    g.history.length !== g.month - 1 ||
    g.history.some((h: any, i: number) => h.month !== i + 1)
  )
    throw new Error("Månadshistoriken är inkonsekvent.");
  for (const p of g.people) {
    const bookings = g.deals.filter(
      (d: any) =>
        d.stage === 5 &&
        d.remaining > 0 &&
        d.assignments.some((a: any) => a.personId === p.id),
    );
    const months = new Set<number>();
    bookings.forEach((d: any) => {
      const from = Math.max(g.month, d.start);
      months.add(from);
    });
    for (const month of months) {
      const sum = bookings
        .filter(
          (d: any) =>
            month >= Math.max(g.month, d.start) &&
            month < Math.max(g.month, d.start) + d.remaining,
        )
        .reduce(
          (sum: number, d: any) =>
            sum + d.assignments.find((a: any) => a.personId === p.id).fraction,
          0,
        );
      if (sum > 1.000001)
        throw new Error("En konsult är dubbelbokad över 100 % i sparfilen.");
    }
  }
  return g as Game;
}
export const serialize = (g: Game) => JSON.stringify(g);
export const STORAGE_KEY = "konsultbolaget-v1";
