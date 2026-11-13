import type { BillRow, Filters, LeafRow } from "../types";

export function applyFilters(rows: BillRow[], filters: Filters): BillRow[] {
  return rows.filter((row) => {
    if (filters.fiscalYears.size && !filters.fiscalYears.has(row.fy)) return false;
    if (filters.campuses.size && !filters.campuses.has(row.campus)) return false;
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
    const contract = includeContract ? row.contract : "";
    const id = `${row.campus}\0${row.customer}\0${row.other}\0${contract}`;
    let leaf = map.get(id);
    if (!leaf) {
      leaf = {
        campus: row.campus,
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
  return [...map.values()].sort((a, b) =>
    a.campus.localeCompare(b.campus) ||
    a.customer.localeCompare(b.customer) ||
    a.other.localeCompare(b.other) ||
    a.contract.localeCompare(b.contract, undefined, { numeric: true }),
  );
}

export function campusTotals(rows: BillRow[], metric: "kwh" | "amount"): { campus: string; value: number }[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.campus, (map.get(row.campus) ?? 0) + row[metric]);
  }
  return [...map.entries()]
    .map(([campus, value]) => ({ campus, value }))
    .sort((a, b) => a.campus.localeCompare(b.campus));
}

export function manoaByCustomer(rows: BillRow[]): { customer: string; value: number }[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (row.campus !== "Manoa") continue;
    map.set(row.customer, (map.get(row.customer) ?? 0) + row.kwh);
  }
  return [...map.entries()]
    .map(([customer, value]) => ({ customer, value }))
    .sort((a, b) => b.value - a.value);
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
