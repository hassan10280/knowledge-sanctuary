import { useState, useMemo } from "react";
import { useBundleDiscounts, useUpsertBundleDiscount, useDeleteBundleDiscount } from "@/hooks/useBundleDiscounts";
import { useBooks } from "@/hooks/useBooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Plus, Trash2, Save, Loader2, Search, X, ArrowUpDown } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage, isBlank, isValidNumber } from "@/lib/admin-submit";

const BundleDiscountsTab = () => {
  const { data: bundles, isLoading } = useBundleDiscounts();
  const { data: books } = useBooks();
  const upsert = useUpsertBundleDiscount();
  const deleteFn = useDeleteBundleDiscount();
  const [editing, setEditing] = useState<any>(null);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!bundles) return [];
    let result = bundles.map((b: any) => {
      const isExpired = b.end_date && new Date(b.end_date) < new Date();
      const effectiveStatus = !b.is_active ? "inactive" : isExpired ? "expired" : "active";
      return { ...b, _status: effectiveStatus };
    });
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((b: any) => b.name.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") result = result.filter((b: any) => b._status === statusFilter);
    switch (sortBy) {
      case "oldest": result.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case "name_asc": result.sort((a: any, b: any) => a.name.localeCompare(b.name)); break;
      case "discount_high": result.sort((a: any, b: any) => b.discount_value - a.discount_value); break;
      default: result.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
  }, [bundles, search, statusFilter, sortBy]);

  const startNew = () => { setEditing({ name: "", discount_type: "percentage", discount_value: 10, is_active: true, is_wholesale: false, min_qty: 2, max_discount_amount: null }); setSelectedBooks([]); };
  const startEdit = (bundle: any) => { setEditing({ id: bundle.id, name: bundle.name, discount_type: bundle.discount_type, discount_value: bundle.discount_value, is_active: bundle.is_active, is_wholesale: bundle.is_wholesale, min_qty: bundle.min_qty, max_discount_amount: bundle.max_discount_amount, start_date: bundle.start_date?.split("T")[0] || "", end_date: bundle.end_date?.split("T")[0] || "" }); setSelectedBooks(bundle.bundle_items?.map((i: any) => i.book_id) || []); };

  const handleSave = async () => {
    if (!editing) { toast.error("No bundle data found."); return; }
    if (isBlank(editing.name)) { toast.error("Name is required."); return; }
    if (!isValidNumber(Number(editing.discount_value), { min: 0.01 })) { toast.error("Discount Value must be > 0."); return; }
    if (!isValidNumber(Number(editing.min_qty), { min: 2 })) { toast.error("Min Qty must be ≥ 2."); return; }
    if (editing.max_discount_amount != null && editing.max_discount_amount !== "" && !isValidNumber(Number(editing.max_discount_amount), { min: 0 })) { toast.error("Max Discount must be ≥ 0."); return; }
    if (selectedBooks.length < 2) { toast.error("Select at least 2 books."); return; }

    setSaving(true);
    try {
      const bundle = { ...editing };
      if (!bundle.start_date) delete bundle.start_date;
      if (!bundle.end_date) delete bundle.end_date;
      if (!bundle.max_discount_amount) bundle.max_discount_amount = null;
      await upsert.mutateAsync({ bundle, bookIds: selectedBooks });
      toast.success("Bundle saved!"); setEditing(null); setSelectedBooks([]);
    } catch (e: unknown) { toast.error(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteFn.mutateAsync(id); toast.success("Bundle deleted"); } catch (e: any) { toast.error(e.message); }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} selected bundles?`)) return;
    for (const id of selected) { try { await deleteFn.mutateAsync(id); } catch {} }
    toast.success(`${selected.size} bundles deleted`); setSelected(new Set());
  };

  const toggleBook = (bookId: string) => setSelectedBooks(prev => prev.includes(bookId) ? prev.filter(id => id !== bookId) : [...prev, bookId]);
  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map((b: any) => b.id))); };
  const hasFilters = search || statusFilter !== "all" || sortBy !== "newest";
  const resetFilters = () => { setSearch(""); setStatusFilter("all"); setSortBy("newest"); };

  const statusBadge: Record<string, string> = { active: "bg-emerald-100 text-emerald-800", inactive: "bg-muted text-muted-foreground", expired: "bg-destructive/10 text-destructive" };

  if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Bundle Discounts ({bundles?.length || 0})</h3>
        <Button onClick={startNew} size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" /> Add Bundle</Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search bundles..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="expired">Expired</SelectItem></SelectContent></Select>
        <Select value={sortBy} onValueChange={setSortBy}><SelectTrigger className="w-[140px] h-9 text-xs"><ArrowUpDown className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest</SelectItem><SelectItem value="oldest">Oldest</SelectItem><SelectItem value="name_asc">Name A-Z</SelectItem><SelectItem value="discount_high">Highest Discount</SelectItem></SelectContent></Select>
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

      {/* Bundles List */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Select All</span></div>
      )}
      {filtered.map((b: any) => (
        <div key={b.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${selected.has(b.id) ? "bg-primary/5 border-primary/20" : "bg-muted/20 border-border"}`}>
          <div className="flex items-center gap-3">
            <Checkbox checked={selected.has(b.id)} onCheckedChange={() => toggleSelect(b.id)} />
            <div>
              <p className="text-sm font-medium">{b.name}</p>
              <p className="text-xs text-muted-foreground">
                {b.discount_value}{b.discount_type === "percentage" ? "%" : "£"} off · {b.bundle_items?.length || 0} books
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] ${statusBadge[b._status]}`}>{b._status}</Badge>
            <Button size="sm" variant="outline" onClick={() => startEdit(b)}>Edit</Button>
            <Button size="sm" variant="destructive" onClick={() => handleDelete(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      ))}
      {filtered.length === 0 && !editing && <p className="text-sm text-muted-foreground text-center py-8">{hasFilters ? "No bundles match your filters." : "No bundles created yet."}</p>}

      {/* Edit Form */}
      {editing && (
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> {editing.id ? "Edit Bundle" : "New Bundle"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Name</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Summer Bundle" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Discount Type</Label><Select value={editing.discount_type} onValueChange={v => setEditing({ ...editing, discount_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">Percentage (%)</SelectItem><SelectItem value="fixed">Fixed Amount (£)</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Discount Value</Label><Input type="number" value={editing.discount_value} onChange={e => setEditing({ ...editing, discount_value: Number(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Min Qty from Bundle</Label><Input type="number" value={editing.min_qty} onChange={e => setEditing({ ...editing, min_qty: Number(e.target.value) })} min={2} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Max Discount (£, optional)</Label><Input type="number" value={editing.max_discount_amount || ""} onChange={e => setEditing({ ...editing, max_discount_amount: e.target.value ? Number(e.target.value) : null })} placeholder="No cap" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Start Date</Label><Input type="date" value={editing.start_date || ""} onChange={e => setEditing({ ...editing, start_date: e.target.value })} /></div>
              <div className="space-y-1.5"><Label className="text-xs">End Date</Label><Input type="date" value={editing.end_date || ""} onChange={e => setEditing({ ...editing, end_date: e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label className="text-xs">Active</Label></div>
              <div className="flex items-center gap-2"><Switch checked={editing.is_wholesale} onCheckedChange={v => setEditing({ ...editing, is_wholesale: v })} /><Label className="text-xs">Wholesale Only</Label></div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Select Books ({selectedBooks.length} selected)</Label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                {books?.map(book => (
                  <label key={book.id} className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer">
                    <Checkbox checked={selectedBooks.includes(book.id)} onCheckedChange={() => toggleBook(book.id)} />
                    <span className="text-xs">{book.title} — £{Number(book.price).toFixed(2)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm" disabled={saving}><Save className="h-3.5 w-3.5 mr-1" /> {saving ? "Saving..." : "Save"}</Button>
              <Button variant="outline" size="sm" onClick={() => { setEditing(null); setSelectedBooks([]); }}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BundleDiscountsTab;
