"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ------------------------------------------------------------------
// Langgam-It — NetWorthChart
// Recharts line chart — consistent design tokens
// Props: data (array of { month: string, net_worth: number })
// ------------------------------------------------------------------

interface DataPoint {
  month: string;
  net_worth: number;
}

interface Props {
  data: DataPoint[];
}

// Custom tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const val: number = payload[0].value;
  return (
    <div style={tooltipStyle}>
      <p style={tooltipLabel}>{label}</p>
      <p style={tooltipValue}>
        {new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: "PHP",
          minimumFractionDigits: 2,
        }).format(val)}
      </p>
    </div>
  );
}

export default function NetWorthChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div style={emptyStyle}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ color: "var(--text-3)", marginBottom: 8 }}>
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
          <polyline points="16 7 22 7 22 13" />
        </svg>
        <p style={{ fontSize: 13, color: "var(--text-3)" }}>
          Net worth history will appear here after your first month.
        </p>
      </div>
    );
  }

  // Responsive height based on screen size
  const chartHeight = typeof window !== 'undefined' && window.innerWidth >= 1024 ? 280 : 220;

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="4 4"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "var(--text-3)", fontFamily: "inherit" }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--text-3)", fontFamily: "inherit" }}
          axisLine={false}
          tickLine={false}
          dx={-4}
          tickFormatter={(v) =>
            new Intl.NumberFormat("en-PH", {
              notation: "compact",
              compactDisplay: "short",
              currency: "PHP",
              style: "currency",
            }).format(v)
          }
          width={64}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border-md)", strokeWidth: 1 }} />
        <Line
          type="monotone"
          dataKey="net_worth"
          stroke="var(--text-1)"
          strokeWidth={1.5}
          dot={{ r: 3, fill: "var(--bg-card)", stroke: "var(--text-1)", strokeWidth: 1.5 }}
          activeDot={{ r: 4, fill: "var(--text-1)", strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Inline styles (no className conflicts) ────────────────────────

const tooltipStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "0.5px solid var(--border-md)",
  borderRadius: 8,
  padding: "8px 12px",
  fontFamily: "inherit",
  boxShadow: "none",
};

const tooltipLabel: React.CSSProperties = {
  fontSize: 11,
  color: "var(--text-3)",
  marginBottom: 2,
};

const tooltipValue: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  color: "var(--text-1)",
};

const emptyStyle: React.CSSProperties = {
  height: typeof window !== 'undefined' && window.innerWidth >= 1024 ? 280 : 220,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 4,
  textAlign: "center",
};