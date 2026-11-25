import { Fragment, useMemo } from "react";
import { MANOA_LOCATIONS, formatKwh, formatMoney, manoaLocation, monthOrder, pivotLeaves } from "../lib/aggregate";
import type { BillRow } from "../types";

type Props = {
  rows: BillRow[];
  metric: "kwh" | "amount";
  includeContract: boolean;
  monthly: boolean;
};

function spans<T>(items: T[], key: (item: T) => string): number[] {
  const out = Array(items.length).fill(0);
  let i = 0;
  while (i < items.length) {
    let j = i + 1;
    while (j < items.length && key(items[j]) === key(items[i])) j += 1;
    out[i] = j - i;
    i = j;
  }
  return out;
}

export function Crosstab({ rows, metric, includeContract, monthly }: Props) {
  const months = useMemo(() => monthOrder(rows), [rows]);
  const leaves = useMemo(
    () => pivotLeaves(rows, metric, includeContract),
    [rows, metric, includeContract],
  );
  const campusSpans = useMemo(() => spans(leaves, (r) => r.campus), [leaves]);
  const customerSpans = useMemo(
    () => spans(leaves, (r) => `${r.campus}\0${r.customer}`),
    [leaves],
  );
  const otherSpans = useMemo(
    () => spans(leaves, (r) => `${r.campus}\0${r.customer}\0${r.other}`),
    [leaves],
  );

  const fmt = metric === "amount" ? formatMoney : formatKwh;

  return (
    <div className="table-scroll">
      <table className="crosstab">
        <thead>
          <tr>
            <th className="col-campus">Campus Affiliation</th>
            <th className="col-customer">Customer Name</th>
            <th className="col-other">Other Identifier</th>
            {includeContract ? <th className="col-contract">Contract</th> : null}
            {monthly
              ? months.map((m) => (
                  <th key={m.key} className="num">
                    {m.label}
                  </th>
                ))
              : (
                  <th className="num">{metric === "amount" ? "Amount" : "Billed Usage kWh"}</th>
                )}
          </tr>
        </thead>
        <tbody>
          {leaves.map((leaf, i) => (
            <tr key={`${leaf.campus}-${leaf.customer}-${leaf.other}-${leaf.contract}-${i}`}>
              {campusSpans[i] ? (
                <td className="group col-campus" rowSpan={campusSpans[i]} title={leaf.campus}>
                  {leaf.campus}
                </td>
              ) : null}
              {customerSpans[i] ? (
                <td className="group col-customer" rowSpan={customerSpans[i]} title={leaf.customer}>
                  {leaf.customer}
                </td>
              ) : null}
              {otherSpans[i] ? (
                <td className="group col-other" rowSpan={otherSpans[i]} title={leaf.other}>
                  {leaf.other}
                </td>
              ) : null}
              {includeContract ? (
                <td className="col-contract" title={leaf.contract}>
                  {leaf.contract}
                </td>
              ) : null}
              {monthly
                ? months.map((m) => {
                    const value = leaf.byMonth[m.key] ?? 0;
                    return (
                      <td key={m.key} className={`num${value ? " pos" : ""}`}>
                        {fmt(value)}
                      </td>
                    );
                  })
                : (
                    <td className={`num${leaf.total ? " pos" : ""}`}>{fmt(leaf.total)}</td>
                  )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type AnnualLine = {
  location: string;
  customer: string;
  other: string;
  total: number;
};

export function AnnualCampus({ rows }: { rows: BillRow[] }) {
  const groups = useMemo(() => {
    const map = new Map<string, AnnualLine>();
    for (const row of rows) {
      const location = manoaLocation(row);
      if (!location) continue;
      const id = `${location}\0${row.customer}\0${row.other}`;
      const line = map.get(id) ?? { location, customer: row.customer, other: row.other, total: 0 };
      line.total += row.kwh;
      map.set(id, line);
    }
    const lines = [...map.values()].filter((line) => line.total !== 0);
    const order = MANOA_LOCATIONS as readonly string[];
    lines.sort((a, b) => order.indexOf(a.location) - order.indexOf(b.location) || a.customer.localeCompare(b.customer) || a.other.localeCompare(b.other));
    const grouped: { location: string; lines: AnnualLine[]; total: number }[] = [];
    for (const line of lines) {
      const last = grouped[grouped.length - 1];
      if (!last || last.location !== line.location) grouped.push({ location: line.location, lines: [line], total: line.total });
      else {
        last.lines.push(line);
        last.total += line.total;
      }
    }
    return grouped;
  }, [rows]);

  return (
    <div className="table-scroll">
      <table className="crosstab annual">
        <thead>
          <tr>
            <th className="col-campus">Campus Affiliation</th>
            <th className="col-customer">Customer Name</th>
            <th className="col-other">Other Identifier</th>
            <th className="num" />
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <Fragment key={group.location}>
              {group.lines.map((line, index) => (
                <tr key={`${group.location}-${line.customer}-${line.other}`}>
                  {index === 0 ? (
                    <td className="group col-campus" rowSpan={group.lines.length + 1}>
                      {group.location}
                    </td>
                  ) : null}
                  <td className="col-customer" title={line.customer}>{line.customer}</td>
                  <td className="col-other" title={line.other}>{line.other}</td>
                  <td className="num">{formatKwh(line.total)}</td>
                </tr>
              ))}
              <tr key={`${group.location}-total`} className="total">
                <td className="col-customer">Total</td>
                <td />
                <td className="num">{formatKwh(group.total)}</td>
              </tr>
            </Fragment>
          ))}
          <tr className="total">
            <td colSpan={3}>Grand Total</td>
            <td className="num">{formatKwh(groups.reduce((sum, group) => sum + group.total, 0))}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
