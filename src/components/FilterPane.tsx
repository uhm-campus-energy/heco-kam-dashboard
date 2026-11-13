import type { Dataset, Filters } from "../types";

type Props = {
  data: Dataset;
  filters: Filters;
  showContracts?: boolean;
  contracts: string[];
  onToggle: (key: "fiscalYears" | "campuses" | "customers" | "contracts", value: string | "ALL") => void;
};

function Group({
  title,
  values,
  selected,
  onToggle,
}: {
  title: string;
  values: string[];
  selected: Set<string> | null;
  onToggle: (value: string | "ALL") => void;
}) {
  const allOn = selected !== null && values.length > 0 && values.every((v) => selected.has(v));
  return (
    <>
      <h2>{title}</h2>
      <div className="filter-list">
        <label>
          <input type="checkbox" checked={allOn} onChange={() => onToggle("ALL")} />
          (All)
        </label>
        {values.map((value) => (
          <label key={value}>
            <input
              type="checkbox"
              checked={selected?.has(value) ?? false}
              onChange={() => onToggle(value)}
            />
            {value}
          </label>
        ))}
      </div>
    </>
  );
}

export function FilterPane({ data, filters, showContracts, contracts, onToggle }: Props) {
  return (
    <aside className="filters">
      <Group
        title="Fiscal Year"
        values={data.fiscalYears}
        selected={filters.fiscalYears}
        onToggle={(v) => onToggle("fiscalYears", v)}
      />
      <Group
        title="Campus Affiliation"
        values={data.campuses}
        selected={filters.campuses}
        onToggle={(v) => onToggle("campuses", v)}
      />
      <Group
        title="Customer Name"
        values={data.customers}
        selected={filters.customers}
        onToggle={(v) => onToggle("customers", v)}
      />
      {showContracts ? (
        <Group
          title="Contract"
          values={contracts}
          selected={filters.contracts ?? new Set(contracts)}
          onToggle={(v) => onToggle("contracts", v)}
        />
      ) : null}
    </aside>
  );
}
