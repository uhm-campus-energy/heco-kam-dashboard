import type { BillRow, Filters, LeafRow } from "../types";

export function applyFilters(rows: BillRow[], filters: Filters): BillRow[] {
  return rows.filter((row) => {
    if (filters.fiscalYears.size && !filters.fiscalYears.has(row.fy)) return false;
    const location = manoaLocation(row) ?? row.campus;
    if (filters.campuses.size && !filters.campuses.has(location)) return false;
    if (filters.customers.size && !filters.customers.has(row.customer)) return false;
    if (filters.contracts && filters.contracts.size && !filters.contracts.has(row.contract)) {
      return false;
    }
    return true;
  });
}

export function monthOrder(rows: BillRow[]): { key: string; label: string }[] {
  const map = new Map<string, string>();
  for (const row of rows) {
    if (!map.has(row.monthKey)) map.set(row.monthKey, row.month);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, label]) => ({ key, label: shortMonth(label) }));
}

function shortMonth(label: string): string {
  const [mon, year] = label.split(" ");
  return `${mon} ${year.slice(2)}`;
}

export function pivotLeaves(
  rows: BillRow[],
  metric: "kwh" | "amount",
  includeContract: boolean,
): LeafRow[] {
  const map = new Map<string, LeafRow>();
  for (const row of rows) {
    const campus = manoaLocation(row) ?? row.campus;
    const contract = includeContract ? row.contract : "";
    const id = `${campus}\0${row.customer}\0${row.other}\0${contract}`;
    let leaf = map.get(id);
    if (!leaf) {
      leaf = {
        campus,
        customer: row.customer,
        other: row.other,
        contract,
        byMonth: {},
        total: 0,
      };
      map.set(id, leaf);
    }
    const value = row[metric];
    leaf.byMonth[row.monthKey] = (leaf.byMonth[row.monthKey] ?? 0) + value;
    leaf.total += value;
  }
  const order = MANOA_LOCATIONS as readonly string[];
  return [...map.values()].sort((a, b) =>
    (order.indexOf(a.campus as (typeof MANOA_LOCATIONS)[number]) - order.indexOf(b.campus as (typeof MANOA_LOCATIONS)[number])) ||
    a.customer.localeCompare(b.customer) ||
    a.other.localeCompare(b.other) ||
    a.contract.localeCompare(b.contract, undefined, { numeric: true }),
  );
}

export const MANOA_LOCATIONS = [
  "CC_Admin_Office",
  "Hawaii_CC_KO_Education",
  "Hawaii_CC_KO_Palamanui",
  "Hawaii_CC_Manono",
  "Honolulu_CC",
  "Kapiolani_CC",
  "Leeward_CC",
  "Maui_CC_Molokai",
  "UH_Hilo",
  "UH_Manoa",
  "UH_West_Oahu",
  "Windward_CC",
] as const;

// Tableau's Hawaii_CC_KO_Education group. The CSV has no column for that label;
// these are the only three contracts in the group.
const KO_EDUCATION_CONTRACTS = new Set(["30560495", "30560497", "30560531"]);

function isKoEducation(row: BillRow): boolean {
  return KO_EDUCATION_CONTRACTS.has(row.contract);
}

export function manoaLocation(row: BillRow): string | null {
  const other = row.other.toLowerCase();
  switch (row.campus) {
    case "CC":
      return "CC_Admin_Office";
    case "Hawcc":
      if (isKoEducation(row)) return "Hawaii_CC_KO_Education";
      if (other.includes("palamanui")) return "Hawaii_CC_KO_Palamanui";
      if (other.includes("manono")) return "Hawaii_CC_Manono";
      return "Hawaii_CC_KO_Education";
    case "HCC":
      return "Honolulu_CC";
    case "KCC":
      return "Kapiolani_CC";
    case "LCC":
      return "Leeward_CC";
    case "MauiCC":
      return "Maui_CC_Molokai";
    case "Hilo":
      if (isKoEducation(row)) return "Hawaii_CC_KO_Education";
      return "UH_Hilo";
    case "Manoa":
      return "UH_Manoa";
    case "UHWO":
      return "UH_West_Oahu";
    case "WCC":
      return "Windward_CC";
    default:
      return null;
  }
}

export function kwhByLocationCustomer(rows: BillRow[]): {
  locations: string[];
  series: { customer: string; values: number[] }[];
} {
  const locations: string[] = [...MANOA_LOCATIONS];
  const byCustomer = new Map<string, number[]>();
  for (const row of rows) {
    const location = manoaLocation(row);
    if (!location) continue;
    let index = locations.indexOf(location);
    if (index < 0) {
      locations.push(location);
      index = locations.length - 1;
      for (const values of byCustomer.values()) values.push(0);
    }
    let values = byCustomer.get(row.customer);
    if (!values) {
      values = locations.map(() => 0);
      byCustomer.set(row.customer, values);
    }
    values[index] = (values[index] ?? 0) + row.kwh;
  }
  const series = [...byCustomer.entries()]
    .map(([customer, values]) => ({
      customer,
      values,
      total: values.reduce((sum, value) => sum + value, 0),
    }))
    .filter((series) => series.total !== 0)
    .sort((a, b) => a.customer.localeCompare(b.customer))
    .map(({ customer, values }) => ({ customer, values }));
  return { locations, series };
}

export function trendByContract(rows: BillRow[]): {
  months: { key: string; label: string }[];
  series: { contract: string; values: number[] }[];
} {
  const months = monthOrder(rows);
  const map = new Map<string, Record<string, number>>();
  for (const row of rows) {
    let byMonth = map.get(row.contract);
    if (!byMonth) {
      byMonth = {};
      map.set(row.contract, byMonth);
    }
    byMonth[row.monthKey] = (byMonth[row.monthKey] ?? 0) + row.kwh;
  }
  const series = [...map.entries()]
    .map(([contract, byMonth]) => ({
      contract,
      values: months.map((m) => byMonth[m.key] ?? 0),
      total: months.reduce((sum, m) => sum + (byMonth[m.key] ?? 0), 0),
    }))
    .sort((a, b) => b.total - a.total)
    .map(({ contract, values }) => ({ contract, values }));
  return { months, series };
}

export function formatKwh(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

export function formatMoney(value: number): string {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export const TABLEAU_COLORS = [
  "#4e79a7",
  "#f28e2b",
  "#e15759",
  "#76b7b2",
  "#59a14f",
  "#edc948",
  "#b07aa1",
  "#ff9da7",
  "#9c755f",
  "#bab0ac",
  "#86bcb6",
  "#d37295",
  "#8cd17d",
  "#b6992d",
  "#499894",
];
