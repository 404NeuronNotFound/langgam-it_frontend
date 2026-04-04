"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  month: string;
  net_worth: number;
}

interface Props {
  data: DataPoint[];
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const val: number = payload[0].value;
  return (
    <div style={tooltipStyle}>
      <p style={tooltipLabel}>{payload[0].payload.month}</p>
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
  const [chartKey, setChartKey] = useState(0);

  useEffect(() => {
    // Force re-render when data changes
    setChartKey(prev => prev + 1);
  }, [data]);

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

  // Get min and max values
  const values = data.map(d => d.net_worth);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  // Set explicit domain - no padding, just use actual min/max
  const yMin = Math.floor(minValue / 10000) * 10000; // Round down to nearest 10k
  const yMax = Math.ceil(maxValue / 10000) * 10000;  // Round up to nearest 10k

  const chartHeight = 280;

  return (
    <ResponsiveContainer width="100%" height={chartHeight} key={chartKey}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: "var(--text-3)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="number"
          domain={[yMin, yMax]}
          tick={{ fontSize: 12, fill: "var(--text-3)" }}
          axisLine={false}
          tickLine={false}
          width={70}
          tickFormatter={(value) =>
            `₱${(value / 1000).toFixed(0)}K`
          }
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="linear"
          dataKey="net_worth"
          stroke="var(--text-1)"
          strokeWidth={2}
          dot={{ fill: "var(--text-1)", r: 4 }}
          activeDot={{ r: 6 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-md)",
  borderRadius: 8,
  padding: "10px 12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

const tooltipLabel: React.CSSProperties = {
  fontSize: 12,
  color: "var(--text-3)",
  marginBottom: 4,
};

const tooltipValue: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: "var(--text-1)",
  margin: 0,
};

const emptyStyle: React.CSSProperties = {
  height: 280,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  textAlign: "center",
};
