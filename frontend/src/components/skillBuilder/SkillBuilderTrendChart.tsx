import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface SkillBuilderTrendChartProps {
  data: Array<{
    label: string;
    score: number;
  }>;
}

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "0.75rem",
  fontFamily: "JetBrains Mono",
  fontSize: "12px",
};

export default function SkillBuilderTrendChart({ data }: SkillBuilderTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid stroke="hsl(var(--border) / 0.35)" vertical={false} />
        <XAxis
          dataKey="label"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="score"
          stroke="hsl(var(--neon-cyan))"
          strokeWidth={2.5}
          dot={{ fill: "hsl(var(--neon-cyan))", r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
