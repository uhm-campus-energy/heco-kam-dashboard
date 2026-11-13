import { useEffect, useRef } from "react";
import Plotly from "plotly.js-dist-min";
import {
  TABLEAU_COLORS,
  campusTotals,
  manoaByCustomer,
  trendByContract,
} from "../lib/aggregate";
import type { BillRow } from "../types";

type PlotProps = { rows: BillRow[] };

function usePlot(factory: () => { data: Plotly.Data[]; layout: Partial<Plotly.Layout> }, deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const { data, layout } = factory();
    Plotly.react(node, data, {
      ...layout,
      margin: { t: 10, r: 20, b: 60, l: 70 },
      paper_bgcolor: "#fff",
      plot_bgcolor: "#fff",
      font: { family: "Segoe UI, Arial, sans-serif", size: 12 },
      legend: { orientation: "h" },
    }, { responsive: true, displayModeBar: false });
    const onResize = () => Plotly.Plots.resize(node);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      Plotly.purge(node);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export function CampusBar({ rows }: PlotProps) {
  const withoutManoa = rows.filter((r) => r.campus !== "Manoa");
  const totals = campusTotals(withoutManoa.length ? withoutManoa : rows, "kwh");
  const ref = usePlot(
    () => ({
      data: [
        {
          type: "bar",
          x: totals.map((t) => t.campus),
          y: totals.map((t) => t.value),
          marker: { color: "#4e79a7" },
          hovertemplate: "%{x}<br>%{y:,.0f} kWh<extra></extra>",
        },
      ],
      layout: {
        yaxis: { title: "Billed Usage Kwh", separatethousands: true },
        xaxis: { title: "" },
        showlegend: false,
      },
    }),
    [rows],
  );
  return <div className="chart-wrap" ref={ref} />;
}

export function ManoaStack({ rows }: PlotProps) {
  const parts = manoaByCustomer(rows);
  const ref = usePlot(
    () => ({
      data: parts.map((part, i) => ({
        type: "bar",
        name: part.customer,
        x: ["Manoa"],
        y: [part.value],
        marker: { color: TABLEAU_COLORS[i % TABLEAU_COLORS.length] },
        hovertemplate: `${part.customer}<br>%{y:,.0f} kWh<extra></extra>`,
      })),
      layout: {
        barmode: "stack",
        yaxis: { title: "Billed Usage Kwh", separatethousands: true },
        showlegend: true,
        legend: { orientation: "h" as const, y: -0.15 },
      },
    }),
    [rows],
  );
  return <div className="chart-wrap" ref={ref} />;
}

export function TrendChart({ rows }: PlotProps) {
  const { months, series } = trendByContract(rows);
  const ref = usePlot(
    () => ({
      data: series.map((s, i) => ({
        type: "scatter",
        mode: "lines",
        name: s.contract,
        x: months.map((m) => m.label),
        y: s.values,
        line: { color: TABLEAU_COLORS[i % TABLEAU_COLORS.length], width: 2 },
        hovertemplate: `${s.contract}<br>%{x}<br>%{y:,.0f} kWh<extra></extra>`,
      })),
      layout: {
        yaxis: { title: "Billed Usage Kwh", separatethousands: true },
        xaxis: { title: "Month of Billing Period To" },
        showlegend: true,
        legend: { orientation: "h" as const, y: -0.2 },
      },
    }),
    [rows],
  );
  return <div className="chart-wrap" ref={ref} />;
}
