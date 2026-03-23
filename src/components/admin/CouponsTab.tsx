import { useState, useMemo } from "react";
import { Plus, Trash2, Save, Ticket, Copy, Search, X, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useCoupons, useUpsertCoupon, useDeleteCoupon } from "@/hooks/useAdvancedDiscounts";
import { toast } from "sonner";
import { getErrorMessage, isBlank, isValidNumber } from "@/lib/admin-submit";

interface CouponsTabProps { wholesaleOnly?: boolean; retailOnly?: boolean; }

const CouponsTab = ({ wholesaleOnly, retailOnly }: CouponsTabProps) => {
  const { data: allCoupons, isLoading } = useCoupons();
  const upsert = useUpsertCoupon();
  const deleteCoupon = useDeleteCoupon();
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const baseCoupons = useMemo(() => {
    let c = allCoupons || [];
    if (wholesaleOnly) c = c.filter(x => x.wholesale_only);
    if (retailOnly) c = c.filter(x => !x.wholesale_only);
    return c;
  }, [allCoupons, wholesaleOnly, retailOnly]);

  const filtered = useMemo(() => {
    let result = baseCoupons.map(c => {
      const isExpired = c.expiry_date && new Date(c.expiry_date) < new Date();
      const isMaxed = c.usage_limit && c.used_count >= c.usage_limit;
      const effectiveStatus = !c.is_active ? "inactive" : isExpired ? "expired" : isMaxed ? "maxed" : "active";
      return { ...c, _status: effectiveStatus };
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c => c.code.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") result = result.filter(c => c._status === statusFilter);

    switch (sortBy) {
      case "oldest": result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case "code_asc": result.sort((a, b) => a.code.localeCompare(b.code)); break;
      case "most_used": result.sort((a, b) => b.used_count - a.used_count); break;
      default: result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
  }, [baseCoupons, search, statusFilter, sortBy]);

  const handleSave = async () => {
    if (!editing) { toast.error("No coupon data found."); return; }
    if (isBlank(editing.code)) { toast.error("Coupon Code is required."); return; }
    if (!isValidNumber(Number(editing.discount_value), { min: 0.01 })) { toast.error("Discount Value must be > 0."); return; }
    if (!isValidNumber(Number(editing.min_order_amount ?? 0), { min: 0 })) { toast.error("Min Order Amount must be ≥ 0."); return; }
    if (editing.usage_limit != null && editing.usage_limit !== "" && !isValidNumber(Number(editing.usage_limit), { min: 0 })) { toast.error("Usage Limit must be ≥ 0."); return; }
    if (editing.max_discount_amount != null && editing.max_discount_amount !== "" && !isValidNumber(Number(editing.max_discount_amount), { min: 0 })) { toast.error("Max Discount must be ≥ 0."); return; }

    setSaving(true);
    try {
      await upsert.mutateAsync({ ...editing, code: editing.code.toUpperCase().trim() });
      toast.success("Coupon saved!");
      setEditing(null);
    } catch (e: unknown) { toast.error(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    try { await deleteCoupon.mutateAsync(id); toast.success("Coupon deleted"); selected.delete(id); } catch (e: any) { toast.error(e.message); }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} selected coupons?`)) return;
    for (const id of selected) { try { await deleteCoupon.mutateAsync(id); } catch {} }
    toast.success(`${selected.size} coupons deleted`);
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map(c => c.id))); };
  const copyCode = (code: string) => { navigator.clipboard.writeText(code); toast.success("Copied!"); };
  const hasFilters = search || statusFilter !== "all" || sortBy !== "newest";
  const resetFilters = () => { setSearch(""); setStatusFilter("all"); setSortBy("newest"); };

  const statusBadge: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    inactive: "bg-muted text-muted-foreground",
    expired: "bg-destructive/10 text-destructive",
    maxed: "bg-amber-100 text-amber-700",
  };

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-serif flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" /> Coupon / Promo Codes ({baseCoupons.length})
        </CardTitle>
        <Button size="sm" onClick={() => setEditing({ code: "", discount_type: "percentage", discount_value: 10, min_order_amount: 0, expiry_date: null, usage_limit: null, used_count: 0, is_active: true, wholesale_only: !!wholesaleOnly, auto_apply: false, first_order_only: false, max_discount_amount: null })} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Coupon
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by code..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-xs font-mono uppercase" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="maxed">Maxed Out</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px] h-9 text-xs"><ArrowUpDown className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="code_asc">Code A-Z</SelectItem>
              <SelectItem value="most_used">Most Used</SelectItem>
            </SelectContent>
          </Select>
          {hasFilters && <Button size="sm" variant="ghost" className="h-9 text-xs gap-1" onClick={resetFilters}><X className="h-3 w-3" /> Reset</Button>}
        </div>

        {/* Bulk Actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
            <span className="text-xs font-medium">{selected.size} selected</span>
            <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={handleBulkDelete}><Trash2 className="h-3 w-3" /> Delete</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}

        {/* Edit Form */}
        {editing && (
          <div className="p-4 bg-muted rounded-xl space-y-4 border border-border">
            <h3 className="text-sm font-semibold">{editing.id ? "Edit Coupon" : "New Coupon"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Coupon Code</Label><Input value={editing.code} onChange={e => setEditing({ ...editing, code: e.target.value.toUpperCase() })} placeholder="RAMADAN10" className="h-9 text-xs font-mono uppercase" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Discount Type</Label><Select value={editing.discount_type} onValueChange={v => setEditing({ ...editing, discount_type: v })}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage" className="text-xs">Percentage (%)</SelectItem><SelectItem value="fixed" className="text-xs">Fixed Amount (£)</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Discount Value</Label><Input type="number" min={0} value={editing.discount_value} onChange={e => setEditing({ ...editing, discount_value: parseFloat(e.target.value) || 0 })} className="h-9 text-xs" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Min Order Amount (£)</Label><Input type="number" min={0} value={editing.min_order_amount || ""} onChange={e => setEditing({ ...editing, min_order_amount: parseFloat(e.target.value) || 0 })} className="h-9 text-xs" placeholder="0" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Expiry Date (optional)</Label><Input type="datetime-local" value={editing.expiry_date ? new Date(editing.expiry_date).toISOString().slice(0, 16) : ""} onChange={e => setEditing({ ...editing, expiry_date: e.target.value ? new Date(e.target.value).toISOString() : null })} className="h-9 text-xs" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Usage Limit (empty = unlimited)</Label><Input type="number" min={0} value={editing.usage_limit || ""} onChange={e => setEditing({ ...editing, usage_limit: parseInt(e.target.value) || null })} className="h-9 text-xs" placeholder="∞" /></div>
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label className="text-xs">Active</Label></div>
              <div className="flex items-center gap-2"><Switch checked={editing.auto_apply ?? false} onCheckedChange={v => setEditing({ ...editing, auto_apply: v })} /><Label className="text-xs">Auto Apply</Label></div>
              <div className="flex items-center gap-2"><Switch checked={editing.first_order_only ?? false} onCheckedChange={v => setEditing({ ...editing, first_order_only: v })} /><Label className="text-xs">First Order Only</Label></div>
              {!wholesaleOnly && !retailOnly && <div className="flex items-center gap-2"><Switch checked={editing.wholesale_only} onCheckedChange={v => setEditing({ ...editing, wholesale_only: v })} /><Label className="text-xs">Wholesale Only</Label></div>}
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Max Discount Amount (£, optional)</Label><Input type="number" min={0} value={editing.max_discount_amount || ""} onChange={e => setEditing({ ...editing, max_discount_amount: e.target.value ? parseFloat(e.target.value) : null })} className="h-9 text-xs" placeholder="No cap" /></div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5"><Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}</Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Coupons List */}
        <div className="space-y-2">
          {filtered.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Select All</span></div>
          )}
          {filtered.map(c => (
            <div key={c.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${selected.has(c.id) ? "bg-primary/5 border-primary/20" : "bg-muted/50 border-border/50"}`}>
              <div className="flex items-center gap-3">
                <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} />
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-sm font-bold text-primary">{c.code}</span>
                  <button onClick={() => copyCode(c.code)} className="text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></button>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {c.discount_type === "percentage" ? `${c.discount_value}% off` : `£${Number(c.discount_value).toFixed(2)} off`}
                    {(c as any).max_discount_amount ? ` • Cap £${Number((c as any).max_discount_amount).toFixed(2)}` : ""}
                    {c.min_order_amount ? ` • Min £${Number(c.min_order_amount).toFixed(2)}` : ""}
                    {c.wholesale_only ? " • Wholesale" : ""}
                    {(c as any).auto_apply ? " • Auto" : ""}
                    {(c as any).first_order_only ? " • 1st order" : ""}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Used: {c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ""}
                    {c.expiry_date ? ` • Expires: ${new Date(c.expiry_date).toLocaleDateString()}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[10px] ${statusBadge[c._status]}`}>{c._status}</Badge>
                <Button size="sm" variant="ghost" onClick={() => setEditing({ ...c })}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">{search || statusFilter !== "all" ? "No coupons match your filters." : "No coupons created yet."}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CouponsTab;
