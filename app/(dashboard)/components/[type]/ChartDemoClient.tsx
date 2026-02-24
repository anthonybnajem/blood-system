"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

const chartData = [
  { label: "Jan", value: 12 },
  { label: "Feb", value: 18 },
  { label: "Mar", value: 10 },
  { label: "Apr", value: 21 },
];

const chartConfig = {
  value: {
    label: "Value",
    color: "hsl(var(--primary))",
  },
};

export function ChartDemoClient() {
  return (
    <ChartContainer config={chartConfig} className="h-[260px] w-full">
      <BarChart data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} />
        <Bar dataKey="value" fill="var(--color-value)" radius={6} />
      </BarChart>
    </ChartContainer>
  );
}

