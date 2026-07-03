"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const data = [
  { day: "月", calls: 320, ai: 210 },
  { day: "火", calls: 410, ai: 290 },
  { day: "水", calls: 380, ai: 260 },
  { day: "木", calls: 460, ai: 340 },
  { day: "金", calls: 520, ai: 400 },
  { day: "土", calls: 280, ai: 220 },
  { day: "日", calls: 190, ai: 150 },
];

export function CallVolumeChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="fillCalls" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0f1b2d" stopOpacity={0.5} />
            <stop offset="95%" stopColor="#0f1b2d" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="fillAi" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.6} />
            <stop offset="95%" stopColor="#c9a84c" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
        <YAxis tickLine={false} axisLine={false} fontSize={12} width={40} />
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="calls"
          name="総着信数"
          stroke="#0f1b2d"
          fill="url(#fillCalls)"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="ai"
          name="AI応答数"
          stroke="#c9a84c"
          fill="url(#fillAi)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
