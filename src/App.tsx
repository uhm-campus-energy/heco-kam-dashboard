import { useEffect, useMemo, useState } from "react";
import { Crosstab } from "./components/Crosstab";
import { CampusBar, ManoaStack, TrendChart } from "./components/Charts";
import { FilterPane } from "./components/FilterPane";
import { applyFilters } from "./lib/aggregate";
import type { Dataset, Filters, TabId } from "./types";

const TABS: { id: TabId; label: string }[] = [
  { id: "detail-kwh", label: "Detailed kWh Usage" },
  { id: "detail-amount", label: "Detailed Amount $" },
  { id: "campus-kwh", label: "Campus Total kWh Usage" },
  { id: "campus-amount", label: "Campus Total Amount $" },
  { id: "bar-wo-manoa", label: "Campus Total kWh Usage w/o Manoa" },
  { id: "bar-manoa", label: "Campus Total kWh Usage Manoa" },
  { id: "trend", label: "Trend" },
];

function toggleSet(current: Set<string>, value: string | "ALL", allValues: string[]): Set<string> {
  if (value === "ALL") {
    const allOn = allValues.every((v) => current.has(v));
    return new Set(allOn ? [] : allValues);
  }
  const next = new Set(current);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function App() {
  const [data, setData] = useState<Dataset | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("detail-kwh");
  const [filters, setFilters] = useState<Filters | null>(null);

  useEffect(() => {
    fetch("./data/bills.json")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load bills.json (${res.status})`);
        return res.json();
      })
      .then((payload: Dataset) => {
        setData(payload);
        setFilters({
          fiscalYears: new Set(payload.fiscalYears.filter((y) => y === "fy26" || y === "fy27")),
          campuses: new Set(["Manoa"]),
          customers: new Set(payload.customers),
          contracts: null,
        });
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  const filtered = useMemo(() => {
    if (!data || !filters) return [];
    return applyFilters(data.rows, filters);
  }, [data, filters]);

  const contracts = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.rows.map((r) => r.contract))].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    );
  }, [data]);

  const title = TABS.find((t) => t.id === tab)?.label ?? "";

  if (error) return <div className="status error">{error}. Run python3 scripts/prepare_data.py</div>;
  if (!data || !filters) return <div className="status">Loading HECO KAM View…</div>;

  const onToggle = (
    key: "fiscalYears" | "campuses" | "customers" | "contracts",
    value: string | "ALL",
  ) => {
    setFilters((prev) => {
      if (!prev) return prev;
      if (key === "contracts") {
        const current = prev.contracts ?? new Set(contracts);
        return { ...prev, contracts: toggleSet(current, value, contracts) };
      }
      const allValues =
        key === "fiscalYears" ? data.fiscalYears : key === "campuses" ? data.campuses : data.customers;
      return { ...prev, [key]: toggleSet(prev[key], value, allValues) };
    });
  };

  return (
    <div className="app">
      <nav className="tab-bar">
        {TABS.map((item) => (
          <button
            key={item.id}
            className={`tab${tab === item.id ? " active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="workspace">
        <main className="view">
          <h1>{title}</h1>
          {tab === "detail-kwh" ? (
            <Crosstab rows={filtered} metric="kwh" includeContract monthly />
          ) : null}
          {tab === "detail-amount" ? (
            <Crosstab rows={filtered} metric="amount" includeContract monthly />
          ) : null}
          {tab === "campus-kwh" ? (
            <Crosstab rows={filtered} metric="kwh" includeContract={false} monthly={false} />
          ) : null}
          {tab === "campus-amount" ? (
            <Crosstab rows={filtered} metric="amount" includeContract={false} monthly={false} />
          ) : null}
          {tab === "bar-wo-manoa" ? <CampusBar rows={filtered} /> : null}
          {tab === "bar-manoa" ? <ManoaStack rows={filtered} /> : null}
          {tab === "trend" ? <TrendChart rows={filtered} /> : null}
          <div className="toolbar">
            Source: heco_kam_view.csv · {filtered.length.toLocaleString()} billing rows
          </div>
        </main>
        <FilterPane
          data={data}
          filters={filters}
          showContracts={tab === "trend"}
          contracts={contracts}
          onToggle={onToggle}
        />
      </div>
    </div>
  );
}
