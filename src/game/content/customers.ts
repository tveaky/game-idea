import type { Segment } from "../types";
export const customers = [
  { name: "Nordverk", segment: "Industri" },
  { name: "Berg & Stål", segment: "Industri" },
  { name: "Forma Industri", segment: "Industri" },
  { name: "Atlas Produktion", segment: "Industri" },
  { name: "Grönström", segment: "Energi" },
  { name: "Stadskraft", segment: "Energi" },
  { name: "Norrnät", segment: "Energi" },
  { name: "Vattenlinjen", segment: "Energi" },
  { name: "Looply", segment: "Produktbolag" },
  { name: "Pixel & Co", segment: "Produktbolag" },
  { name: "Morgon Labs", segment: "Produktbolag" },
  { name: "Flow Systems", segment: "Produktbolag" },
] as { name: string; segment: Segment }[];
