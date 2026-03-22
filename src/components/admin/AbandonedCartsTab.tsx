import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  TrendingDown,
  RefreshCw,
  Ticket,
  StickyNote,
  Trash2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface AbandonedCart {
  id: string;
  user_id: string | null;
  session_id: string | null;
  cart_items: Array<{ id: string; title: string; price: number; quantity: number }>;
  subtotal: number;
  status: string;
  recovery_coupon_code: string | null;
  admin_notes: string | null;
  notified_at: string | null;
  recovered_at: string | null;
  created_at: string;
  updated_at: string;
}

function useAbandonedCarts(statusFilter: string) {
  return useQuery({
    queryKey: ["abandoned-carts", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("abandoned_carts" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as AbandonedCart[];
    },
    refetchInterval: 30000,
  });
}

function useAbandonedCartStats() {
  return useQuery({
    queryKey: ["abandoned-cart-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("abandoned_carts" as any)
        .select("status, subtotal, created_at");
      if (error) throw error;
      const carts = (data || []) as unknown as Array<{ status: string; subtotal: number; created_at: string }>;

      const total = carts.length;
      const abandoned = carts.filter((c) => c.status === "abandoned").length;
      const recovered = carts.filter((c) => c.status === "recovered").length;
      const active = carts.filter((c) => c.status === "active").length;
      const lostRevenue = carts
        .filter((c) => c.status === "abandoned")
        .reduce((sum, c) => sum + Number(c.subtotal || 0), 0);
      const recoveredRevenue = carts
        .filter((c) => c.status === "recovered")
        .reduce((sum, c) => sum + Number(c.subtotal || 0), 0);
      const recoveryRate = abandoned + recovered > 0
        ? ((recovered / (abandoned + recovered)) * 100).toFixed(1)
        : "0";

      return { total, abandoned, recovered, active, lostRevenue, recoveredRevenue, recoveryRate };
    },
    refetchInterval: 30000,
  });
}

export default function AbandonedCartsTab() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState<Record<string, string>>({});
  const [notesInput, setNotesInput] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const { data: carts, isLoading, refetch } = useAbandonedCarts(statusFilter);
  const { data: stats } = useAbandonedCartStats();

  const updateCart = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("abandoned_carts" as any)
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["abandoned-carts"] });
      qc.invalidateQueries({ queryKey: ["abandoned-cart-stats"] });
    },
  });

  const deleteCart = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("abandoned_carts" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["abandoned-carts"] });
      qc.invalidateQueries({ queryKey: ["abandoned-cart-stats"] });
      toast.success("Cart record deleted");
    },
  });

  const handleAssignCoupon = async (cartId: string) => {
    const code = couponInput[cartId]?.trim();
    if (!code) return;
    try {
      await updateCart.mutateAsync({ id: cartId, updates: { recovery_coupon_code: code } });
      toast.success(`Coupon "${code}" assigned`);
      setCouponInput((prev) => ({ ...prev, [cartId]: "" }));
    } catch {
      toast.error("Failed to assign coupon");
    }
  };

  const handleSaveNotes = async (cartId: string) => {
    try {
      await updateCart.mutateAsync({ id: cartId, updates: { admin_notes: notesInput[cartId] || "" } });
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    }
  };

  const handleMarkRecovered = async (cartId: string) => {
    try {
      await updateCart.mutateAsync({
        id: cartId,
        updates: { status: "recovered", recovered_at: new Date().toISOString() },
      });
      toast.success("Marked as recovered");
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleExpire = async (cartId: string) => {
    try {
      await updateCart.mutateAsync({ id: cartId, updates: { status: "expired" } });
      toast.success("Marked as expired");
    } catch {
      toast.error("Failed to update");
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
      active: { label: "Active", variant: "secondary" },
      abandoned: { label: "Abandoned", variant: "destructive" },
      recovered: { label: "Recovered", variant: "default" },
      expired: { label: "Expired", variant: "outline" },
    };
    const s = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={s.variant} className="text-[10px]">{s.label}</Badge>;
  };

  const statCards = [
    { icon: ShoppingCart, label: "Total Carts", value: stats?.total || 0, color: "text-primary" },
    { icon: AlertTriangle, label: "Abandoned", value: stats?.abandoned || 0, color: "text-destructive" },
    { icon: CheckCircle2, label: "Recovered", value: stats?.recovered || 0, color: "text-emerald-600" },
    { icon: TrendingDown, label: "Lost Revenue", value: `£${(stats?.lostRevenue || 0).toFixed(2)}`, color: "text-destructive" },
    { icon: DollarSign, label: "Recovered Revenue", value: `£${(stats?.recoveredRevenue || 0).toFixed(2)}`, color: "text-emerald-600" },
    { icon: Clock, label: "Recovery Rate", value: `${stats?.recoveryRate || 0}%`, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-[11px] text-muted-foreground font-medium">{s.label}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="font-serif flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Abandoned Carts
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {["all", "active", "abandoned", "recovered", "expired"].map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                  statusFilter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>
          ) : !carts || carts.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">No carts found</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Items</TableHead>
                    <TableHead className="text-xs">Subtotal</TableHead>
                    <TableHead className="text-xs">User</TableHead>
                    <TableHead className="text-xs">Created</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {carts.map((cart) => (
                    <>
                      <TableRow
                        key={cart.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setExpandedId(expandedId === cart.id ? null : cart.id)}
                      >
                        <TableCell>{statusBadge(cart.status)}</TableCell>
                        <TableCell className="text-sm">
                          {(cart.cart_items || []).length} items
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          £{Number(cart.subtotal).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {cart.user_id ? cart.user_id.slice(0, 8) + "…" : `Guest (${cart.session_id?.slice(0, 8)}…)`}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(cart.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {cart.status === "abandoned" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-[10px] gap-1"
                                onClick={(e) => { e.stopPropagation(); handleMarkRecovered(cart.id); }}
                              >
                                <CheckCircle2 className="h-3 w-3" /> Recover
                              </Button>
                            )}
                            {(cart.status === "active" || cart.status === "abandoned") && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-[10px]"
                                onClick={(e) => { e.stopPropagation(); handleExpire(cart.id); }}
                              >
                                Expire
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[10px] text-destructive"
                              onClick={(e) => { e.stopPropagation(); if (confirm("Delete this cart record?")) deleteCart.mutate(cart.id); }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expandedId === cart.id && (
                        <TableRow key={`${cart.id}-detail`}>
                          <TableCell colSpan={6} className="bg-muted/30">
                            <div className="p-4 space-y-4">
                              {/* Cart Items */}
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Cart Items</h4>
                                <div className="space-y-1">
                                  {(cart.cart_items || []).map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                      <span>{item.title} × {item.quantity}</span>
                                      <span className="font-medium">£{(item.price * item.quantity).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Recovery Coupon */}
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                                  <Ticket className="h-3 w-3" /> Recovery Coupon
                                </h4>
                                {cart.recovery_coupon_code ? (
                                  <Badge variant="secondary" className="text-xs">{cart.recovery_coupon_code}</Badge>
                                ) : (
                                  <div className="flex gap-2">
                                    <Input
                                      placeholder="Enter coupon code..."
                                      value={couponInput[cart.id] || ""}
                                      onChange={(e) => setCouponInput((p) => ({ ...p, [cart.id]: e.target.value }))}
                                      className="h-8 text-xs max-w-[200px]"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <Button
                                      size="sm"
                                      className="h-8 text-xs"
                                      onClick={(e) => { e.stopPropagation(); handleAssignCoupon(cart.id); }}
                                    >
                                      Assign
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {/* Admin Notes */}
                              <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                                  <StickyNote className="h-3 w-3" /> Admin Notes
                                </h4>
                                <div className="flex gap-2">
                                  <Textarea
                                    placeholder="Add notes..."
                                    value={notesInput[cart.id] ?? cart.admin_notes ?? ""}
                                    onChange={(e) => setNotesInput((p) => ({ ...p, [cart.id]: e.target.value }))}
                                    className="text-xs min-h-[60px]"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-xs shrink-0"
                                    onClick={(e) => { e.stopPropagation(); handleSaveNotes(cart.id); }}
                                  >
                                    Save
                                  </Button>
                                </div>
                              </div>

                              {/* Metadata */}
                              <div className="text-[11px] text-muted-foreground space-y-0.5">
                                <p>Created: {format(new Date(cart.created_at), "dd MMM yyyy, HH:mm")}</p>
                                <p>Updated: {format(new Date(cart.updated_at), "dd MMM yyyy, HH:mm")}</p>
                                {cart.notified_at && <p>Notified: {format(new Date(cart.notified_at), "dd MMM yyyy, HH:mm")}</p>}
                                {cart.recovered_at && <p>Recovered: {format(new Date(cart.recovered_at), "dd MMM yyyy, HH:mm")}</p>}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
