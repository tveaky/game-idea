import {
  balance as B,
  candidates,
  customers,
  materialTypes,
  segments,
  specialties,
} from "./data";
import type {
  Allocation,
  Deal,
  Game,
  Person,
  Plan,
  Segment,
  Specialty,
} from "./types";
export const emptyAllocation = (): Allocation => ({
  delivery: 0,
  sales: 0,
  recruitment: 0,
  internal: 0,
  training: 0,
});
export const emptyPlan = (): Plan => ({
  hires: [],
  assess: [],
  search: false,
  project: null,
  credit: 0,
  repay: 0,
  expansion: false,
  subcontract: [],
  salesFocus: "new",
  target: "Produktbolag",
});
export function random(g: Game) {
  g.seed = (Math.imul(1664525, g.seed) + 1013904223) >>> 0;
  return g.seed / 4294967296;
}
function addDeal(g: Game, segment?: Segment) {
  const pool = customers.filter((c) => !segment || c.segment === segment);
  const c = pool[Math.floor(random(g) * pool.length)];
  const specialty =
    random(g) < 0.65 ? g.specialty : specialties[Math.floor(random(g) * 3)];
  const d: Deal = {
    id: `d${g.month}-${Math.floor(random(g) * 1e9)}`,
    customer: c.name,
    segment: c.segment,
    specialty,
    stage: 0,
    rate: 1050 + Math.floor(random(g) * 5) * 75,
    scope: random(g) < 0.25 ? 0.5 : 1,
    duration: 4 + Math.floor(random(g) * 6),
    start: g.month + 2,
    decision: g.month + 2 + Math.floor(random(g) * 3),
    relation: 20,
    competition: 0.2 + random(g) * 0.4,
    priority: false,
    price: 1,
    assigned: "",
    quality: 75,
    remaining: 0,
    postponed: 0,
    paymentTerms: random(g) < 0.3 ? 2 : 1,
  };
  g.deals.push(d);
  return d;
}
export function newGame(
  name = "Lind & Partners",
  specialty: Specialty = "Systemutveckling",
  seed = 42,
): Game {
  const g: Game = {
    version: 1,
    name: name.trim().slice(0, 60) || "Lind & Partners",
    specialty,
    month: 1,
    seed: seed >>> 0,
    cash: B.startCash,
    debt: 0,
    people: [
      {
        id: "founder",
        name: "Du · grundare",
        specialty,
        experience: 4,
        salary: B.founderSalary,
        happiness: 85,
        sellability: 0.8,
        start: 1,
        role: "founder",
        notice: 0,
        allocation: {
          delivery: 0,
          sales: 0.5,
          recruitment: 0.25,
          internal: 0.25,
          training: 0,
        },
      },
    ],
    candidates: ["c0", "c1", "c2", "s0"],
    assessed: [],
    deals: [],
    invoices: [],
    materials: [],
    markets: {
      Industri: { knowledge: 15, relation: 15, credibility: 10 },
      Energi: { knowledge: 5, relation: 5, credibility: 5 },
      Produktbolag: { knowledge: 25, relation: 25, credibility: 15 },
    },
    national: false,
    history: [],
    log: ["Välkommen! Två kontakter, en idé och 600 000 kr. Nu börjar det."],
    bankrupt: false,
    continued: false,
    tutorial: 0,
    plan: emptyPlan(),
  };
  addDeal(g, "Produktbolag");
  addDeal(g, "Industri");
  g.deals.forEach((d) => {
    d.specialty = specialty;
  });
  return g;
}
export const activePeople = (g: Game) =>
  g.people.filter((p) => p.start <= g.month);
export const totalAllocation = (p: Person) =>
  Object.values(p.allocation).reduce((a, b) => a + b, 0);
