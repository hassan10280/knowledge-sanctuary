import { useState, useMemo } from "react";
import { Plus, Trash2, Save, Tag, Search, X, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useRetailDiscounts, useUpsertRetailDiscount, useDeleteRetailDiscount } from "@/hooks/useRetailDiscounts";
import { useBooks, useCategories } from "@/hooks/useBooks";
import { toast } from "sonner";
import { getErrorMessage, isBlank, isValidNumber } from "@/lib/admin-submit";

const RetailDiscountsTab = () => {
  const { data: discounts, isLoading } = useRetailDiscounts();
  const { data: books } = useBooks();
  const { data: categories } = useCategories();
  const upsert = useUpsertRetailDiscount();
  const deleteDiscount = useDeleteRetailDiscount();
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!discounts) return [];
    let result = discounts.map(d => {
      const isExpired = d.end_date && new Date(d.end_date) < new Date();
      const effectiveStatus = !d.is_active ? "inactive" : isExpired ? "expired" : "active";
      return { ...d, _status: effectiveStatus };
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(d => d.reference_value.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") result = result.filter(d => d._status === statusFilter);
    if (typeFilter !== "all") result = result.filter(d => d.discount_type === typeFilter);

    switch (sortBy) {
      case "oldest": result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case "discount_high": result.sort((a, b) => b.discount_percent - a.discount_percent); break;
      case "name_asc": result.sort((a, b) => a.reference_value.localeCompare(b.reference_value)); break;
      default: result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
  }, [discounts, search, statusFilter, typeFilter, sortBy]);

  const handleSave = async () => {
    if (!editing) { toast.error("No discount data found."); return; }
    if (editing.discount_type === "category" && isBlank(editing.reference_value)) { toast.error("Category is required."); return; }
    if (editing.discount_type === "product" && isBlank(editing.book_id)) { toast.error("Book is required."); return; }
    if (!isValidNumber(Number(editing.discount_percent), { min: 0, max: 100 })) { toast.error("Discount % must be 0-100."); return; }

    setSaving(true);
    try {
      const toSave = { ...editing };
      if (toSave.discount_type === "category") toSave.book_id = null;
      await upsert.mutateAsync(toSave);
      toast.success("Discount saved!"); setEditing(null);
    } catch (e: unknown) { toast.error(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this discount?")) return;
    try { await deleteDiscount.mutateAsync(id); toast.success("Discount deleted"); } catch (e: any) { toast.error(e.message); }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} selected discounts?`)) return;
    for (const id of selected) { try { await deleteDiscount.mutateAsync(id); } catch {} }
    toast.success(`${selected.size} discounts deleted`); setSelected(new Set());
  };

  const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => { if (selected.size === filtered.length) setSelected(new Set()); else setSelected(new Set(filtered.map(d => d.id))); };
  const hasFilters = search || statusFilter !== "all" || typeFilter !== "all" || sortBy !== "newest";
  const resetFilters = () => { setSearch(""); setStatusFilter("all"); setTypeFilter("all"); setSortBy("newest"); };

  const typeColors: Record<string, string> = { product: "bg-primary/10 text-primary", category: "bg-emerald-100 text-emerald-800" };
  const statusBadge: Record<string, string> = { active: "bg-emerald-100 text-emerald-800", inactive: "bg-muted text-muted-foreground", expired: "bg-destructive/10 text-destructive" };

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Tag className="h-4 w-4 text-primary" /> Retail Discounts ({discounts?.length || 0})</h3>
        <Button size="sm" onClick={() => setEditing({ discount_type: "product", reference_value: "", discount_percent: 10, book_id: null, is_active: true, start_date: null, end_date: null })} className="gap-1.5"><Plus className="h-4 w-4" /> Add Discount</Button>
      </div>

      <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
        <strong>Retail Discounts:</strong> These discounts apply only to retail customers. You can set product-specific or category-wide discounts with optional date ranges.
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="expired">Expired</SelectItem></SelectContent></Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="product">Product</SelectItem><SelectItem value="category">Category</SelectItem></SelectContent></Select>
        <Select value={sortBy} onValueChange={setSortBy}><SelectTrigger className="w-[140px] h-9 text-xs"><ArrowUpDown className="h-3.5 w-3.5 mr-1" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest</SelectItem><SelectItem value="oldest">Oldest</SelectItem><SelectItem value="discount_high">Highest %</SelectItem><SelectItem value="name_asc">Name A-Z</SelectItem></SelectContent></Select>
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
          <h3 className="text-sm font-semibold">{editing.id ? "Edit Discount" : "New Discount"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs">Discount Type</Label><Select value={editing.discount_type} onValueChange={v => setEditing({ ...editing, discount_type: v, reference_value: "", book_id: null })}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="product" className="text-xs">Product-based</SelectItem><SelectItem value="category" className="text-xs">Category-based</SelectItem></SelectContent></Select></div>
            {editing.discount_type === "category" ? (
              <div className="space-y-1.5"><Label className="text-xs">Category</Label><Select value={editing.reference_value} onValueChange={v => setEditing({ ...editing, reference_value: v })}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select category..." /></SelectTrigger><SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.name} className="text-xs">{c.name}</SelectItem>)}</SelectContent></Select></div>
            ) : (
              <div className="space-y-1.5"><Label className="text-xs">Book</Label><Select value={editing.book_id || ""} onValueChange={v => { const book = books?.find(b => b.id === v); setEditing({ ...editing, book_id: v, reference_value: book?.title || v }); }}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select book..." /></SelectTrigger><SelectContent>{books?.map(b => <SelectItem key={b.id} value={b.id} className="text-xs">{b.title}</SelectItem>)}</SelectContent></Select></div>
            )}
            <div className="space-y-1.5"><Label className="text-xs">Discount %</Label><Input type="number" min={0} max={100} value={editing.discount_percent} onChange={e => setEditing({ ...editing, discount_percent: parseFloat(e.target.value) || 0 })} className="h-9 text-xs" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Start Date (optional)</Label><Input type="datetime-local" value={editing.start_date ? new Date(editing.start_date).toISOString().slice(0, 16) : ""} onChange={e => setEditing({ ...editing, start_date: e.target.value ? new Date(e.target.value).toISOString() : null })} className="h-9 text-xs" /></div>
            <div className="space-y-1.5"><Label className="text-xs">End Date (optional)</Label><Input type="datetime-local" value={editing.end_date ? new Date(editing.end_date).toISOString().slice(0, 16) : ""} onChange={e => setEditing({ ...editing, end_date: e.target.value ? new Date(e.target.value).toISOString() : null })} className="h-9 text-xs" /></div>
          </div>
          <div className="flex items-center gap-2"><Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /><Label className="text-xs">Active</Label></div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5"><Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}</Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Discounts List */}
      <div className="space-y-2">
        {filtered.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Select All</span></div>
        )}
        {filtered.map(d => (
          <div key={d.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${selected.has(d.id) ? "bg-primary/5 border-primary/20" : "bg-muted/50 border-border/50"}`}>
            <div className="flex items-center gap-3">
              <Checkbox checked={selected.has(d.id)} onCheckedChange={() => toggleSelect(d.id)} />
              <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${typeColors[d.discount_type] || typeColors.product}`}>{d.discount_type}</div>
              <div>
                <p className="text-sm font-medium">{d.reference_value}</p>
                <p className="text-xs text-muted-foreground">{d.discount_percent}% discount</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-[10px] ${statusBadge[d._status]}`}>{d._status}</Badge>
              <Button size="sm" variant="ghost" onClick={() => setEditing({ ...d })}>Edit</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{hasFilters ? "No discounts match your filters." : "No retail discounts configured."}</p>}
      </div>
    </div>
  );
};

export default RetailDiscountsTab;
