import {
  CheckCircle,
  DollarSign,
  FileText,
  Receipt,
  Send,
  Users,
} from "lucide-react";
import { Suspense } from "react";
import { KPICard } from "@/components/stats/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatsDal } from "@/dal/stats";
import { StatsChart } from "./stats-chart";

function KPISkeleton() {
  return <Skeleton className="h-30 w-full rounded-xl" />;
}

function ChartSkeleton() {
  return <Skeleton className="h-100 w-full mt-4" />;
}

export default async function StatsPage() {
  // Start the fetch but don't await it here
  const statsResponsePromise = getStatsDal();

  // Break off promises for individual components
  const dataPromise = statsResponsePromise.then((res) => {
    if (res.error) throw new Error(res.error);
    return res.data || [];
  });

  const revenuePromise = dataPromise.then((data) =>
    data.reduce((acc, curr) => acc + curr.revenue, 0),
  );
  const owingPromise = dataPromise.then((data) =>
    data.reduce((acc, curr) => acc + curr.owing, 0),
  );
  const customersPromise = dataPromise.then((data) =>
    data.reduce((acc, curr) => acc + curr.customers, 0),
  );
  const invoicesPromise = dataPromise.then((data) =>
    data.reduce((acc, curr) => acc + curr.invoices, 0),
  );
  const draftInvoicesPromise = dataPromise.then((data) =>
    data.reduce((acc, curr) => acc + curr.draftInvoices, 0),
  );
  const sentInvoicesPromise = dataPromise.then((data) =>
    data.reduce((acc, curr) => acc + curr.sentInvoices, 0),
  );
  const paidInvoicesPromise = dataPromise.then((data) =>
    data.reduce((acc, curr) => acc + curr.paidInvoices, 0),
  );

  return (
    <div className="container mx-auto p-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Organization Statistics
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor your key performance indicators and financial health over
          time.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<KPISkeleton />}>
          <KPICard
            title="Total Revenue"
            valuePromise={revenuePromise}
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            subtext="In the last 12 months"
            prefix="$"
          />
        </Suspense>

        <Suspense fallback={<KPISkeleton />}>
          <KPICard
            title="Amount Owing"
            valuePromise={owingPromise}
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            subtext="From unpaid sent invoices"
            prefix="$"
          />
        </Suspense>

        <Suspense fallback={<KPISkeleton />}>
          <KPICard
            title="Active Customers"
            valuePromise={customersPromise}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
            subtext="Billed in the last 12 months"
          />
        </Suspense>

        <Suspense fallback={<KPISkeleton />}>
          <KPICard
            title="Total Invoices"
            valuePromise={invoicesPromise}
            icon={<Receipt className="h-4 w-4 text-muted-foreground" />}
            subtext="In the last 12 months"
          />
        </Suspense>

        <Suspense fallback={<KPISkeleton />}>
          <KPICard
            title="Draft Invoices"
            valuePromise={draftInvoicesPromise}
            icon={<FileText className="h-4 w-4 text-muted-foreground" />}
            subtext="Created in the last 12 months"
          />
        </Suspense>

        <Suspense fallback={<KPISkeleton />}>
          <KPICard
            title="Sent Invoices"
            valuePromise={sentInvoicesPromise}
            icon={<Send className="h-4 w-4 text-muted-foreground" />}
            subtext="Emailed in the last 12 months"
          />
        </Suspense>

        <Suspense fallback={<KPISkeleton />}>
          <KPICard
            title="Paid Invoices"
            valuePromise={paidInvoicesPromise}
            icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
            subtext="Completed in the last 12 months"
          />
        </Suspense>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <Suspense fallback={<ChartSkeleton />}>
            <StatsChart dataPromise={dataPromise} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
