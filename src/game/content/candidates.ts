import type { Candidate } from "../types";
import { specialties } from "./categories";
const names = [
  "Maja Lind",
  "Erik Berg",
  "Sara Nyström",
  "Alex Holm",
  "Nora Ek",
  "Viktor Lund",
  "Amira Ali",
  "Oskar Dahl",
  "Linnea West",
  "David Sjö",
  "Elin Sand",
  "Jonas Vik",
];
const bios = [
  "Trygg senior. Samlar på svåra problem och bra kaffebönor.",
  "Hungrig junior med stor potential. Behöver en mentor.",
  "Specialist som gör det komplexa begripligt.",
  "Stark leverans, lite mindre förtjust i säljmöten.",
];
export const candidates: Candidate[] = names.map((name, i) => ({
  id: `c${i}`,
  name,
  specialty: specialties[i % 3],
  experience: [4, 1, 5, 3][i % 4],
  salary: [52000, 32000, 59000, 45000][i % 4],
  sellability: [0.8, 0.45, 0.9, 0.65][i % 4],
  delay: [2, 1, 3, 1][i % 4],
  role: "consultant",
  bio: bios[i % 4],
}));
candidates.push(
  {
    id: "s0",
    name: "Sofia Andersson",
    specialty: "Systemutveckling",
    experience: 4,
    salary: 47000,
    sellability: 0.9,
    delay: 2,
    role: "seller",
    bio: "Relationsbyggare med industrinätverk. Behöver ett tydligt erbjudande.",
  },
  {
    id: "s1",
    name: "Leo Karlsson",
    specialty: "Data/AI",
    experience: 2,
    salary: 38000,
    sellability: 0.7,
    delay: 1,
    role: "seller",
    bio: "Hittar nya dörrar. Någon behöver hjälpa till med tekniken.",
  },
);
