"use client";
import { useId, useMemo, useRef, useState } from "react";

// Lightweight SVG charts. One y-axis, recessive grid, 2px lines, rounded bar
// tops, hover tooltip, and a visually-hidden data table for screen readers.

export type Point = { x: string; y: number | null; y2?: number | null };

const W = 640, PAD = { l: 40, r: 12, t: 12, b: 26 };

function niceTicks(min: number, max: number, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min;
  const step = Math.pow(10, Math.floor(Math.log10(span / count)));
  const err = span / count / step;
  const nice = (err >= 7.5 ? 10 : err >= 3 ? 5 : err >= 1.5 ? 2 : 1) * step;
  const lo = Math.floor(min / nice) * nice, hi = Math.ceil(max / nice) * nice;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + nice / 2; v += nice) ticks.push(Math.round(v * 100) / 100);
  return { lo, hi, ticks };
}

function useHover(n: number, innerW: number) {
  const [idx, setIdx] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || n === 0) return;
    const x = ((e.clientX - r.left) / r.width) * W - PAD.l;
    setIdx(Math.max(0, Math.min(n - 1, Math.round((x / innerW) * (n - 1)))));
  };
  return { idx, setIdx, ref, onMove };
}

function Tooltip({ x, y, lines, height }: { x: number; y: number; lines: string[]; height: number }) {
  const left = Math.min(W - 150, Math.max(0, x - 70));
  return (
    <foreignObject x={left} y={Math.max(0, Math.min(height - 60, y - 64))} width="150" height="60" style={{ pointerEvents: "none" }}>
      <div className="rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 text-[11px] leading-snug shadow-[var(--shadow-float)]">
        {lines.map((l, i) => <div key={i} className={i === 0 ? "text-fg-3" : "font-semibold text-fg tabular"}>{l}</div>)}
      </div>
    </foreignObject>
  );
}

function DataTable({ id, caption, points, yLabel, y2Label }: { id: string; caption: string; points: Point[]; yLabel: string; y2Label?: string }) {
  return (
    <table id={id} className="sr-only">
      <caption>{caption}</caption>
      <thead><tr><th>Date</th><th>{yLabel}</th>{y2Label && <th>{y2Label}</th>}</tr></thead>
      <tbody>{points.map((p) => <tr key={p.x}><td>{p.x}</td><td>{p.y ?? "—"}</td>{y2Label && <td>{p.y2 ?? "—"}</td>}</tr>)}</tbody>
    </table>
  );
}

/** Line chart. `y` = primary series (accent line). Optional `y2` = raw values shown as muted dots (e.g. daily weigh-ins under a trend). */
export function LineChart({ points, height = 200, label, unit = "", y2Label, target, format = (v: number) => String(v) }: { points: Point[]; height?: number; label: string; unit?: string; y2Label?: string; target?: number | null; format?: (v: number) => string }) {
  const tableId = useId();
  const innerW = W - PAD.l - PAD.r, innerH = height - PAD.t - PAD.b;
  const vals = points.flatMap((p) => [p.y, p.y2]).filter((v): v is number => v != null);
  if (target != null) vals.push(target);
  const { lo, hi, ticks } = useMemo(() => niceTicks(Math.min(...vals), Math.max(...vals)), [vals.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
  const { idx, setIdx, ref, onMove } = useHover(points.length, innerW);
  if (!vals.length) return null;
  const sx = (i: number) => PAD.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const sy = (v: number) => PAD.t + innerH - ((v - lo) / (hi - lo || 1)) * innerH;
  const path = points.reduce((d, p, i) => (p.y == null ? d : d + `${d && !d.endsWith("M") ? "L" : "M"}${sx(i).toFixed(1)},${sy(p.y).toFixed(1)}`), "");
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));
  const hp = idx != null ? points[idx] : null;

  return (
    <figure className="w-full">
      <svg ref={ref} viewBox={`0 0 ${W} ${height}`} className="w-full touch-none select-none" role="img" aria-label={`${label} chart`} aria-describedby={tableId}
        onPointerMove={onMove} onPointerLeave={() => setIdx(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} stroke="var(--border)" strokeWidth="1" />
            <text x={PAD.l - 8} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-3)" className="tabular">{format(t)}</text>
          </g>
        ))}
        {points.map((p, i) => i % labelEvery === 0 && (
          <text key={p.x} x={sx(i)} y={height - 6} textAnchor="middle" fontSize="11" fill="var(--text-3)">{p.x}</text>
        ))}
        {target != null && (
          <g>
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(target)} y2={sy(target)} stroke="var(--text-3)" strokeDasharray="4 4" strokeWidth="1" />
            <text x={W - PAD.r} y={sy(target) - 5} textAnchor="end" fontSize="11" fill="var(--text-2)">Target {format(target)}</text>
          </g>
        )}
        {points.map((p, i) => p.y2 != null && <circle key={`d${i}`} cx={sx(i)} cy={sy(p.y2)} r="3" fill="var(--text-3)" opacity="0.7" />)}
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.length <= 24 && points.map((p, i) => p.y != null && <circle key={i} cx={sx(i)} cy={sy(p.y)} r="4" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />)}
        {hp && idx != null && hp.y != null && (
          <g>
            <line x1={sx(idx)} x2={sx(idx)} y1={PAD.t} y2={PAD.t + innerH} stroke="var(--border-strong)" strokeWidth="1" />
            <circle cx={sx(idx)} cy={sy(hp.y)} r="5" fill="var(--accent)" stroke="var(--surface)" strokeWidth="2" />
            <Tooltip x={sx(idx)} y={sy(hp.y)} height={height} lines={[hp.x, `${label}: ${format(hp.y)}${unit}`, ...(hp.y2 != null && y2Label ? [`${y2Label}: ${format(hp.y2)}${unit}`] : [])]} />
          </g>
        )}
      </svg>
      {y2Label && (
        <figcaption className="mt-2 flex gap-4 text-xs text-fg-2">
          <span className="inline-flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-accent" />{label}</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-fg-3" />{y2Label}</span>
        </figcaption>
      )}
      <DataTable id={tableId} caption={label} points={points} yLabel={label} y2Label={y2Label} />
    </figure>
  );
}

