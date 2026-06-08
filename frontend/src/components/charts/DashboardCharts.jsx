import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function SystemActivityChart({ data }) {
  return (
    <div className="chart-shell prototype-chart">
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.24} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#eef2f6" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} stroke="#a0aec0" fontSize={11} />
          <YAxis hide domain={[0, "dataMax + 5"]} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e6edf5",
              boxShadow: "0 12px 28px rgba(15, 23, 42, 0.08)",
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#16a34a"
            strokeWidth={3}
            fill="url(#activityFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
