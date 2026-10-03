"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Point {
  key: string;
  label: string;
  value: number | null;
  /** Extra rows shown in the tooltip and the table view. */
  details?: { label: string; value: string }[];
}

interface ChartFrameProps {
  title: string;
  subtitle?: ReactNode;
  points: Point[];
  valueLabel: string;
  format: (n: number) => string;
  children: (width: number) => ReactNode;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Card with title, the plot, and an accessible table view of the same data. */
export function ChartFrame({ title, subtitle, points, valueLabel, format, children }: ChartFrameProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [showTable, setShowTable] = useState(false);
  const extra = points.find((p) => p.details)?.details?.map((d) => d.label) ?? [];

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-xs">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
        <button type="button" onClick={() => setShowTable((s) => !s)} className="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-primary active:bg-muted">
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>
      {showTable ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-sm tabular-nums">
            <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
              <tr>
                <th className="py-1 text-left font-medium">Date</th>
                <th className="py-1 text-right font-medium">{valueLabel}</th>
                {extra.map((h) => (
                  <th key={h} className="py-1 text-right font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.key} className="border-t">
                  <td className="py-1.5">{p.label}</td>
                  <td className="py-1.5 text-right">{p.value === null ? "—" : format(p.value)}</td>
                  {p.details?.map((d) => (
                    <td key={d.label} className="py-1.5 text-right">
                      {d.value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={ref} className="relative h-48 w-full select-none">
          {width > 0 && children(width)}
        </div>
      )}
    </section>
  );
}

const HEIGHT = 192;
const PAD = { top: 12, right: 8, bottom: 22, left: 40 };

function niceTicks(min: number, max: number, count = 4) {
  const span = max - min || 1;
  const rawStep = span / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rawStep) ?? rawStep;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

function Tooltip({ x, width, point, format }: { x: number; width: number; point: Point; format: (n: number) => string }) {
  const left = Math.min(Math.max(x - 70, 0), width - 140);
  return (
    <div role="status" className="pointer-events-none absolute top-0 z-10 w-[140px] rounded-lg border bg-popover px-2.5 py-2 text-xs shadow-md" style={{ left }}>
      <p className="text-muted-foreground">{point.label}</p>
      <p className="text-sm font-semibold text-foreground">{point.value === null ? "No data" : format(point.value)}</p>
      {point.details?.map((d) => (
        <p key={d.label} className="flex justify-between gap-2 text-muted-foreground">
          <span>{d.label}</span>
          <span className="text-foreground">{d.value}</span>
        </p>
      ))}
    </div>
  );
}

interface Reference {
  value: number;
  label: string;
}

function Axes({ width, ticks, y, format, points, x }: { width: number; ticks: number[]; y: (v: number) => number; format: (n: number) => string; points: Point[]; x: (i: number) => number }) {
  const labelEvery = Math.max(1, Math.ceil(points.length / 5));
  return (
    <g className="text-[10px]">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className="stroke-grid" strokeWidth={1} />
          <text x={PAD.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground tabular-nums">
            {format(t)}
          </text>
        </g>
      ))}
      {points.map((p, i) =>
        (points.length - 1 - i) % labelEvery === 0 ? (
          <text key={p.key} x={x(i)} y={HEIGHT - 6} textAnchor="middle" className="fill-muted-foreground">
            {p.label}
          </text>
        ) : null,
      )}
    </g>
  );
}

function ReferenceLine({ reference, y, width }: { reference: Reference; y: (v: number) => number; width: number }) {
  return (
    <g>
      <line x1={PAD.left} x2={width - PAD.right} y1={y(reference.value)} y2={y(reference.value)} className="stroke-muted-foreground" strokeWidth={1} strokeDasharray="4 3" />
      <text x={width - PAD.right} y={y(reference.value) - 4} textAnchor="end" className="fill-muted-foreground text-[10px] font-medium">
        {reference.label}
      </text>
    </g>
  );
}

/** Single-series line with a crosshair that snaps to the nearest date. */
export function LineChart({ width, points, format, reference }: { width: number; points: Point[]; format: (n: number) => string; reference?: Reference }) {
  const [active, setActive] = useState<number | null>(null);
  const gradient = useId();
  const values = points.map((p) => p.value).filter((v): v is number => v !== null);
  if (values.length === 0) return <Empty />;

  const all = reference ? [...values, reference.value] : values;
  const ticks = niceTicks(Math.min(...all) - 0.5, Math.max(...all) + 0.5);
  const [min, max] = [ticks[0], ticks.at(-1)!];
  const plotW = width - PAD.left - PAD.right;
  const x = (i: number) => PAD.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min || 1)) * (HEIGHT - PAD.top - PAD.bottom);

  const defined = points.map((p, i) => ({ p, i })).filter(({ p }) => p.value !== null);
  const path = defined.map(({ p, i }, n) => `${n ? "L" : "M"}${x(i)},${y(p.value!)}`).join(" ");
  const area = `${path} L${x(defined.at(-1)!.i)},${HEIGHT - PAD.bottom} L${x(defined[0].i)},${HEIGHT - PAD.bottom} Z`;
  const last = defined.at(-1)!;

  function onMove(clientX: number, rect: DOMRect) {
    const rel = clientX - rect.left;
    let best = defined[0];
    for (const d of defined) if (Math.abs(x(d.i) - rel) < Math.abs(x(best.i) - rel)) best = d;
    setActive(best.i);
  }

  return (
    <>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`Line chart, latest ${format(last.p.value!)}`}
        className="touch-pan-y"
        onPointerMove={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerDown={(e) => onMove(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--series)" stopOpacity={0.14} />
            <stop offset="1" stopColor="var(--series)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Axes width={width} ticks={ticks} y={y} format={format} points={points} x={x} />
        {reference && <ReferenceLine reference={reference} y={y} width={width} />}
        <path d={area} fill={`url(#${gradient})`} />
        <path d={path} fill="none" stroke="var(--series)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {active !== null && <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={HEIGHT - PAD.bottom} className="stroke-muted-foreground" strokeWidth={1} />}
        {defined.map(({ p, i }) =>
          i === active || i === last.i ? (
            <circle key={p.key} cx={x(i)} cy={y(p.value!)} r={4.5} fill="var(--series)" stroke="var(--card)" strokeWidth={2} />
          ) : null,
        )}
        {active === null && (
          <text x={x(last.i)} y={y(last.p.value!) - 10} textAnchor="end" className="fill-foreground text-[11px] font-semibold">
            {format(last.p.value!)}
          </text>
        )}
      </svg>
      {active !== null && <Tooltip x={x(active)} width={width} point={points[active]} format={format} />}
    </>
  );
}

/**
 * Columns from a zero baseline. With `diverging`, positive values use the surplus hue and
 * negative ones the deficit hue.
 */
export function BarChart({
  width,
  points,
  format,
  reference,
  diverging,
}: {
  width: number;
  points: Point[];
  format: (n: number) => string;
  reference?: Reference;
  diverging?: boolean;
}) {
  const [active, setActive] = useState<number | null>(null);
  const values = points.map((p) => p.value).filter((v): v is number => v !== null);
  if (values.length === 0) return <Empty />;

  const all = [0, ...values, ...(reference ? [reference.value] : [])];
  const ticks = niceTicks(Math.min(...all), Math.max(...all));
  const [min, max] = [ticks[0], ticks.at(-1)!];
  const plotW = width - PAD.left - PAD.right;
  const band = plotW / points.length;
  const barW = Math.min(24, Math.max(3, band - 2));
  const x = (i: number) => PAD.left + band * i + band / 2;
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min || 1)) * (HEIGHT - PAD.top - PAD.bottom);
  const zero = y(0);

  return (
    <>
      <svg width={width} height={HEIGHT} role="img" aria-label="Bar chart" className="touch-pan-y" onPointerLeave={() => setActive(null)}>
        <Axes width={width} ticks={ticks} y={y} format={format} points={points} x={x} />
        {reference && <ReferenceLine reference={reference} y={y} width={width} />}
        {points.map((p, i) => {
          if (p.value === null || p.value === 0) return null;
          const top = Math.min(y(p.value), zero);
          const h = Math.max(1, Math.abs(y(p.value) - zero));
          const r = Math.min(4, barW / 2, h);
          const up = p.value > 0;
          const fill = diverging ? (up ? "var(--surplus)" : "var(--deficit)") : "var(--series)";
          const x0 = x(i) - barW / 2;
          // Rounded at the data end, square at the baseline.
          const d = up
            ? `M${x0},${top + h} V${top + r} Q${x0},${top} ${x0 + r},${top} H${x0 + barW - r} Q${x0 + barW},${top} ${x0 + barW},${top + r} V${top + h} Z`
            : `M${x0},${top} V${top + h - r} Q${x0},${top + h} ${x0 + r},${top + h} H${x0 + barW - r} Q${x0 + barW},${top + h} ${x0 + barW},${top + h - r} V${top} Z`;
          return <path key={p.key} d={d} fill={fill} opacity={active === null || active === i ? 1 : 0.45} />;
        })}
        <line x1={PAD.left} x2={width - PAD.right} y1={zero} y2={zero} className="stroke-muted-foreground" strokeWidth={1} />
        {points.map((p, i) => (
          <rect
            key={p.key}
            x={x(i) - band / 2}
            y={PAD.top}
            width={band}
            height={HEIGHT - PAD.top - PAD.bottom}
            fill="transparent"
            tabIndex={0}
            aria-label={`${p.label}: ${p.value === null ? "no data" : format(p.value)}`}
            onPointerEnter={() => setActive(i)}
            onPointerDown={() => setActive(i)}
            onFocus={() => setActive(i)}
            onBlur={() => setActive(null)}
            className="outline-none"
          />
        ))}
      </svg>
      {active !== null && <Tooltip x={x(active)} width={width} point={points[active]} format={format} />}
    </>
  );
}

function Empty() {
  return <div className={cn("grid h-full place-items-center text-sm text-muted-foreground")}>Not enough data yet</div>;
}