export function setAllocation(
  g: Game,
  id: string,
  key: keyof Allocation,
  value: number,
): Game {
  const next = structuredClone(g);
  const p = next.people.find((p) => p.id === id);
  if (!p) return g;
  const other = totalAllocation(p) - p.allocation[key];
  p.allocation[key] = Math.min(Math.max(0, value), Math.max(0, 1 - other));
  return next;
}
export function forecast(g: Game) {
  const costs =
    g.people
      .filter((p) => p.start <= g.month)
      .reduce((s, p) => s + p.salary * B.employerFactor, 0) +
    B.overhead +
    g.debt * B.interest +
    (g.plan.search ? B.searchCost : 0) +
    g.plan.hires.length * B.hireCost +
    (g.plan.project ? materialTypes[g.plan.project.type].cost : 0) +
    (g.plan.expansion ? B.nationalCost : 0);
  const revenue = g.deals
    .filter((d) => d.stage === 5 && d.start <= g.month && d.remaining > 0)
    .reduce((s, d) => {
      const p = g.people.find((p) => p.id === d.assigned && p.start <= g.month);
      return (
        s +
        (p
          ? Math.min(d.scope, p.allocation.delivery) *
            B.hours *
            d.rate *
            d.price
          : g.plan.subcontract.includes(d.id)
            ? d.scope * B.hours * d.rate * d.price
            : 0)
      );
    }, 0);
  const sub = g.deals
    .filter(
      (d) =>
        d.stage === 5 &&
        d.start <= g.month &&
        g.plan.subcontract.includes(d.id),
    )
    .reduce((s, d) => s + d.scope * B.hours * B.subcontractRate, 0);
  const payments = g.invoices
    .filter((i) => i.due <= g.month)
    .reduce((s, i) => s + i.amount, 0);
  return {
    costs: costs + sub,
    revenue,
    profit: revenue - costs - sub,
    payments,
    cash: g.cash + payments - costs - sub + g.plan.credit - g.plan.repay,
    pipeline: g.deals
      .filter((d) => d.stage < 5)
      .reduce((s, d) => s + d.rate * d.price * B.hours * d.scope, 0),
  };
}
export function assign(g: Game, dealId: string, personId: string): Game {
  const n = structuredClone(g);
  const d = n.deals.find((d) => d.id === dealId);
  if (!d) return g;
  if (
    personId &&
    n.deals.some(
      (x) =>
        x.id !== d.id &&
        x.stage === 5 &&
        x.remaining > 0 &&
        x.assigned === personId,
    )
  )
    return g;
  d.assigned = personId;
  return n;
}
export function advance(input: Game): Game {
  if (input.bankrupt || (input.month > 36 && !input.continued)) return input;
  const g = structuredClone(input);
  const log: string[] = [];
  const m = g.month;
  const plan = g.plan;
  if (
    g.people.some(
      (p) =>
        totalAllocation(p) > 1.00001 ||
        Object.values(p.allocation).some((x) => x < 0),
    )
  )
    throw new Error("Ogiltig kapacitet");
  const staff = activePeople(g);
  const time = (key: keyof Allocation) =>
    staff.reduce((s, p) => s + p.allocation[key], 0);
  const sales = staff.reduce(
    (s, p) =>
      s +
      ((p.allocation.sales * p.sellability) / 0.8) *
        (p.role === "seller" && m === p.start ? 0.4 : 1),
    0,
  );
  const technical = staff
    .filter((p) => p.role !== "seller")
    .reduce((s, p) => s + p.allocation.internal + p.allocation.sales * 0.4, 0);
  const recruit = time("recruitment");
  let costs =
    staff.reduce((s, p) => s + p.salary * B.employerFactor, 0) +
    B.overhead +
    g.debt * B.interest;
  let revenue = 0;
  let delivered = 0;
  // Financing and recruitment: accepted offers start in future months, never this month.
  const credit = Math.max(0, Math.min(plan.credit, B.creditLimit - g.debt));
  g.debt += credit;
  g.cash += credit;
  const repayment = Math.max(
    0,
    Math.min(plan.repay, g.debt, Math.max(0, g.cash - costs)),
  );
  g.debt -= repayment;
  g.cash -= repayment;
  if (plan.search && recruit >= 0.2) {
    costs += B.searchCost;
    const pool = candidates.filter(
      (c) =>
        !g.candidates.includes(c.id) && !g.people.some((p) => p.id === c.id),
    );
    pool.slice(0, 3).forEach((c) => g.candidates.push(c.id));
    log.push(
      "Kandidatsökningen gav nya profiler. Bedöm dem innan du lämnar erbjudande.",
    );
  }
  const assessed = plan.assess.slice(0, Math.floor(recruit / 0.1));
  assessed.forEach((id) => {
    if (g.candidates.includes(id) && !g.assessed.includes(id))
      g.assessed.push(id);
  });
  let hireBudget = Math.floor(
    Math.max(0, recruit - assessed.length * 0.1 - (plan.search ? 0.2 : 0)) /
      0.2,
  );
  for (const id of plan.hires) {
    const c = candidates.find((c) => c.id === id);
    if (
      !c ||
      !g.assessed.includes(id) ||
      g.people.some((p) => p.id === id) ||
      hireBudget-- <= 0
    ) {
      log.push(
        "Ett erbjudande kunde inte skickas: bedömning eller rekryteringstid saknades.",
      );
      continue;
    }
    costs += B.hireCost;
    if (random(g) < 0.78) {
      g.people.push({
        ...c,
        happiness: 85,
        start: m + c.delay,
        notice: 0,
        allocation: {
          ...emptyAllocation(),
          sales: c.role === "seller" ? 0.75 : 0,
          internal: c.role === "seller" ? 0.25 : 0,
          training: c.role === "seller" ? 0 : 0.25,
          delivery: c.role === "seller" ? 0 : 0.75,
        },
      });
      g.candidates = g.candidates.filter((x) => x !== id);
      log.push(`${c.name} tackade ja och börjar månad ${m + c.delay}.`);
    } else
      log.push(`Rekryteringskonkurrens: ${c.name} valde ett annat erbjudande.`);
  }
  // Delivery consumes only allocated capacity, with mentorship taking senior delivery time.
  const used = new Map<string, number>();
  const mentors = new Map<string, number>();
  for (const p of staff.filter(
    (p) => p.experience < 2 && p.role === "consultant",
  )) {
    const mentor = staff.find(
      (s) =>
        s.experience >= 3 &&
        s.specialty === p.specialty &&
        s.allocation.delivery > 0.1,
    );
    if (mentor) {
      mentors.set(mentor.id, (mentors.get(mentor.id) || 0) + 0.1);
      if (p.allocation.training > 0) {
        p.experience = Math.min(5, p.experience + 0.1);
        log.push(
          `Mentorskap lönar sig: ${p.name} utvecklas med stöd från ${mentor.name}.`,
        );
      }
    }
  }
  for (const d of g.deals.filter(
    (d) => d.stage === 5 && d.start <= m && d.remaining > 0,
  )) {
    const p = staff.find((p) => p.id === d.assigned && p.role !== "seller");
    let capacity = 0;
    let quality = 35;
    if (p) {
      capacity = Math.min(
        d.scope,
        Math.max(
          0,
          p.allocation.delivery -
            (used.get(p.id) || 0) -
            (mentors.get(p.id) || 0),
        ),
      );
      used.set(p.id, (used.get(p.id) || 0) + capacity);
      quality =
        (p.specialty === d.specialty ? 85 : 48) +
        (p.experience - 3) * 4 -
        (p.happiness < 50 ? 15 : 0);
      if (
        p.experience < 2 &&
        !staff.some(
          (s) =>
            s.experience >= 3 &&
            s.specialty === p.specialty &&
            s.allocation.delivery > 0.1,
        )
      )
        quality -= 20;
      if (random(g) < 0.045) {
        capacity *= 0.6;
        log.push(
          `Sjukfrånvaro: ${p.name} levererade färre timmar hos ${d.customer}.`,
        );
      }
      p.happiness = Math.max(
        0,
        Math.min(
          100,
          p.happiness +
            (capacity < 0.9 ? 1 : -3) -
            (p.specialty !== d.specialty ? 5 : 0),
        ),
      );
    } else if (plan.subcontract.includes(d.id)) {
      if (random(g) < 0.85) {
        capacity = d.scope;
        quality = 74;
        costs += capacity * B.hours * B.subcontractRate;
        log.push(`Underkonsult bemannade ${d.customer}, med lägre marginal.`);
      } else log.push(`Underkonsult saknades för ${d.customer}.`);
    }
    const invoice = capacity * B.hours * d.rate * d.price;
    revenue += invoice;
    delivered += capacity;
    if (invoice > 0)
      g.invoices.push({
        id: `i${m}-${d.id}`,
        customer: d.customer,
        amount: invoice,
        due: m + d.paymentTerms,
      });
    d.quality = Math.max(
      0,
      Math.min(
        100,
        d.quality * 0.6 + quality * 0.4 - (capacity < d.scope * 0.8 ? 20 : 0),
      ),
    );
    d.remaining--;
    g.markets[d.segment].credibility = Math.max(
      0,
      Math.min(
        100,
        g.markets[d.segment].credibility + (d.quality > 75 ? 3 : -2),
      ),
    );
    if (d.quality < 45) {
      log.push(
        `Leveransrisk hos ${d.customer}: kvalitet ${Math.round(d.quality)} %. Se över bemanning och kompetens.`,
      );
      if (d.quality < 25) {
        d.remaining = 0;
        d.stage = 6;
        log.push(
          `Avslutat uppdrag: ${d.customer} avslutade efter återkommande leveransproblem.`,
        );
      }
    }
    if (d.remaining === 1 && d.quality > 75 && random(g) < 0.35) {
      d.remaining += 3;
      log.push(`Förlängning: ${d.customer} förlängde med tre månader.`);
    }
    if (d.remaining === 0 && d.stage === 5) {
      d.stage = 7;
      log.push(`Uppdraget hos ${d.customer} avslutades enligt plan.`);
      if (d.quality > 75 && random(g) < 0.5) {
        addDeal(g, d.segment);
        log.push("Rekommendation: en nöjd kund öppnade en ny dörr.");
      }
    }
    if (d.quality > 85 && d.scope < 1 && random(g) < 0.12) {
      d.scope = 1;
      log.push(
        `Utökat uppdrag: ${d.customer} vill öka omfattningen nästa månad.`,
      );
    }
  }
  // Costs and cash are separate from earned revenue; receivables settle on their due month.
  g.cash -= costs;
  let payments = 0;
  g.invoices = g.invoices.filter((i) => {
    if (i.due > m) return true;
    if (random(g) < 0.07) {
      i.due++;
      log.push(
        `Försenad betalning från ${i.customer}. Fordran flyttas till nästa månad.`,
      );
      return true;
    }
    payments += i.amount;
    return false;
  });
  g.cash += payments;
  // Market work and materials require human time and appropriate knowledge, never just a purchase.
  const market = g.markets[plan.target];
  const canExpand =
    plan.expansion &&
    !g.national &&
    market.knowledge >= 40 &&
    market.relation >= 30 &&
    market.credibility >= 20 &&
    time("internal") >= 0.25;
  // Expansion has its own time cost, leaving a smaller budget for other internal work.
  const internalBudget = Math.max(0, time("internal") - (canExpand ? 0.25 : 0));
  const hasProject = g.materials.some((p) => !p.completed) || !!plan.project;
  const marketTime = internalBudget * (hasProject ? 0.25 : 1);
  market.knowledge = Math.min(100, market.knowledge + marketTime * 14);
  market.relation = Math.min(100, market.relation + sales * 5);
  if (
    plan.project &&
    !g.materials.some(
      (p) =>
        p.type === plan.project!.type && p.segment === plan.project!.segment,
    )
  ) {
    const { type, segment } = plan.project;
    const successful = g.deals.some(
      (d) =>
        d.segment === segment &&
        d.quality > 75 &&
        (d.stage === 5 || d.stage === 7) &&
        d.start < m,
    );
    if (type !== 2 || successful) {
      const cost = materialTypes[type].cost;
      g.cash -= cost;
      costs += cost;
      g.materials.push({
        id: `mat${m}`,
        type,
        segment,
        progress: 0,
        completed: 0,
        approved: type !== 2,
      });
    } else log.push("Kundcase kräver först en lyckad leverans.");
  }
  const projects = g.materials.filter((p) => !p.completed);
  for (const project of projects) {
    const info = materialTypes[project.type];
    let work = (internalBudget * 0.75) / Math.max(1, projects.length);
    if (project.type === 0 && sales < 0.1) work = 0;
    if ([1, 3, 4].includes(project.type) && technical < 0.2) work = 0;
    if (project.type === 1 && g.markets[project.segment].knowledge < 25)
      work = 0;
    if (project.type === 2 && !project.approved) {
      project.approved = random(g) < 0.65;
      if (!project.approved) {
        log.push("Kundcase: kunden har ännu inte godkänt referensen.");
        continue;
      }
      log.push("Kunden ger klartecken till ert kundcase.");
    }
    project.progress = Math.min(info.work, project.progress + work);
    if (project.progress >= info.work) {
      project.completed = m;
      log.push(`${info.name} för ${project.segment} är klart.`);
      if (project.type === 3) {
        for (let i = 0; i < 3; i++) addDeal(g, project.segment);
        log.push(
          "Seminariet gav tre kontakter. Avsätt säljtid för uppföljning.",
        );
      }
    }
  }
  if (plan.expansion && !g.national) {
    if (canExpand) {
      g.national = true;
      g.cash -= B.nationalCost;
      costs += B.nationalCost;
      log.push(
        "Ni etablerade en nationell närvaro. Större affärer blir möjliga.",
      );
    } else
      log.push(
        "Nationell expansion kräver kunskap 40, relation 30, trovärdighet 20 och 25 % utvecklingstid.",
      );
  }
  // Pipeline advances after delivery. Newly signed contracts start no earlier than next month.
  const open = g.deals.filter((d) => d.stage < 5);
  const priorities = open.filter((d) => d.priority);
  const focus = priorities.length ? priorities : open.slice(0, 2);
  for (const d of open) {
    const effort = focus.includes(d) ? sales / Math.max(1, focus.length) : 0;
    const mk = g.markets[d.segment];
    const relevant = g.materials.filter(
      (p) =>
        p.completed &&
        p.segment === d.segment &&
        m - p.completed < 12 &&
        ((d.stage < 2 && p.type === 0) ||
          (d.stage < 3 && p.type === 1) ||
          (d.stage >= 3 && p.type === 2) ||
          (p.type === 4 && g.national)),
    ).length;
    const specialist = staff.some(
      (p) =>
        p.specialty === d.specialty &&
        p.role !== "seller" &&
        p.allocation.sales + p.allocation.internal > 0.1,
    );
    const seller = staff.some(
      (p) => p.role === "seller" && m - p.start >= 1 && p.allocation.sales > 0,
    );
    let chance =
      effort * (0.95 + (specialist ? 0.3 : 0) + (seller ? 0.1 : 0)) +
      (mk.knowledge + mk.credibility) / 500 +
      relevant * 0.08 +
      d.relation / 500 -
      (d.price - 1) * 0.7 -
      d.competition * 0.12;
    chance = Math.min(0.88, Math.max(0.02, chance));
    if (effort > 0) {
      d.relation = Math.min(100, d.relation + effort * 12);
      if (m >= d.decision && random(g) < 0.08) {
        d.decision++;
        d.postponed++;
        log.push(`Försenat kundbeslut hos ${d.customer}.`);
      } else if (random(g) < chance) {
        d.stage++;
        if (d.stage === 5) {
          d.start = Math.max(m + 1, d.start);
          d.remaining = d.duration;
          log.push(
            `Vunnen affär! ${d.customer}, ${Math.round(d.rate * d.price)} kr/tim. Start månad ${d.start}.`,
          );
        } else
          log.push(
            `${d.customer} gick vidare till ${["kontakt", "kvalificering", "behovsdialog", "offert", "förhandling"][d.stage]}.`,
          );
      }
    }
    if (m > d.decision + 5 && random(g) < 0.15) {
      d.stage = 6;
      log.push(
        `${d.customer} valde en annan lösning. Tid, pris och konkurrens avgjorde.`,
      );
    } else if (d.stage === 4 && random(g) < 0.1) {
      d.competition = Math.min(0.9, d.competition + 0.1);
      log.push(
        `Prispress: en konkurrent lämnade ett lägre pris hos ${d.customer}.`,
      );
    }
  }
  for (const p of staff) {
    if (p.allocation.training > 0) {
      p.experience = Math.min(5, p.experience + p.allocation.training * 0.2);
      p.happiness = Math.min(100, p.happiness + 2);
    }
    if (p.role === "founder" && p.allocation.delivery > 0.8) {
      p.happiness = Math.max(0, p.happiness - 2);
      log.push(
        "Trött grundare: mycket leverans lämnar lite utrymme för bolagets framtid.",
      );
    }
    if (p.role === "seller" && m === p.start)
      log.push(
        `${p.name} introduceras: nätverket behöver tid och ett tydligt erbjudande.`,
      );
    if (p.happiness < 40) {
      p.notice++;
      log.push(
        `${p.name} överväger att sluta. Trivsel ${Math.round(p.happiness)} %. Ge utrymme för utveckling.`,
      );
    } else p.notice = 0;
    if (p.notice >= 2 && p.role !== "founder" && random(g) < 0.35) {
      g.people = g.people.filter((x) => x.id !== p.id);
      g.deals
        .filter((d) => d.assigned === p.id)
        .forEach((d) => (d.assigned = ""));
      log.push(
        `Uppsägning: ${p.name} lämnade efter flera månader med låg trivsel.`,
      );
    }
  }
  const freshSales = plan.salesFocus === "new" ? sales : sales * 0.35;
  if (
    open.length < 10 &&
    freshSales > 0.1 &&
    random(g) < Math.min(0.9, freshSales * 0.8)
  ) {
    addDeal(g, plan.target);
    log.push("En ny affärsmöjlighet har kommit in.");
  }
  if (plan.salesFocus === "existing")
    g.deals
      .filter((d) => d.stage === 5)
      .forEach((d) => {
        d.quality = Math.min(100, d.quality + sales * 4);
      });
  if (m % 6 === 0) {
    addDeal(g, plan.target);
    log.push("Marknaden vaknar: ett nytt behov i ert målsegment.");
  }
  if (
    g.national &&
    g.materials.some((p) => p.type === 4 && p.completed) &&
    random(g) < 0.12
  ) {
    const d = addDeal(g, plan.target);
    d.scope = 1;
    d.duration = 12;
    log.push(
      "Ramavtalsdialog: ni får delta i en större upphandling. Ett ramavtal är ingen garanterad intäkt.",
    );
  }
  if (g.materials.some((p) => p.completed && m - p.completed === 12))
    log.push("Materialet åldras: den direkta säljeffekten har upphört.");
  if (time("internal") > 0.4 && delivered === 0)
    log.push(
      "Bänken blir en verkstad: intern tid bygger erbjudande och marknadskunskap.",
    );
  const happiness = g.people.length
    ? g.people.reduce((s, p) => s + p.happiness, 0) / g.people.length
    : 0;
  g.history.push({
    month: m,
    revenue,
    costs,
    profit: revenue - costs,
    cash: g.cash,
    utilization: staff.filter((p) => p.role !== "seller").length
      ? delivered / staff.filter((p) => p.role !== "seller").length
      : 0,
    happiness,
  });
  log.unshift(
    `Månad ${m}: fakturerat ${Math.round(revenue).toLocaleString("sv-SE")} kr, betalt ${Math.round(payments).toLocaleString("sv-SE")} kr. Resultat ${Math.round(revenue - costs).toLocaleString("sv-SE")} kr.`,
  );
  if (g.cash < 0) {
    const rescue = Math.min(-g.cash, B.creditLimit - g.debt);
    g.debt += rescue;
    g.cash += rescue;
    if (rescue > 0)
      log.push(
        `Akut kredit: ${Math.round(rescue)} kr utnyttjades för att betala skyldigheter.`,
      );
    if (g.cash < 0) {
      g.bankrupt = true;
      log.push(
        "Konkurs: tillgänglig kredit räckte inte till månadens skyldigheter.",
      );
    }
  }
  if (g.cash < costs * 2 && !g.bankrupt)
    log.push(
      "Likviditetsvarning: kassan täcker mindre än två månaders kostnader. Planera bemanning, betalningar och kredit.",
    );
  g.log = log;
  g.month++;
  g.plan = emptyPlan();
  g.plan.target = plan.target;
  g.plan.salesFocus = plan.salesFocus;
  return g;
}
