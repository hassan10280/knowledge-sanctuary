import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Package, Eye, Loader2, ArrowUpDown, X, DollarSign, Calendar } from "lucide-react";

interface Order {
  id: string; user_id: string; total: number; shipping_cost: number | null;
  coupon_discount: number | null; discount_amount: number | null; status: string;
  payment_method: string; transaction_id: string | null; billing_name: string | null;
  billing_address: string | null; billing_city: string | null; billing_postcode: string | null;
  billing_country: string | null; created_at: string; coupon_id: string | null;
}

interface OrderItem {
  id: string; title: string; price: number; quantity: number; book_id: string;
}

const STATUS_OPTIONS = ["pending", "processing", "completed", "cancelled"] as const;

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const AdminOrdersTab = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders").select("*").order("created_at", { ascending: false });
    if (!error && data) setOrders(data);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const hasFilters = statusFilter !== "all" || search || dateFrom || dateTo || sortBy !== "newest";
  const resetFilters = () => { setStatusFilter("all"); setSearch(""); setDateFrom(""); setDateTo(""); setSortBy("newest"); };

  const filtered = useMemo(() => {
    let result = orders.filter(o => {
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      const q = search.toLowerCase();
      const matchesSearch = !q || o.id.toLowerCase().includes(q) || (o.transaction_id?.toLowerCase().includes(q)) || (o.billing_name?.toLowerCase().includes(q));
      const orderDate = new Date(o.created_at);
      const matchesFrom = !dateFrom || orderDate >= new Date(dateFrom);
      const matchesTo = !dateTo || orderDate <= new Date(dateTo + "T23:59:59");
      return matchesStatus && matchesSearch && matchesFrom && matchesTo;
    });

    switch (sortBy) {
      case "oldest": result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case "total_high": result.sort((a, b) => b.total - a.total); break;
      case "total_low": result.sort((a, b) => a.total - b.total); break;
      default: result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
  }, [orders, search, statusFilter, sortBy, dateFrom, dateTo]);

  const totalRevenue = useMemo(() => filtered.reduce((s, o) => s + (o.status !== "cancelled" ? o.total : 0), 0), [filtered]);

  const openOrderDetail = async (order: Order) => {
    setSelectedOrder(order);
    setLoadingItems(true);
    const { data } = await supabase.from("order_items").select("*").eq("order_id", order.id);
    setOrderItems(data || []);
    setLoadingItems(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdatingStatus(true);
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (error) { toast.error("Failed to update status"); }
    else {
      toast.success(`Order status updated to ${newStatus}`);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder?.id === orderId) setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
    }
    setUpdatingStatus(false);
  };

  const itemsSubtotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Orders Management ({orders.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATUS_OPTIONS.map(s => {
            const count = orders.filter(o => o.status === s).length;
            return (
              <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                className={`p-3 rounded-lg border text-left transition-all ${statusFilter === s ? "ring-2 ring-primary/30" : ""} ${statusColors[s]}`}>
                <p className="text-lg font-bold">{count}</p>
                <p className="text-xs capitalize">{s}</p>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by Order ID, Transaction ID, or Name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="total_high">Total: High → Low</SelectItem>
              <SelectItem value="total_low">Total: Low → High</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">From Date</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 text-xs" />
          </div>
          <div className="flex-1 space-y-1">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider">To Date</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 text-xs" />
          </div>
          {hasFilters && (
            <Button size="sm" variant="ghost" className="h-9 text-xs gap-1" onClick={resetFilters}>
              <X className="h-3 w-3" /> Reset
            </Button>
          )}
        </div>

        {/* Revenue for filtered */}
        <div className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-lg">
          <DollarSign className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">Filtered Revenue:</span>
          <span className="text-sm font-bold">£{totalRevenue.toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">({filtered.length} orders)</span>
        </div>

        {/* Orders table */}
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-10 text-sm">No orders found.</p>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Order ID</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Total</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Txn ID</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(order => (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-muted/30" onClick={() => openOrderDetail(order)}>
                    <TableCell className="text-xs font-mono">{order.id.slice(0, 8)}...</TableCell>
                    <TableCell className="text-xs">{order.billing_name || "—"}</TableCell>
                    <TableCell className="text-xs font-semibold">£{Number(order.total).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${statusColors[order.status] || ""}`}>{order.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{order.transaction_id || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={e => { e.stopPropagation(); openOrderDetail(order); }}>
                        <Eye className="h-3 w-3" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Order Detail Modal */}
        <Dialog open={!!selectedOrder} onOpenChange={open => { if (!open) setSelectedOrder(null); }}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-serif">Order Details</DialogTitle></DialogHeader>
            {selectedOrder && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Order ID</p>
                    <p className="text-sm font-mono">{selectedOrder.id}</p>
                  </div>
                  <Select value={selectedOrder.status} onValueChange={v => updateOrderStatus(selectedOrder.id, v)} disabled={updatingStatus}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</p>
                  <p className="text-sm font-medium">{selectedOrder.billing_name || "N/A"}</p>
                  <p className="text-xs text-muted-foreground">{selectedOrder.billing_address}</p>
                  <p className="text-xs text-muted-foreground">{selectedOrder.billing_city}, {selectedOrder.billing_postcode}</p>
                  <p className="text-xs text-muted-foreground">{selectedOrder.billing_country}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment</p>
                  <p className="text-sm">Method: <span className="font-medium">{selectedOrder.payment_method}</span></p>
                  <p className="text-sm">Transaction ID: <span className="font-mono font-medium">{selectedOrder.transaction_id || "—"}</span></p>
                  <p className="text-xs text-muted-foreground">Placed: {new Date(selectedOrder.created_at).toLocaleString("en-GB")}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Items</p>
                  {loadingItems ? (
                    <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
                  ) : orderItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No items found</p>
                  ) : (
                    <div className="space-y-2">
                      {orderItems.map(item => (
                        <div key={item.id} className="flex justify-between items-center py-1.5 border-b border-border/30 last:border-0">
                          <div>
                            <p className="text-sm">{item.title}</p>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity} × £{Number(item.price).toFixed(2)}</p>
                          </div>
                          <p className="text-sm font-semibold">£{(item.quantity * Number(item.price)).toFixed(2)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pricing Breakdown</p>
                  <div className="flex justify-between text-sm"><span>Items Subtotal</span><span>£{itemsSubtotal.toFixed(2)}</span></div>
                  {Number(selectedOrder.discount_amount) > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600"><span>Product Discounts</span><span>-£{Number(selectedOrder.discount_amount).toFixed(2)}</span></div>
                  )}
                  {Number(selectedOrder.coupon_discount) > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600"><span>Coupon Discount</span><span>-£{Number(selectedOrder.coupon_discount).toFixed(2)}</span></div>
                  )}
                  <div className="flex justify-between text-sm"><span>Shipping</span><span>{Number(selectedOrder.shipping_cost) === 0 ? "Free" : `£${Number(selectedOrder.shipping_cost).toFixed(2)}`}</span></div>
                  <div className="flex justify-between text-sm font-bold pt-2 border-t border-border"><span>Total Paid</span><span>£{Number(selectedOrder.total).toFixed(2)}</span></div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AdminOrdersTab;
