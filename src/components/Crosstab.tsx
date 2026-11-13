import { useMemo } from "react";
import { formatKwh, formatMoney, monthOrder, pivotLeaves } from "../lib/aggregate";
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
