import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  BriefcaseBusiness,
  Users,
  ChartNoAxesCombined,
  Landmark,
  Globe2,
  LayoutDashboard,
  ChevronRight,
  Plus,
  Check,
  Download,
  Upload,
  RotateCcw,
  X,
  Clock3,
  Sparkles,
  CircleHelp,
  Leaf,
  CheckCircle2,
} from "lucide-react";
import type { Game, Segment, Specialty, Activity } from "./game/types";
import {
  activities,
  balance,
  candidates,
  materialTypes,
  segments,
  specialties,
} from "./game/data";
import {
  activePeople,
  advance,
  assignedCapacity,
  bookingAvailable,
  setStaffing,
  forecast,
  newGame,
  setAllocation,
  totalAllocation,
} from "./game/engine";
import { parseSave, serialize, STORAGE_KEY } from "./game/save";
const money = (n: number) =>
  new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(n);
const pct = (n: number) => `${Math.round(n * 100)} %`;
const stages = [
  "Kontakt",
  "Kvalificering",
  "Behovsdialog",
  "Offert",
  "Förhandling",
  "Vunnen",
  "Förlorad",
  "Avslutad",
];
const tabs = [
  { name: "Översikt", icon: LayoutDashboard },
  { name: "Personal", icon: Users },
  { name: "Försäljning", icon: ChartNoAxesCombined },
  { name: "Uppdrag", icon: BriefcaseBusiness },
  { name: "Marknad", icon: Globe2 },
  { name: "Ekonomi", icon: Landmark },
];
function initial() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? parseSave(saved) : null;
  } catch {
    return null;
  }
}
export default function App() {
  const [g, setG] = useState<Game | null>(initial);
  const [tab, setTab] = useState("Översikt");
  const [name, setName] = useState("Lind & Partners");
  const [specialty, setSpecialty] = useState<Specialty>("Systemutveckling");
  const [campaignMonths, setCampaignMonths] = useState(60);
  const [error, setError] = useState("");
  const [report, setReport] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [newConfirm, setNewConfirm] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (g)
      try {
        localStorage.setItem(STORAGE_KEY, serialize(g));
      } catch {
        setError("Det gick inte att spara lokalt. Exportera din spelomgång.");
      }
  }, [g]);
  const update = (fn: (g: Game) => void) =>
    setG((old) => {
      if (!old) return old;
      const n = structuredClone(old);
      fn(n);
      return n;
    });
  const importFile = async (f: File) => {
    try {
      setG(parseSave(await f.text()));
      setError("");
      setReport(false);
      setConfirm(false);
      setTab("Översikt");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const exportFile = () => {
    if (!g) return;
    const url = URL.createObjectURL(
      new Blob([serialize(g)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `konsultbolaget-manad-${g.month}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importInput = (
    <input
      ref={file}
      type="file"
      accept=".json,application/json"
      hidden
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) void importFile(f);
        e.target.value = "";
      }}
    />
  );
  if (!g)
    return (
      <div className="welcome">
        <div className="welcome-top">
          <Logo />
          <span>ETT SPEL OM ATT BYGGA NÅGOT SOM HÅLLER</span>
        </div>
        <main className="welcome-grid">
          <div>
            <div className="eyebrow">DIN IDÉ. DITT BOLAG. DINA BESLUT.</div>
            <h1>
              Från första kaffet
              <br />
              till nästa kapitel<span>.</span>
            </h1>
            <p>
              Starta ett IT-konsultbolag. Hitta människorna, vinn förtroendet
              och få kassan att räcka. Bygg i din egen takt. Inga givna svar.
            </p>
            <div className="welcome-points">
              <span>
                <Users size={20} /> Människor före kalkylblad
              </span>
              <span>
                <ChartNoAxesCombined size={20} /> En riktig månadssimulering
              </span>
              <span>
                <Leaf size={20} /> Tillväxt som håller
              </span>
            </div>
          </div>
          <section className="start-card">
            <span className="eyebrow">KAPITEL 01</span>
            <h2>Vi börjar med ett namn.</h2>
            <label>
              Företagsnamn
              <input
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Vad är ni riktigt bra på?
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value as Specialty)}
              >
                {specialties.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Spellängd
              <select
                value={campaignMonths}
                onChange={(e) => setCampaignMonths(Number(e.target.value))}
              >
                <option value={36}>36 månader · en kortare utmaning</option>
                <option value={60}>
                  60 månader · tid att bygga (standard)
                </option>
                <option value={120}>120 månader · den långa resan</option>
              </select>
            </label>
            <div className="start-budget">
              <span>Din startkassa</span>
              <strong>600 000 kr</strong>
              <small>En grundare · två kontakter · en lokal marknad</small>
            </div>
            <button
              className="primary wide"
              onClick={() =>
                setG(newGame(name, specialty, Date.now() >>> 0, campaignMonths))
              }
            >
              Starta mitt bolag <ArrowRight size={18} />
            </button>
            <button
              className="text-button wide"
              onClick={() => file.current?.click()}
            >
              <Upload size={16} /> Återuppta från sparfil
            </button>
            <small className="muted">
              Sparas automatiskt i din webbläsare. Inget konto behövs.
            </small>
          </section>
        </main>
        {importInput}
        {error && (
          <div className="toast" role="alert">
            {error}
            <button onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}
        <footer>
          Bygg relationer. Ta risker. Kom ihåg att fakturan inte är betald än.
        </footer>
      </div>
    );
  const f = forecast(g);
  const last = g.history.at(-1);
  const staff = activePeople(g);
  const open = g.deals.filter((d) => d.stage < 5);
  const contracts = g.deals.filter((d) => d.stage === 5 && d.remaining > 0);
  const happy =
    staff.reduce((s, p) => s + p.happiness, 0) / Math.max(1, staff.length);
  const pendingCount =
    g.plan.hires.length +
    g.plan.assess.length +
    Number(g.plan.search) +
    Number(!!g.plan.project) +
    Number(g.plan.expansion) +
    Number(g.plan.credit > 0) +
    Number(g.plan.repay > 0);
  const finished = g.bankrupt || (g.month > g.campaignMonths && !g.continued);
  const issues = [
    {
      title:
        f.cash < 0 ? "Kassan behöver en plan" : "Håll ett öga på likviditeten",
      text:
        f.cash < 0
          ? "Prognosen visar underskott. Använd kredit eller minska planerade kostnader."
          : `${money(f.costs)} i planerade kostnader. Kundfordringar är ännu inte pengar i kassan.`,
      tab: "Ekonomi",
    },
    {
      title: contracts.some((d) => assignedCapacity(d) < d.scope - 0.000001)
        ? "Ett uppdrag saknar bemanning"
        : "Nästa affär börjar med ett samtal",
      text: contracts.some((d) => assignedCapacity(d) < d.scope - 0.000001)
        ? "Ett vunnet avtal behöver rätt person innan leveransen börjar."
        : `${open.length} öppna möjligheter. Prioritera och avsätt tid för att ta dem vidare.`,
      tab: contracts.some((d) => assignedCapacity(d) < d.scope - 0.000001)
        ? "Uppdrag"
        : "Försäljning",
    },
    {
      title: staff.some((p) => p.happiness < 45)
        ? "Någon behöver din uppmärksamhet"
        : "Bygg kapacitet i rätt takt",
      text: staff.some((p) => p.happiness < 45)
        ? "Låg trivsel kan leda till uppsägning. Ge tid för utveckling."
        : "Anställning tar tid och kostar även på bänken. Börja med att bedöma en kandidat.",
      tab: "Personal",
    },
  ];
  const headerText: Record<string, string> = {
    Översikt: "Ett litet bolag. Stora möjligheter.",
    Personal: "Bra bolag börjar med människor.",
    Försäljning: "Förtroende före fakturering.",
    Uppdrag: "Det vi lovade. Det vi levererar.",
    Marknad: "Bli relevant på rätt ställe.",
    Ekonomi: "Resultat är en sak. Kassa en annan.",
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <div className="company">
          <div className="company-mark">{g.name.slice(0, 1).toUpperCase()}</div>
          <div>
            <strong>{g.name}</strong>
            <small>{g.specialty}</small>
          </div>
          <span className="live-dot" />
        </div>
        <div className="nav-label">DITT BOLAG</div>
        <nav>
          {tabs.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={tab === name ? "nav active" : "nav"}
              onClick={() => setTab(name)}
            >
              <Icon size={19} />
              {name}
              {name === "Försäljning" && (
                <span className="nav-count">{open.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="chapter">
            <span>DIN RESA</span>
            <strong>
              {Math.min(g.month, g.campaignMonths)} av {g.campaignMonths}{" "}
              månader
            </strong>
            <div className="progress">
              <i
                style={{
                  width: `${Math.min(100, (g.month / g.campaignMonths) * 100)}%`,
                }}
              />
            </div>
            <small>
              {g.national ? "Nationell marknad" : "Lokal marknad"} ·{" "}
              {g.specialty}
            </small>
          </div>
          <button className="nav" onClick={exportFile}>
            <Download size={17} />
            Exportera sparfil
          </button>
          <button className="nav" onClick={() => file.current?.click()}>
            <Upload size={17} />
            Importera sparfil
          </button>
          <button className="nav" onClick={() => setNewConfirm(true)}>
            <RotateCcw size={17} />
            Ny spelomgång
          </button>
          <div className="save-status">
            <CheckCircle2 size={13} /> Sparas automatiskt
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span>
            Konsultbolaget <ChevronRight size={14} /> {tab}
          </span>
          <div className="topbar-right">
            <span className="month-tag">
              <Clock3 size={14} /> Månad {g.month}
            </span>
            <details className="mobile-menu">
              <summary>Sparfil ···</summary>
              <div>
                <button onClick={exportFile}>
                  <Download size={15} />
                  Exportera sparfil
                </button>
                <button onClick={() => file.current?.click()}>
                  <Upload size={15} />
                  Importera sparfil
                </button>
                <button onClick={() => setNewConfirm(true)}>
                  <RotateCcw size={15} />
                  Ny spelomgång
                </button>
              </div>
            </details>
            <button
              className="icon-button"
              aria-label="Visa introduktion"
              onClick={() => update((n) => (n.tutorial = 0))}
            >
              <CircleHelp size={19} />
            </button>
          </div>
        </header>
        <main className="main">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {g.name.toUpperCase()} / MÅNAD {g.month}
              </div>
              <h1>{tab}</h1>
              <p>{headerText[tab]}</p>
            </div>
            <button
              className="primary"
              disabled={finished}
              onClick={() => setConfirm(true)}
            >
              Nästa månad <ArrowRight size={17} />
            </button>
          </div>
          {g.tutorial < 3 && !finished && (
            <div className="tutorial">
              <Sparkles size={22} />
              <div>
                <strong>
                  {
                    [
                      "Välkommen till ditt första styrelsemöte.",
                      "Första affären: tid bygger förtroende.",
                      "Nästa kollega: bedöm före erbjudande.",
                    ][g.tutorial]
                  }
                </strong>
                <p>
                  {
                    [
                      "Du har två möjliga affärer och ingen garanterad intäkt. Fördela din tid och granska prognosen innan du tar nästa steg.",
                      "Öppna Försäljning, prioritera en affär och avsätt säljtid under Personal. En vunnen affär måste bemannas under Uppdrag.",
                      "Avsätt minst 10 % rekryteringstid och planera en bedömning. Efter månadsskiftet kan du lämna erbjudande; då behövs 20 % tid.",
                    ][g.tutorial]
                  }
                </p>
              </div>
              <button
                className="text-button"
                onClick={() => {
                  if (g.tutorial === 0) setTab("Försäljning");
                  if (g.tutorial === 1) setTab("Personal");
                  update((n) => n.tutorial++);
                }}
              >
                {g.tutorial === 2 ? "Jag är redo" : "Visa nästa"}{" "}
                <ArrowRight size={15} />
              </button>
              <button
                className="icon-button"
                aria-label="Stäng introduktion"
                onClick={() => update((n) => (n.tutorial = 3))}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {finished && (
            <section className="result-banner">
              <div className="eyebrow">
                {g.bankrupt
                  ? "SLUT PÅ KASSAN"
                  : `${g.campaignMonths} MÅNADER SENARE`}
              </div>
              <h2>
                {g.bankrupt
                  ? "Ett kapitel stängs. Lärdomarna stannar."
                  : "Du har byggt mer än ett bolag."}
              </h2>
              <p>
                {g.bankrupt
                  ? "Tillgänglig finansiering räckte inte till skyldigheterna. Se ekonomihistoriken för vad som hände."
                  : `Totalt resultat ${money(g.history.reduce((s, h) => s + h.profit, 0))}. ${g.people.length} medarbetare, ${Math.round(happy)} % trivsel och ${money(g.cash - g.debt)} i nettokassa.`}
              </p>
              <div className="result-grid">
                <span>
                  Kundrelationer
                  <strong>
                    {
                      g.deals.filter(
                        (d) => [5, 7].includes(d.stage) && d.quality > 70,
                      ).length
                    }{" "}
                    goda leveranser
                  </strong>
                </span>
                <span>
                  Motståndskraft
                  <strong>
                    {g.cash > f.costs * 3 ? "God buffert" : "Begränsad buffert"}
                  </strong>
                </span>
                <span>
                  Hållbarhet
                  <strong>
                    {happy > 70 ? "Teamet mår bra" : "Trivsel behöver arbete"}
                  </strong>
                </span>
              </div>
              {!g.bankrupt && (
                <button
                  className="primary"
                  onClick={() => update((n) => (n.continued = true))}
                >
                  Fortsätt bygga <ArrowRight size={17} />
                </button>
              )}
            </section>
          )}
          {tab === "Översikt" && (
            <>
              <div className="stats">
                <Stat
                  label="Kassa"
                  value={money(g.cash)}
                  note={`${money(g.invoices.reduce((s, i) => s + i.amount, 0))} i kundfordringar`}
                  icon={<Landmark size={18} />}
                />
                <Stat
                  label="Månadens resultat"
                  value={last ? money(last.profit) : "—"}
                  note={
                    last ? `Efter månad ${last.month}` : "Första månaden väntar"
                  }
                  icon={<ChartNoAxesCombined size={18} />}
                />
                <Stat
                  label="Beläggning"
                  value={last ? pct(last.utilization) : "0 %"}
                  note={`${staff.filter((p) => p.role !== "seller").length} tillgängliga konsulter`}
                  icon={<BriefcaseBusiness size={18} />}
                />
                <Stat
                  label="Trivsel"
                  value={`${Math.round(happy)} %`}
                  note={
                    happy >= 70
                      ? "Bra energi i teamet"
                      : "Ge teamet mer utrymme"
                  }
                  icon={<Leaf size={18} />}
                />
              </div>
              <div className="overview-grid">
                <section className="panel priorities">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">FOKUS JUST NU</span>
                      <h2>Tre saker på ditt bord</h2>
                    </div>
                    <span className="tag">Månad {g.month}</span>
                  </div>
                  {issues.map((item, i) => (
                    <button
                      className="issue"
                      key={item.title}
                      onClick={() => setTab(item.tab)}
                    >
                      <span className={`issue-number n${i}`}>0{i + 1}</span>
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.text}</p>
                      </div>
                      <ArrowUpRight size={20} />
                    </button>
                  ))}
                </section>
                <section className="outlook">
                  <div className="eyebrow">BLICK FRAMÅT</div>
                  <h2>Planen för nästa månad</h2>
                  <p>
                    Det säkra, det planerade och det som fortfarande är en
                    möjlighet.
                  </p>
                  <div className="outlook-row">
                    <span>Kontrakterad leverans*</span>
                    <strong>{money(f.revenue)}</strong>
                  </div>
                  <div className="outlook-row">
                    <span>Planerade kostnader</span>
                    <strong>−{money(f.costs)}</strong>
                  </div>
                  <div className="outlook-row">
                    <span>Förväntade betalningar*</span>
                    <strong>{money(f.payments)}</strong>
                  </div>
                  <div className="outlook-total">
                    <span>Prognos för kassan</span>
                    <strong>{money(f.cash)}</strong>
                  </div>
                  <small>
                    * Leverans beror på bemanning. Betalningar kan försenas.
                    Pipeline ingår inte.
                  </small>
                  <button onClick={() => setTab("Ekonomi")}>
                    Se hela prognosen <ArrowRight size={16} />
                  </button>
                </section>
              </div>
              <div className="overview-grid lower">
                <section className="panel">
                  <div className="section-heading">
                    <h2>Affärer att ta vidare</h2>
                    <button
                      className="text-button"
                      onClick={() => setTab("Försäljning")}
                    >
                      Alla affärer <ArrowRight size={15} />
                    </button>
                  </div>
                  {open.slice(0, 3).map((d) => (
                    <div className="deal-preview" key={d.id}>
                      <div className="avatar customer-avatar">
                        {d.customer.slice(0, 1)}
                      </div>
                      <div>
                        <strong>{d.customer}</strong>
                        <small>
                          {d.specialty} · {d.segment}
                        </small>
                      </div>
                      <span className="tag">{stages[d.stage]}</span>
                      <span className="deal-rate">
                        {money(d.rate * d.price)}
                        <small>per timme</small>
                      </span>
                    </div>
                  ))}
                  {!open.length && (
                    <Empty text="Inga öppna affärer. Avsätt säljtid för nya kontakter." />
                  )}
                </section>
                <section className="panel">
                  <div className="section-heading">
                    <h2>Senaste månadsbriefen</h2>
                    <span className="tag">
                      {last ? `Månad ${last.month}` : "Start"}
                    </span>
                  </div>
                  <div className="brief-list">
                    {g.log.slice(0, 4).map((l, i) => (
                      <p key={i}>
                        <span />
                        {l}
                      </p>
                    ))}
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setReport(true)}
                  >
                    Läs hela rapporten <ArrowRight size={15} />
                  </button>
                </section>
              </div>
              <div className="quote">
                <span>“</span>Det bästa bolaget är inte alltid det största. Det
                är det som håller.
                <Leaf size={19} />
              </div>
            </>
          )}
          {tab === "Personal" && (
            <>
              <div className="section-heading">
                <h2>
                  Ditt team <span className="count">{g.people.length}</span>
                </h2>
                <span className="muted">
                  160 timmar per månad · totalt högst 100 % per person
                </span>
              </div>
              <div className="people-grid">
                {g.people.map((p, i) => (
                  <section className="panel person" key={p.id}>
                    <div className="person-top">
                      <div className={`avatar tone${i % 4}`}>
                        {p.name
                          .split(" ")
                          .slice(0, 2)
                          .map((s) => s[0])
                          .join("")}
                      </div>
                      <div>
                        <h3>{p.name}</h3>
                        <small>
                          {p.role === "seller"
                            ? "Säljare"
                            : p.role === "founder"
                              ? "Grundare"
                              : p.specialty}{" "}
                          · {p.experience >= 3 ? "Senior" : "Junior"}
                        </small>
                      </div>
                      <span className="tag">
                        {p.start > g.month
                          ? `Start m${p.start}`
                          : "Tillgänglig"}
                      </span>
                    </div>
                    <div className="person-meta">
                      <span>
                        {money(p.salary)} / mån
                        <br />
                        <small>+ arbetsgivarkostnad 42 %</small>
                      </span>
                      <span className={p.happiness < 45 ? "danger" : ""}>
                        {Math.round(p.happiness)} % trivsel
                        <br />
                        <small>
                          {p.notice > 0 ? "Risk att lämna" : "Energi i teamet"}
                        </small>
                      </span>
                    </div>
                    {activities.map((a) => (
                      <label className="allocation" key={a.key}>
                        <span>{a.name}</span>
                        <input
                          aria-label={`${p.name}: ${a.name}`}
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          disabled={p.start > g.month || finished}
                          value={Math.round(p.allocation[a.key] * 100)}
                          onChange={(e) =>
                            setG((n) =>
                              n
                                ? setAllocation(
                                    n,
                                    p.id,
                                    a.key as Activity,
                                    Number(e.target.value) / 100,
                                  )
                                : n,
                            )
                          }
                        />
                        <strong>{pct(p.allocation[a.key])}</strong>
                      </label>
                    ))}
                    <div className="allocation-total">
                      Planerad tid{" "}
                      <strong>{pct(totalAllocation(p))} / 100 %</strong>
                    </div>
                    <small>
                      {p.role === "founder" && p.allocation.delivery > 0.75
                        ? "Mycket leverans. Vem bygger nästa affär?"
                        : p.experience < 2
                          ? "Juniorer behöver 10 % av en seniors leveranstid för handledning."
                          : "Intern utveckling stöder marknad och säljmaterial."}
                    </small>
                  </section>
                ))}
              </div>
              <div className="section-heading spaced">
                <div>
                  <h2>Hitta nästa kollega</h2>
                  <p className="muted">
                    Sök → bedöm → erbjud. Ingen börjar samma månad som
                    erbjudandet.
                  </p>
                </div>
                <button
                  className={g.plan.search ? "secondary selected" : "secondary"}
                  disabled={finished}
                  onClick={() =>
                    update((n) => (n.plan.search = !n.plan.search))
                  }
                >
                  {g.plan.search ? <Check size={16} /> : <Plus size={16} />}{" "}
                  {g.plan.search ? "Sökning planerad" : "Sök kandidater"} · 6
                  000 kr
                </button>
              </div>
              <p className="note">
                Sökning kräver 20 % rekryteringstid. Bedömning 10 % per person.
                Erbjudande 20 % per person och 14 000 kr. Bara genomförda steg
                debiteras.
              </p>
              <div className="candidate-grid">
                {g.candidates.map((id) => {
                  const c = candidates.find((c) => c.id === id)!;
                  const assessed = g.assessed.includes(id);
                  return (
                    <section className="panel candidate" key={id}>
                      <div className="person-top">
                        <div className="avatar tone2">
                          {c.name
                            .split(" ")
                            .map((s) => s[0])
                            .join("")}
                        </div>
                        <div>
                          <h3>{c.name}</h3>
                          <small>
                            {c.role === "seller" ? "Säljare" : c.specialty} ·{" "}
                            {c.experience} års erfarenhet
                          </small>
                        </div>
                      </div>
                      <p>{c.bio}</p>
                      <div className="candidate-info">
                        <span>{money(c.salary)} / mån</span>
                        <span>
                          <Clock3 size={14} /> Start om {c.delay} mån
                        </span>
                      </div>
                      {assessed && (
                        <p className="assessment">
                          Bedömd: säljbarhet {pct(c.sellability)} ·{" "}
                          {c.experience < 2
                            ? "Behöver handledning"
                            : "Självständig leverans"}
                        </p>
                      )}
                      <button
                        className={
                          ((assessed ? g.plan.hires : g.plan.assess).includes(
                            id,
                          )
                            ? "secondary selected"
                            : "secondary") + " wide"
                        }
                        disabled={finished}
                        onClick={() =>
                          update((n) => {
                            const key = assessed ? "hires" : "assess";
                            n.plan[key] = n.plan[key].includes(id)
                              ? n.plan[key].filter((x) => x !== id)
                              : [...n.plan[key], id];
                          })
                        }
                      >
                        {(assessed ? g.plan.hires : g.plan.assess).includes(
                          id,
                        ) ? (
                          <Check size={16} />
                        ) : (
                          <Plus size={16} />
                        )}{" "}
                        {(assessed ? g.plan.hires : g.plan.assess).includes(id)
                          ? "Planerat"
                          : assessed
                            ? "Lämna erbjudande"
                            : "Bedöm kandidat"}
                      </button>
                    </section>
                  );
                })}
              </div>
            </>
          )}
          {tab === "Försäljning" && (
            <>
              <div className="panel sales-controls">
                <label>
                  Säljfokus
                  <select
                    value={g.plan.salesFocus}
                    onChange={(e) =>
                      update(
                        (n) =>
                          (n.plan.salesFocus = e.target.value as
                            "new" | "existing"),
                      )
                    }
                  >
                    <option value="new">Nya kunder</option>
                    <option value="existing">Befintliga relationer</option>
                  </select>
                </label>
                <div>
                  <strong>
                    {pct(staff.reduce((s, p) => s + p.allocation.sales, 0))}{" "}
                    säljtid
                  </strong>
                  <p>
                    Prioriterade affärer delar på tiden. Teknikstöd, relevans
                    och pris påverkar chansen.
                  </p>
                </div>
                <button
                  className="text-button"
                  onClick={() => setTab("Personal")}
                >
                  Fördela tid <ArrowRight size={15} />
                </button>
              </div>
              <div className="pipeline-summary">
                {stages.slice(0, 5).map((s, i) => (
                  <div key={s}>
                    <strong>{open.filter((d) => d.stage === i).length}</strong>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
              <div className="deal-grid">
                {open.map((d) => (
                  <section className="panel deal" key={d.id}>
                    <div className="section-heading">
                      <div className="avatar customer-avatar">
                        {d.customer[0]}
                      </div>
                      <span className="tag">{stages[d.stage]}</span>
                    </div>
                    <h2>{d.customer}</h2>
                    <p>
                      {d.segment} · {d.specialty}
                    </p>
                    <div className="deal-details">
                      <span>
                        Timpris<strong>{money(d.rate * d.price)}</strong>
                      </span>
                      <span>
                        Omfattning
                        <strong>
                          {pct(d.scope)} · {d.duration} mån
                        </strong>
                      </span>
                      <span>
                        Möjlig start
                        <strong>Månad {Math.max(g.month + 1, d.start)}</strong>
                      </span>
                      <span>
                        Beslutsfönster
                        <strong>
                          m{d.decision}–{d.decision + 3}
                        </strong>
                      </span>
                    </div>
                    <div className="pipeline-track">
                      {stages.slice(0, 5).map((_, i) => (
                        <i key={i} className={d.stage >= i ? "filled" : ""} />
                      ))}
                    </div>
                    <label className="price-label">
                      Prisstrategi{" "}
                      <select
                        value={d.price}
                        disabled={finished}
                        onChange={(e) =>
                          update((n) => {
                            n.deals.find((x) => x.id === d.id)!.price = Number(
                              e.target.value,
                            );
                          })
                        }
                      >
                        <option value={0.85}>
                          −15 % · högre chans, lägre marginal
                        </option>
                        <option value={1}>Ordinarie pris</option>
                        <option value={1.15}>
                          +15 % · högre marginal, lägre chans
                        </option>
                      </select>
                    </label>
                    <small>
                      Relation {Math.round(d.relation)} / 100 · Konkurrens{" "}
                      {d.competition > 0.5 ? "hög" : "måttlig"} · Utfall osäkert
                    </small>
                    <button
                      className={
                        (d.priority ? "secondary selected" : "secondary") +
                        " wide"
                      }
                      disabled={finished}
                      onClick={() =>
                        update((n) => {
                          const x = n.deals.find((x) => x.id === d.id)!;
                          x.priority = !x.priority;
                        })
                      }
                    >
                      {d.priority ? <Check size={16} /> : <Plus size={16} />}{" "}
                      {d.priority ? "Prioriterad affär" : "Prioritera affär"}
                    </button>
                  </section>
                ))}
              </div>
              {!open.length && (
                <Empty text="Pipeline är tom. Avsätt säljtid, välj ett målsegment eller bygg ett seminarium." />
              )}
              <p className="note">
                Pipeline är en möjlighet, aldrig garanterad omsättning. Affärer
                kan förloras eller skjutas upp.
              </p>
            </>
          )}
          {tab === "Uppdrag" && (
            <>
              <div className="note">
                Fördela varje uppdrag mellan flera konsulter i procent av deras
                heltid. 50 % + 50 % täcker ett uppdrag på 100 %. En konsult kan
                dela sin tid mellan flera uppdrag, men aldrig bokas över 100 %
                under samma månad. Avsätt också leveranstid under Personal.
              </div>
              <div className="deal-grid">
                {contracts.map((d) => (
                  <section className="panel contract" key={d.id}>
                    <div className="section-heading">
                      <h2>{d.customer}</h2>
                      <span className="tag">
                        {d.start > g.month ? `Start m${d.start}` : "Pågående"}
                      </span>
                    </div>
                    <p>
                      {d.specialty} · {pct(d.scope)} · {money(d.rate * d.price)}{" "}
                      / tim
                    </p>
                    <div className="quality">
                      <span>Kundnöjdhet</span>
                      <strong>{Math.round(d.quality)} %</strong>
                      <div className="progress">
                        <i style={{ width: `${d.quality}%` }} />
                      </div>
                    </div>
                    <p>
                      {d.remaining} leveransmånader kvar · {d.paymentTerms} mån
                      betalningsvillkor
                    </p>
                    <div className="staffing-summary">
                      <strong>
                        Bemanning {pct(assignedCapacity(d))} / {pct(d.scope)}
                      </strong>
                      <small>
                        {(d.scope * balance.hours).toFixed(0)} timmar per månad
                        · {d.scope.toLocaleString("sv-SE")} heltidstjänster
                      </small>
                      <div className="progress">
                        <i
                          style={{
                            width: `${Math.min(100, (assignedCapacity(d) / d.scope) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="staffing-list">
                      {g.people
                        .filter((p) => p.role !== "seller")
                        .map((p) => {
                          const share =
                            d.assignments.find((a) => a.personId === p.id)
                              ?.fraction || 0;
                          const max = Math.min(
                            bookingAvailable(g, d.id, p.id),
                            Math.max(0, d.scope - assignedCapacity(d) + share),
                          );
                          return (
                            <label className="staffing-row" key={p.id}>
                              <span>
                                <strong>{p.name}</strong>
                                <small>
                                  {p.specialty}
                                  {p.start > g.month
                                    ? ` · börjar m${p.start}`
                                    : ""}
                                </small>
                                <small>
                                  Leveranstid {pct(p.allocation.delivery)} ·
                                  bokningsutrymme{" "}
                                  {pct(bookingAvailable(g, d.id, p.id))}
                                </small>
                              </span>
                              <select
                                aria-label={`${d.customer}: ${p.name} bemanning`}
                                value={Math.round(share * 10000) / 100}
                                disabled={finished}
                                onChange={(e) =>
                                  setG((n) =>
                                    n
                                      ? setStaffing(
                                          n,
                                          d.id,
                                          p.id,
                                          Number(e.target.value) / 100,
                                        )
                                      : n,
                                  )
                                }
                              >
                                {Array.from(
                                  new Set([
                                    0,
                                    ...Array.from(
                                      { length: 100 },
                                      (_, i) => i + 1,
                                    ),
                                    Math.round(share * 10000) / 100,
                                  ]),
                                )
                                  .sort((a, b) => a - b)
                                  .map((value) => (
                                    <option
                                      key={value}
                                      value={value}
                                      disabled={value / 100 > max + 0.000001}
                                    >
                                      {value} %
                                    </option>
                                  ))}
                              </select>
                            </label>
                          );
                        })}
                    </div>
                    {d.assignments.some((a) => {
                      const p = g.people.find((p) => p.id === a.personId);
                      return (
                        !p ||
                        p.start > g.month ||
                        p.allocation.delivery <
                          a.fraction +
                            1 -
                            bookingAvailable(g, d.id, p.id) -
                            0.000001
                      );
                    }) && (
                      <p className="warning">
                        Planerad bemanning saknar leveranstid eller väntar på
                        startdatum. Kontrollera Personal och kassaprognosen.
                      </p>
                    )}
                    <button
                      className={
                        (g.plan.subcontract.includes(d.id)
                          ? "secondary selected"
                          : "secondary") + " wide"
                      }
                      disabled={finished}
                      onClick={() =>
                        update(
                          (n) =>
                            (n.plan.subcontract = n.plan.subcontract.includes(
                              d.id,
                            )
                              ? n.plan.subcontract.filter((x) => x !== d.id)
                              : [...n.plan.subcontract, d.id]),
                        )
                      }
                    >
                      {g.plan.subcontract.includes(d.id) ? (
                        <Check size={16} />
                      ) : (
                        <Plus size={16} />
                      )}{" "}
                      Underkonsult · 820 kr/tim
                    </button>
                    <small>
                      Underkonsult fyller det som egna konsulter inte levererar.
                      Tillgängligheten är inte garanterad.
                    </small>
                  </section>
                ))}
              </div>
              {!contracts.length && (
                <Empty text="Inga signerade uppdrag än. Vinn förtroende i Försäljning, sedan börjar leveransen." />
              )}
              <section className="panel spaced">
                <h2>Avslutade uppdrag</h2>
                {g.deals
                  .filter((d) => d.stage === 7)
                  .map((d) => (
                    <div className="history-row" key={d.id}>
                      <strong>{d.customer}</strong>
                      <span>{d.specialty}</span>
                      <span>{Math.round(d.quality)} % kvalitet</span>
                    </div>
                  ))}
                {!g.deals.some((d) => d.stage === 7) && (
                  <p className="muted">
                    Din första referens ligger framför dig.
                  </p>
                )}
              </section>
            </>
          )}
          {tab === "Marknad" && (
            <>
              <div className="section-heading">
                <div>
                  <h2>Välj var ni ska bli relevanta</h2>
                  <p className="muted">
                    Intern tid bygger kunskap. Försäljning bygger relationer.
                    Leverans bygger trovärdighet.
                  </p>
                </div>
                <span className="tag">
                  {g.national ? "Nationell" : "Lokal"} marknad
                </span>
              </div>
              <div className="market-grid">
                {segments.map((s) => (
                  <button
                    className={`panel market ${g.plan.target === s ? "target" : ""}`}
                    key={s}
                    onClick={() => update((n) => (n.plan.target = s))}
                  >
                    <div className="section-heading">
                      <Globe2 size={23} />
                      {g.plan.target === s && (
                        <span className="tag">
                          Målsegment <Check size={12} />
                        </span>
                      )}
                    </div>
                    <h2>{s}</h2>
                    {(["knowledge", "relation", "credibility"] as const).map(
                      (key, i) => (
                        <div className="market-meter" key={key}>
                          <span>
                            {["Kunskap", "Relationer", "Trovärdighet"][i]}
                            <strong>
                              {Math.round(g.markets[s][key])} / 100
                            </strong>
                          </span>
                          <div className="progress">
                            <i style={{ width: `${g.markets[s][key]}%` }} />
                          </div>
                        </div>
                      ),
                    )}
                  </button>
                ))}
              </div>
              <div className="panel expansion spaced">
                <div>
                  <h3>Nästa horisont: nationell marknad</h3>
                  <p>
                    40 kunskap · 30 relationer · 20 trovärdighet i målsegmentet
                    · 25 % intern tid · 35 000 kr.
                  </p>
                </div>
                <button
                  className="secondary"
                  disabled={g.national || finished}
                  onClick={() =>
                    update((n) => (n.plan.expansion = !n.plan.expansion))
                  }
                >
                  {g.national
                    ? "Etablerad"
                    : g.plan.expansion
                      ? "Expansion planerad"
                      : "Planera expansion"}
                  <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="section-heading spaced">
                <h2>Material som gör skillnad</h2>
                <label>
                  Målgrupp
                  <select
                    value={g.plan.target}
                    onChange={(e) =>
                      update((n) => (n.plan.target = e.target.value as Segment))
                    }
                  >
                    {segments.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="candidate-grid">
                {materialTypes.map((mat, i) => {
                  const existing = g.materials.find(
                    (p) => p.type === i && p.segment === g.plan.target,
                  );
                  const planned =
                    g.plan.project?.type === i &&
                    g.plan.project.segment === g.plan.target;
                  return (
                    <section className="panel material" key={i}>
                      <span className="material-number">
                        0{i + 1} / SÄLJMATERIAL
                      </span>
                      <h3>{mat.name}</h3>
                      <p>{mat.effect}</p>
                      <small>Behöver: {mat.need}</small>
                      <div className="candidate-info">
                        <span>{money(mat.cost)}</span>
                        <span>{mat.work * 160} h arbete</span>
                      </div>
                      <div className="material-preview">
                        {
                          [
                            "“Vi förstår era flaskhalsar. Så kan vi hjälpa till.”",
                            "“Från behov till lösning, med ett tydligt första steg.”",
                            "“Så hjälpte vårt team en kund till ett bättre resultat.”",
                            "“En morgon om teknik, utmaningar och nya möjligheter.”",
                            "“Kompetens, leveransmodell och ett genomarbetat svar.”",
                          ][i]
                        }
                      </div>
                      {existing ? (
                        <div className="project-state">
                          <strong>
                            {existing.completed
                              ? `Klart månad ${existing.completed}`
                              : `Arbete ${pct(existing.progress / mat.work)}`}
                          </strong>
                          <div className="progress">
                            <i
                              style={{
                                width: `${(existing.progress / mat.work) * 100}%`,
                              }}
                            />
                          </div>
                          {existing.completed > 0 &&
                            g.month - existing.completed >= 12 && (
                              <small>Direkt säljeffekt har upphört.</small>
                            )}
                        </div>
                      ) : (
                        <button
                          className={
                            (planned ? "secondary selected" : "secondary") +
                            " wide"
                          }
                          disabled={finished}
                          onClick={() =>
                            update(
                              (n) =>
                                (n.plan.project = planned
                                  ? null
                                  : { type: i, segment: n.plan.target }),
                            )
                          }
                        >
                          {planned ? <Check size={16} /> : <Plus size={16} />}{" "}
                          {planned ? "Projekt planerat" : "Starta projekt"}
                        </button>
                      )}
                    </section>
                  );
                })}
              </div>
            </>
          )}
          {tab === "Ekonomi" && (
            <>
              <div className="stats">
                <Stat
                  label="Kassa"
                  value={money(g.cash)}
                  note="Pengar som går att använda"
                  icon={<Landmark size={18} />}
                />
                <Stat
                  label="Kundfordringar"
                  value={money(g.invoices.reduce((s, i) => s + i.amount, 0))}
                  note="Fakturerat, ännu inte betalt"
                  icon={<Clock3 size={18} />}
                />
                <Stat
                  label="Kredit utnyttjad"
                  value={money(g.debt)}
                  note="Max 300 000 kr · 0,9 % / månad"
                  icon={<BriefcaseBusiness size={18} />}
                />
                <Stat
                  label="Kundkoncentration"
                  value={pct(concentration(g))}
                  note="Största kundens andel av avtal"
                  icon={<ChartNoAxesCombined size={18} />}
                />
              </div>
              <div className="overview-grid">
                <section className="panel">
                  <h2>Månadsprognos</h2>
                  <div className="finance-line">
                    <span>Kontrakterad, bemannad leverans</span>
                    <strong>{money(f.revenue)}</strong>
                  </div>
                  <div className="finance-line">
                    <span>Planerade kostnader</span>
                    <strong>{money(f.costs)}</strong>
                  </div>
                  <div className="finance-line total">
                    <span>Prognostiserat resultat</span>
                    <strong className={f.profit < 0 ? "danger" : ""}>
                      {money(f.profit)}
                    </strong>
                  </div>
                  <div className="finance-line">
                    <span>Betalningar som förfaller</span>
                    <strong>{money(f.payments)}</strong>
                  </div>
                  <div className="finance-line total">
                    <span>Kassa efter månad</span>
                    <strong className={f.cash < 0 ? "danger" : ""}>
                      {money(f.cash)}
                    </strong>
                  </div>
                  <div className="uncertain">
                    <span>Osäker pipeline / månad</span>
                    <strong>{money(f.pipeline)}</strong>
                    <small>Ingår inte i resultat eller kassaprognos.</small>
                  </div>
                  <p className="note">
                    Omsättning tjänas in vid leverans. Resultat = omsättning
                    minus kostnader. Kassa ändras först när pengar betalas.
                    Beläggning = levererad tid / tillgänglig konsulttid.
                    Marginal = resultat / omsättning.
                  </p>
                </section>
                <section className="panel">
                  <h2>Finansiering & scenarier</h2>
                  <p className="muted">
                    Kredit är en buffert, inte en affärsmodell.
                  </p>
                  <label>
                    Planera kredituttag
                    <select
                      value={g.plan.credit}
                      disabled={finished}
                      onChange={(e) =>
                        update((n) => (n.plan.credit = Number(e.target.value)))
                      }
                    >
                      {[0, 50000, 100000, 200000, 300000]
                        .filter((n) => n <= balance.creditLimit - g.debt)
                        .map((n) => (
                          <option key={n} value={n}>
                            {money(n)}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Planera återbetalning
                    <select
                      value={g.plan.repay}
                      disabled={finished}
                      onChange={(e) =>
                        update((n) => (n.plan.repay = Number(e.target.value)))
                      }
                    >
                      {[0, 50000, 100000, 200000, 300000]
                        .filter((n) => n <= g.debt)
                        .map((n) => (
                          <option key={n} value={n}>
                            {money(n)}
                          </option>
                        ))}
                    </select>
                  </label>
                  <div className="scenario">
                    <span>Om alla betalningar försenas</span>
                    <strong className={f.cash - f.payments < 0 ? "danger" : ""}>
                      {money(f.cash - f.payments)} i kassa
                    </strong>
                  </div>
                  <div className="scenario">
                    <span>Om ingen ny affär vinns</span>
                    <strong>{money(f.revenue)} i leverans</strong>
                    <small>Inga nya affärer räknas in i prognosen.</small>
                  </div>
                  <p className="note">
                    Negativ kassa täcks automatiskt av återstående kredit. När
                    kreditutrymmet är slut kan bolaget gå i konkurs.
                  </p>
                </section>
              </div>
              <section className="panel spaced">
                <div className="section-heading">
                  <h2>Bolagets utveckling</h2>
                  <span className="tag">
                    {g.history.length} avslutade månader
                  </span>
                </div>
                <CashChart g={g} />
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Månad</th>
                        <th>Omsättning</th>
                        <th>Kostnader</th>
                        <th>Resultat</th>
                        <th>Marginal</th>
                        <th>Kassa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.history
                        .slice(-12)
                        .reverse()
                        .map((h) => (
                          <tr key={h.month}>
                            <td>{h.month}</td>
                            <td>{money(h.revenue)}</td>
                            <td>{money(h.costs)}</td>
                            <td className={h.profit < 0 ? "danger" : ""}>
                              {money(h.profit)}
                            </td>
                            <td>
                              {h.revenue ? pct(h.profit / h.revenue) : "—"}
                            </td>
                            <td>{money(h.cash)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {!g.history.length && (
                  <Empty text="Historiken börjar efter din första månad." />
                )}
              </section>
              <section className="panel spaced">
                <h2>Kommande betalningar</h2>
                {g.invoices.map((i) => (
                  <div className="history-row" key={i.id}>
                    <strong>{i.customer}</strong>
                    <span>Förfaller månad {i.due}</span>
                    <span>{money(i.amount)}</span>
                  </div>
                ))}
                {!g.invoices.length && (
                  <p className="muted">Inga kundfordringar ännu.</p>
                )}
              </section>
            </>
          )}
          <footer className="game-footer">
            <span>
              <CheckCircle2 size={14} /> Dina beslut sparas lokalt
            </span>
            <span>
              {pendingCount} planerade åtgärder · planen går att ändra
            </span>
          </footer>
        </main>
      </div>
      {importInput}
      {confirm && (
        <Modal
          title={`Redo för månad ${g.month}?`}
          close={() => setConfirm(false)}
        >
          <p>
            Planen låses när du fortsätter. Leverans, kostnader, betalningar och
            affärsutveckling räknas då fram i ordning.
          </p>
          <div className="finance-line">
            <span>Planerade kostnader</span>
            <strong>{money(f.costs)}</strong>
          </div>
          <div className="finance-line">
            <span>Kontrakterad leverans</span>
            <strong>{money(f.revenue)}</strong>
          </div>
          <div className="finance-line">
            <span>Prognos för kassan</span>
            <strong className={f.cash < 0 ? "danger" : ""}>
              {money(f.cash)}
            </strong>
          </div>
          {f.cash < 0 && (
            <p className="warning">
              Likviditetsrisk: du kan behöva kredit. Återstående kredit{" "}
              {money(balance.creditLimit - g.debt)}.
            </p>
          )}
          {contracts.some(
            (d) =>
              assignedCapacity(d) < d.scope - 0.000001 &&
              d.start <= g.month &&
              !g.plan.subcontract.includes(d.id),
          ) && (
            <p className="warning">
              Ett uppdrag som ska levereras saknar bemanning.
            </p>
          )}
          {f.deliveries.some(
            (item) =>
              item.capacity <
              (g.deals.find((d) => d.id === item.dealId)?.scope || 0) -
                0.000001,
          ) && (
            <p className="warning">
              Planerad leveranstid täcker inte alla uppdrag. Kontrollera
              procentfördelning, startdatum och leveranstid under Personal.
            </p>
          )}
          <p className="note">
            {pendingCount} åtgärder planerade. Säljtid{" "}
            {pct(staff.reduce((s, p) => s + p.allocation.sales, 0))}.
            Rekryteringstid{" "}
            {pct(staff.reduce((s, p) => s + p.allocation.recruitment, 0))}.
            Osäkra betalningar och händelser kan ändra utfallet.
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setConfirm(false)}>
              Ändra planen
            </button>
            <button
              className="primary"
              onClick={() => {
                setG((n) => (n ? advance(n) : n));
                setConfirm(false);
                setReport(true);
              }}
            >
              Genomför månad <ArrowRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {report && (
        <Modal
          title={
            last
              ? `Månadsrapport · månad ${last.month}`
              : "Din första månadsbrief"
          }
          close={() => setReport(false)}
        >
          <div className="report-log">
            {g.log.map((l, i) => (
              <p key={i}>
                <span
                  className={i === 0 ? "report-dot main-dot" : "report-dot"}
                />
                {l}
              </p>
            ))}
          </div>
          <button className="primary wide" onClick={() => setReport(false)}>
            Tillbaka till bolaget <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      {newConfirm && (
        <Modal
          title="Börja ett nytt kapitel?"
          close={() => setNewConfirm(false)}
        >
          <p>
            Den aktuella omgångens lokala sparning ersätts. Exportera den först
            om du vill behålla den.
          </p>
          <div className="modal-actions">
            <button className="secondary" onClick={exportFile}>
              <Download size={16} />
              Exportera
            </button>
            <button
              className="primary"
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setG(null);
                setNewConfirm(false);
                setReport(false);
                setConfirm(false);
                setTab("Översikt");
              }}
            >
              Ny spelomgång
            </button>
          </div>
        </Modal>
      )}
      {error && (
        <div className="toast" role="alert">
          {error}
          <button onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
function Logo() {
  return (
    <div className="logo">
      <div className="logo-icon">
        <span />
        <span />
        <span />
      </div>
      <strong>
        konsultbolaget<span>.</span>
      </strong>
    </div>
  );
}
function Stat({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
}) {
  return (
    <section className="stat">
      <div className="stat-label">
        {label}
        {icon}
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <BriefcaseBusiness size={28} />
      <p>{text}</p>
    </div>
  );
}
function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = dialog.current;
    root?.querySelector<HTMLElement>("button")?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key === "Tab" && root) {
        const focusable = Array.from(
          root.querySelectorAll<HTMLElement>(
            'button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]',
          ),
        );
        const first = focusable[0],
          last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [close]);
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="modal"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="section-heading">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Stäng dialog"
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
function concentration(g: Game) {
  const totals = new Map<string, number>();
  g.deals
    .filter((d) => d.stage === 5 && d.remaining > 0)
    .forEach((d) =>
      totals.set(
        d.customer,
        (totals.get(d.customer) || 0) + d.rate * d.price * d.scope,
      ),
    );
  const vals = [...totals.values()];
  return vals.length ? Math.max(...vals) / vals.reduce((a, b) => a + b, 0) : 0;
}
function CashChart({ g }: { g: Game }) {
  const values = [600000, ...g.history.map((h) => h.cash)];
  const low = Math.min(0, ...values),
    high = Math.max(600000, ...values);
  const points = values
    .map(
      (v, i) =>
        `${10 + (i / Math.max(1, values.length - 1)) * 780},${155 - ((v - low) / (high - low)) * 140}`,
    )
    .join(" ");
  return (
    <div className="cash-chart">
      <div>
        <span>Kassans utveckling</span>
        <strong>{money(g.cash)}</strong>
      </div>
      <svg
        viewBox="0 0 800 170"
        role="img"
        aria-label="Kassans utveckling från start till aktuell månad"
      >
        <line x1="10" y1="155" x2="790" y2="155" stroke="#dce4dc" />
        <polyline
          points={points}
          fill="none"
          stroke="#38775c"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
      <div>
        <small>Start · 600 000 kr</small>
        <small>Månad {g.month - 1}</small>
      </div>
    </div>
  );
}
