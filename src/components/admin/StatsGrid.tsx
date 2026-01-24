import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShieldAlert, Users, Package } from "lucide-react";

interface AdminStatsGridProps {
    stats: {
        revenue: number;
        alerts: number;
        sellers: number;
        items: number;
    }
}

export function AdminStatsGrid({ stats }: AdminStatsGridProps) {
  const items = [
    { title: "Revenue", value: `$${stats.revenue.toLocaleString()}`, icon: DollarSign, color: "text-green-500" },
    { title: "Risk Alerts", value: stats.alerts, icon: ShieldAlert, color: "text-red-500" },
    { title: "Active Sellers", value: stats.sellers, icon: Users, color: "text-blue-500" },
    { title: "Total Items", value: stats.items, icon: Package, color: "text-purple-500" },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {items.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
