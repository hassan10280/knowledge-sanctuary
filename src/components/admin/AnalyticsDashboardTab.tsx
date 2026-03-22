import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart3, TrendingUp, ShoppingCart, Users, DollarSign, AlertTriangle,
  Ticket, Package, Truck, ArrowDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import {
  useAnalyticsEvents,
  computeFunnel,
  computeAbandonmentRate,
  computeAOV,
  computeTopProducts,
  computeCouponStats,
  computeRevenueByDay,
} from "@/hooks/useAnalytics";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const StatCard = ({
  icon: Icon,
  title,
  value,
  sub,
  warning,
}: {
  icon: any;
  title: string;
  value: string;
  sub?: string;
  warning?: boolean;
}) => (
  <Card className={warning ? "border-destructive/50 bg-destructive/5" : ""}>
    <CardContent className="pt-5 pb-4 px-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
        <Icon className={`h-4 w-4 ${warning ? "text-destructive" : "text-primary"}`} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </CardContent>
  </Card>
);

const AnalyticsDashboardTab = () => {
  const [days, setDays] = useState(30);
  const { data: events, isLoading } = useAnalyticsEvents(days);

  const funnel = useMemo(() => computeFunnel(events || []), [events]);
  const abandonmentRate = useMemo(() => computeAbandonmentRate(events || []), [events]);
  const aov = useMemo(() => computeAOV(events || []), [events]);
  const topProducts = useMemo(() => computeTopProducts(events || []), [events]);
  const couponStats = useMemo(() => computeCouponStats(events || []), [events]);
  const revenueByDay = useMemo(() => computeRevenueByDay(events || []), [events]);

  const totalRevenue = revenueByDay.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = revenueByDay.reduce((s, d) => s + d.orders, 0);
  const totalShipping = revenueByDay.reduce((s, d) => s + d.shipping, 0);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-6">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Analytics Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {(events || []).length} events tracked in last {days} days
          </p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-36 h-9 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={DollarSign}
          title="Total Revenue"
          value={`£${totalRevenue.toFixed(2)}`}
          sub={`${totalOrders} orders`}
        />
        <StatCard
          icon={TrendingUp}
          title="Avg Order Value"
          value={`£${aov.toFixed(2)}`}
          sub={totalOrders > 0 ? `From ${totalOrders} orders` : "No orders yet"}
        />
        <StatCard
          icon={ShoppingCart}
          title="Cart Abandonment"
          value={`${abandonmentRate}%`}
          sub={abandonmentRate > 70 ? "⚠️ High — consider follow-up emails" : "Healthy rate"}
          warning={abandonmentRate > 70}
        />
        <StatCard
          icon={Truck}
          title="Shipping Revenue"
          value={`£${totalShipping.toFixed(2)}`}
          sub={totalRevenue > 0 ? `${((totalShipping / totalRevenue) * 100).toFixed(1)}% of revenue` : ""}
        />
      </div>

      {/* Warnings */}
      {abandonmentRate > 70 && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive font-medium">
            High cart abandonment rate ({abandonmentRate}%). Consider adding checkout incentives or abandoned cart reminders.
          </p>
        </div>
      )}

      {/* Conversion Funnel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ArrowDown className="h-4 w-4 text-primary" /> Conversion Funnel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical" margin={{ left: 10, right: 30 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="step" width={100} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any, name: string) => [value, name === "count" ? "Sessions" : "Rate %"]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-4 gap-2 mt-3">
            {funnel.map((step) => (
              <div key={step.step} className="text-center p-2 bg-muted/50 rounded-lg">
                <p className="text-lg font-bold text-foreground">{step.count}</p>
                <p className="text-[10px] text-muted-foreground">{step.step}</p>
                <p className="text-[10px] font-medium text-primary">{step.rate}%</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Revenue Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {revenueByDay.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No revenue data yet</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueByDay} margin={{ left: 10, right: 10, top: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: any) => [`£${Number(value).toFixed(2)}`]}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="shipping" stroke="hsl(var(--chart-3))" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" /> Top Selling Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No sales data yet</p>
            ) : (
              <div className="space-y-2">
                {topProducts.map((product, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">#{i + 1}</span>
                      <span className="text-sm text-foreground truncate">{product.title}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-foreground">£{product.revenue.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">{product.count} sold</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coupon Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" /> Coupon Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            {couponStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No coupon usage yet</p>
            ) : (
              <div className="space-y-2">
                {couponStats.map((coupon, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-mono font-semibold text-foreground">{coupon.code}</p>
                      <p className="text-[10px] text-muted-foreground">{coupon.uses} applications</p>
                    </div>
                    <p className="text-sm font-semibold text-green-600">-£{coupon.totalDiscount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Shipping vs Revenue */}
      {revenueByDay.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" /> Shipping Cost vs Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByDay} margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: any, name: string) => [`£${Number(value).toFixed(2)}`, name === "revenue" ? "Revenue" : "Shipping"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="shipping" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Event Log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Recent Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {(events || []).slice(0, 50).map((e) => (
              <div key={e.id} className="flex items-center justify-between px-2.5 py-1.5 bg-muted/30 rounded text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="px-1.5 py-0.5 bg-primary/10 text-primary font-mono rounded text-[10px]">{e.event_name}</span>
                  {e.payload?.product_title && (
                    <span className="text-muted-foreground truncate">{String(e.payload.product_title)}</span>
                  )}
                  {e.payload?.final_total !== undefined && (
                    <span className="text-green-600 font-medium">£{Number(e.payload.final_total).toFixed(2)}</span>
                  )}
                </div>
                <span className="text-muted-foreground shrink-0 ml-2">
                  {new Date(e.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
            {(!events || events.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">No events tracked yet. Events will appear as users browse and purchase.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboardTab;
