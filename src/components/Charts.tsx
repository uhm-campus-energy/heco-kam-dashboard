import { useEffect, useRef } from "react";
import Plotly from "plotly.js-dist-min";
import {
  TABLEAU_COLORS,
  kwhByLocationCustomer,
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
      paper_bgcolor: "#fff",
      plot_bgcolor: "#fff",
      font: { family: "Segoe UI, Arial, sans-serif", size: 12 },
      showlegend: false,
      ...layout,
      margin: { t: 10, r: 20, b: 80, l: 70, ...layout.margin },
      legend: { orientation: "h", ...layout.legend },
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
  const { locations, series } = kwhByLocationCustomer(rows);
  const shown = locations.filter((location) => location !== "UH_Manoa");
  const totals = shown.map((location) => {
    const index = locations.indexOf(location);
    return series.reduce((sum, part) => sum + (part.values[index] ?? 0), 0);
  });
  const ref = usePlot(
    () => ({
      data: [
        {
          type: "bar",
          x: shown,
          y: totals,
          marker: { color: "#4e79a7" },
          hovertemplate: "%{x}<br>%{y:,.0f} kWh<extra></extra>",
        },
      ],
      layout: {
        yaxis: { title: "Billed Usage kwh", tickformat: "~s", separatethousands: true, rangemode: "normal" },
        xaxis: { tickangle: -90, automargin: true, tickfont: { size: 10 } },
        showlegend: false,
        margin: { t: 10, r: 20, b: 130, l: 70 },
      },
    }),
    [rows],
  );
  return <div className="chart-wrap" ref={ref} />;
}

function legendName(customer: string): string {
  return customer.length > 26 ? `${customer.slice(0, 23)}...` : customer;
}

export function ManoaStack({ rows }: PlotProps) {
  const { locations, series } = kwhByLocationCustomer(rows);
  const bases = series.map(() => locations.map(() => 0));
  for (let loc = 0; loc < locations.length; loc++) {
    const parts = series.map((part, index) => ({ index, value: part.values[loc] ?? 0 }));
    let cursor = 0;
    for (const item of parts.filter((part) => part.value > 0).sort((a, b) => b.value - a.value || a.index - b.index)) {
      bases[item.index][loc] = cursor;
      cursor += item.value;
    }
    cursor = 0;
    for (const item of parts.filter((part) => part.value < 0).sort((a, b) => a.value - b.value || a.index - b.index)) {
      cursor += item.value;
      bases[item.index][loc] = cursor;
    }
  }
  const ref = usePlot(
    () => ({
      data: series.map((part, i) => ({
        type: "bar",
        name: legendName(part.customer),
        x: locations,
        y: part.values,
        base: bases[i],
        marker: { color: TABLEAU_COLORS[i % TABLEAU_COLORS.length] },
        hovertemplate: `${part.customer}<br>%{x}<br>%{y:,.0f} kWh<extra></extra>`,
      })),
      layout: {
        barmode: "overlay",
        bargap: 0.15,
        xaxis: { tickangle: -90, automargin: true, tickfont: { size: 10 } },
        yaxis: { title: "Billed Usage kwh", tickformat: "~s", separatethousands: true, rangemode: "normal" },
        showlegend: true,
        legend: {
          orientation: "v" as const,
          x: 1.02,
          y: 1,
          xanchor: "left" as const,
          yanchor: "top" as const,
          title: { text: "Customer Name" },
          font: { size: 10 },
          traceorder: "normal" as const,
        },
        margin: { t: 10, r: 230, b: 130, l: 70 },
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
