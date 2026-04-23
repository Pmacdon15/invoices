import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReactNode } from "react";

interface KPICardProps {
  title: string;
  valuePromise: Promise<number>;
  icon: ReactNode;
  subtext: string;
  prefix?: string;
  suffix?: string;
}

export async function KPICard({
  title,
  valuePromise,
  icon,
  subtext,
  prefix = "",
  suffix = "",
}: KPICardProps) {
  const value = await valuePromise;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {prefix}
          {value.toLocaleString()}
          {suffix}
        </div>
        <p className="text-xs text-muted-foreground">{subtext}</p>
      </CardContent>
    </Card>
  );
}
