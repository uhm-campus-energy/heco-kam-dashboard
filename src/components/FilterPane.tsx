import type { Dataset, Filters } from "../types";

type Props = {
  data: Dataset;
  filters: Filters;
  showContracts?: boolean;
  yearMode?: "multi" | "single";
  yearOnly?: boolean;
  campuses?: string[];
  contracts: string[];
  onToggle: (key: "fiscalYears" | "campuses" | "customers" | "contracts", value: string | "ALL") => void;
};

function Group({
  title,
  values,
  selected,
  onToggle,
  single,
}: {
  title: string;
  values: string[];
  selected: Set<string> | null;
  onToggle: (value: string | "ALL") => void;
  single?: boolean;
}) {
  const allOn = selected !== null && values.length > 0 && values.every((v) => selected.has(v));
  return (
    <>
      <h2>{title}</h2>
      <div className="filter-list">
        <label>
          <input
            type={single ? "radio" : "checkbox"}
            name={single ? title : undefined}
            checked={allOn}
            onChange={() => onToggle("ALL")}
          />
          (All)
        </label>
        {values.map((value) => (
          <label key={value}>
            <input
              type={single ? "radio" : "checkbox"}
              name={single ? title : undefined}
              checked={single ? selected?.size === 1 && selected.has(value) : (selected?.has(value) ?? false)}
              onChange={() => onToggle(value)}
            />
            {value}
          </label>
        ))}
      </div>
    </>
  );
}

export function FilterPane({ data, filters, showContracts, yearMode, yearOnly, campuses, contracts, onToggle }: Props) {
  return (
    <aside className="filters">
      <Group
        title="Fiscal Year"
        values={data.fiscalYears}
        selected={filters.fiscalYears}
        single={yearMode === "single"}
        onToggle={(v) => onToggle("fiscalYears", v)}
      />
      {yearOnly ? null : (
        <Group
          title="Campus Affiliation"
          values={campuses ?? data.campuses}
          selected={filters.campuses}
          onToggle={(v) => onToggle("campuses", v)}
        />
      )}
      {yearOnly ? null : (
        <Group
          title="Customer Name"
          values={data.customers}
          selected={filters.customers}
          onToggle={(v) => onToggle("customers", v)}
        />
      )}
      {!yearOnly && showContracts ? (
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
