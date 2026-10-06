export type Specialty = "Systemutveckling" | "Cybersäkerhet" | "Data/AI";
export type Segment = "Industri" | "Energi" | "Produktbolag";
export type Activity =
  "delivery" | "sales" | "recruitment" | "internal" | "training";
export type Allocation = Record<Activity, number>;
export interface Person {
  id: string;
  name: string;
  specialty: Specialty;
  experience: number;
  salary: number;
  happiness: number;
  sellability: number;
  start: number;
  role: "founder" | "consultant" | "seller";
  notice: number;
  allocation: Allocation;
}
export interface Candidate {
  id: string;
  name: string;
  specialty: Specialty;
  experience: number;
  salary: number;
  sellability: number;
  delay: number;
  role: "consultant" | "seller";
  bio: string;
}
export interface Deal {
  id: string;
  customer: string;
  segment: Segment;
  specialty: Specialty;
  stage: number;
  rate: number;
  scope: number;
  duration: number;
  start: number;
  decision: number;
  relation: number;
  competition: number;
  priority: boolean;
  price: number;
  assignments: { personId: string; fraction: number }[];
  quality: number;
  remaining: number;
  postponed: number;
  paymentTerms: number;
}
export interface Material {
  id: string;
  type: number;
  segment: Segment;
  progress: number;
  completed: number;
  approved: boolean;
}
export interface Invoice {
  id: string;
  customer: string;
  amount: number;
  due: number;
}
export interface MonthRecord {
  month: number;
  revenue: number;
  costs: number;
  profit: number;
  cash: number;
  utilization: number;
  happiness: number;
}
export interface Market {
  knowledge: number;
  relation: number;
  credibility: number;
}
export interface Plan {
  hires: string[];
  assess: string[];
  search: boolean;
  project: { type: number; segment: Segment } | null;
  credit: number;
  repay: number;
  expansion: boolean;
  subcontract: string[];
  salesFocus: "new" | "existing";
  target: Segment;
}
export interface Game {
  version: 2;
  campaignMonths: number;
  name: string;
  specialty: Specialty;
  month: number;
  seed: number;
  cash: number;
  debt: number;
  people: Person[];
  candidates: string[];
  assessed: string[];
  deals: Deal[];
  invoices: Invoice[];
  materials: Material[];
  markets: Record<Segment, Market>;
  national: boolean;
  history: MonthRecord[];
  log: string[];
  bankrupt: boolean;
  continued: boolean;
  tutorial: number;
  plan: Plan;
}