export function BarChart({ points, height = 180, label, unit = "", target, format = (v: number) => String(Math.round(v)) }: { points: Point[]; height?: number; label: string; unit?: string; target?: number | null; format?: (v: number) => string }) {
  const tableId = useId();
  const innerW = W - PAD.l - PAD.r, innerH = height - PAD.t - PAD.b;
  const max = Math.max(...points.map((p) => p.y ?? 0), target ?? 0, 1);
  const { hi, ticks } = niceTicks(0, max);
  const { idx, setIdx, ref, onMove } = useHover(points.length, innerW);
  const slot = innerW / Math.max(1, points.length);
  const bw = Math.max(3, Math.min(28, slot - 2)); // 2px gap between bars
  const sy = (v: number) => PAD.t + innerH - (v / hi) * innerH;
  const labelEvery = Math.max(1, Math.ceil(points.length / 7));
  const hp = idx != null ? points[idx] : null;
  return (
    <figure className="w-full">
      <svg ref={ref} viewBox={`0 0 ${W} ${height}`} className="w-full touch-none select-none" role="img" aria-label={`${label} chart`} aria-describedby={tableId}
        onPointerMove={onMove} onPointerLeave={() => setIdx(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(t)} y2={sy(t)} stroke="var(--border)" strokeWidth="1" />
            <text x={PAD.l - 8} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="var(--text-3)" className="tabular">{format(t)}</text>
          </g>
        ))}
        {points.map((p, i) => {
          const x = PAD.l + i * slot + (slot - bw) / 2;
          const v = p.y ?? 0;
          const h = Math.max(0, sy(0) - sy(v));
          const r = Math.min(4, bw / 2, h);
          return (
            <g key={p.x}>
              {v > 0 && <path d={`M${x},${sy(0)} V${sy(v) + r} Q${x},${sy(v)} ${x + r},${sy(v)} H${x + bw - r} Q${x + bw},${sy(v)} ${x + bw},${sy(v) + r} V${sy(0)} Z`} fill={idx === i ? "var(--accent-hover)" : "var(--accent)"} opacity={idx == null || idx === i ? 1 : 0.55} />}
              {i % labelEvery === 0 && <text x={x + bw / 2} y={height - 6} textAnchor="middle" fontSize="11" fill="var(--text-3)">{p.x}</text>}
            </g>
          );
        })}
        {target != null && target > 0 && (
          <g>
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(target)} y2={sy(target)} stroke="var(--text-2)" strokeDasharray="4 4" strokeWidth="1" />
            <text x={W - PAD.r} y={sy(target) - 5} textAnchor="end" fontSize="11" fill="var(--text-2)">Target {format(target)}</text>
          </g>
        )}
        {hp && idx != null && <Tooltip x={PAD.l + idx * slot + slot / 2} y={sy(hp.y ?? 0)} height={height} lines={[hp.x, hp.y != null && hp.y > 0 ? `${format(hp.y)}${unit}` : "Not logged"]} />}
      </svg>
      <DataTable id={tableId} caption={label} points={points} yLabel={label} />
    </figure>
  );
}
