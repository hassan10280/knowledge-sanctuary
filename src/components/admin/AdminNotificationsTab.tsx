import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, BellOff, Check, CheckCheck, RefreshCw, ShoppingCart, Search, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Notification {
  id: string; order_id: string; user_id: string; message: string; is_read: boolean; created_at: string;
}

function useAdminNotifications() {
  return useQuery({
    queryKey: ["admin-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("admin_notifications").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return (data || []) as Notification[];
    },
    refetchInterval: 15000,
  });
}

function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("admin_notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });
}

function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("admin_notifications").update({ is_read: true }).eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });
}

function useBulkMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("admin_notifications").update({ is_read: true }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-notifications"] }),
  });
}

export default function AdminNotificationsTab() {
  const { data: notifications, isLoading, refetch } = useAdminNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const bulkMarkRead = useBulkMarkRead();
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase.channel("admin-notifications-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_notifications" }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [refetch]);

  const filtered = useMemo(() => {
    let result = notifications || [];
    if (filter === "unread") result = result.filter(n => !n.is_read);
    if (filter === "read") result = result.filter(n => n.is_read);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(n => n.message.toLowerCase().includes(q) || n.order_id.toLowerCase().includes(q));
    }
    return result;
  }, [notifications, filter, search]);

  const unreadCount = (notifications || []).filter(n => !n.is_read).length;
  const readCount = (notifications || []).filter(n => n.is_read).length;

  const toggleSelect = (id: string) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(n => n.id)));
  };

  const handleBulkMarkRead = async () => {
    const ids = Array.from(selected);
    try {
      await bulkMarkRead.mutateAsync(ids);
      toast.success(`${ids.length} notifications marked as read`);
      setSelected(new Set());
    } catch { toast.error("Failed to update"); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <CardTitle className="font-serif flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" /> Notifications
            </CardTitle>
            {unreadCount > 0 && <Badge variant="destructive" className="text-xs">{unreadCount} new</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={async () => { try { await markAllRead.mutateAsync(); toast.success("All marked as read"); } catch { toast.error("Failed"); } }} className="gap-1.5 text-xs">
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search notifications..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 mt-3">
          {([["all", `All (${notifications?.length || 0})`], ["unread", `Unread (${unreadCount})`], ["read", `Read (${readCount})`]] as const).map(([f, label]) => (
            <button key={f} onClick={() => setFilter(f as any)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"}`}>
              {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {/* Bulk Actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 p-2.5 bg-primary/5 border border-primary/20 rounded-lg mb-3">
            <span className="text-xs font-medium">{selected.size} selected</span>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleBulkMarkRead}>
              <Check className="h-3 w-3" /> Mark as Read
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Loading notifications...</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <BellOff className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">
              {search ? "No notifications match your search." : filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-auto">
            {filtered.length > 0 && (
              <div className="flex items-center gap-2 px-2 py-1">
                <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Select All</span>
              </div>
            )}
            {filtered.map(n => (
              <div key={n.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 ${n.is_read ? "bg-card border-border/30 opacity-70" : "bg-primary/5 border-primary/20 shadow-sm"}`}>
                <Checkbox checked={selected.has(n.id)} onCheckedChange={() => toggleSelect(n.id)} className="mt-1" />
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${n.is_read ? "bg-muted" : "bg-primary/10"}`}>
                  <ShoppingCart className={`h-4 w-4 ${n.is_read ? "text-muted-foreground" : "text-primary"}`} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className={`text-sm ${n.is_read ? "text-muted-foreground" : "text-foreground font-medium"}`}>{n.message}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{format(new Date(n.created_at), "dd MMM yyyy, HH:mm")}</span>
                    <span className="font-mono text-[10px]">#{n.order_id.slice(0, 8)}</span>
                  </div>
                </div>
                {!n.is_read && (
                  <Button variant="ghost" size="sm" onClick={() => markRead.mutateAsync(n.id).catch(() => toast.error("Failed"))} className="shrink-0 h-8 w-8 p-0" title="Mark as read">
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
