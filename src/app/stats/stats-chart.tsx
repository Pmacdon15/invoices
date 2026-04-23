"use client";

import { use } from "react";
import { 
  Line, 
  LineChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  Legend
} from "recharts";

interface StatsData {
  name: string; 
  revenue: number; 
  customers: number;
  invoices: number;
  draftInvoices: number;
  sentInvoices: number;
  paidInvoices: number;
  owing: number;
}

interface StatsChartProps {
  dataPromise: Promise<StatsData[]>;
}

export function StatsChart({ dataPromise }: StatsChartProps) {
  const data = use(dataPromise);

  if (!data || data.length === 0) {
    return <div className="h-[400px] w-full flex items-center justify-center text-muted-foreground mt-4">No data available</div>;
  }

  return (
    <div className="h-[400px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888888" strokeOpacity={0.2} />
          <XAxis 
            dataKey="name" 
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" }}
            labelStyle={{ fontWeight: "bold", color: "#333" }}
            itemStyle={{ fontSize: "14px" }}
          />
          <Legend wrapperStyle={{ paddingTop: "20px" }} />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="revenue" 
            name="Revenue"
            stroke="#0ea5e9" 
            strokeWidth={3} 
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6 }} 
          />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="owing" 
            name="Amount Owing"
            stroke="#ef4444" 
            strokeWidth={3} 
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6 }} 
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="customers" 
            name="Active Customers"
            stroke="#10b981" 
            strokeWidth={3} 
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6 }} 
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="invoices" 
            name="Total Invoices"
            stroke="#8b5cf6" 
            strokeWidth={3} 
            dot={{ r: 4, strokeWidth: 2 }}
            activeDot={{ r: 6 }} 
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="draftInvoices" 
            name="Draft Invoices"
            stroke="#94a3b8" 
            strokeWidth={2} 
            strokeDasharray="5 5"
            dot={{ r: 3, strokeWidth: 2 }}
            activeDot={{ r: 5 }} 
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="sentInvoices" 
            name="Sent Invoices"
            stroke="#f59e0b" 
            strokeWidth={2} 
            dot={{ r: 3, strokeWidth: 2 }}
            activeDot={{ r: 5 }} 
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="paidInvoices" 
            name="Paid Invoices"
            stroke="#22c55e" 
            strokeWidth={2} 
            dot={{ r: 3, strokeWidth: 2 }}
            activeDot={{ r: 5 }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
