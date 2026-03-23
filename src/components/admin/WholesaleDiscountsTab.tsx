import { useState, useMemo } from "react";
import { Plus, Trash2, Save, Percent, Search, X, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useWholesaleDiscounts, useUpsertDiscount, useDeleteDiscount } from "@/hooks/useWholesale";
import { useBooks, useCategories } from "@/hooks/useBooks";
import { usePublishers } from "@/hooks/usePublishers";
import { toast } from "sonner";
import { getErrorMessage, isBlank, isValidNumber } from "@/lib/admin-submit";

const WholesaleDiscountsTab = () => {
  const { data: discounts, isLoading } = useWholesaleDiscounts();
  const { data: books } = useBooks();
  const { data: categories } = useCategories();
  const { data: publishers } = usePublishers();
  const upsertDiscount = useUpsertDiscount();
  const deleteDiscount = useDeleteDiscount();
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!discounts) return [];
    let result = [...discounts];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(d => d.reference_value.toLowerCase().includes(q));
    }
    if (typeFilter !== "all") result = result.filter(d => d.discount_type === typeFilter);
    switch (sortBy) {
      case "oldest": result.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case "discount_high": result.sort((a, b) => b.discount_percent - a.discount_percent); break;
      case "name_asc": result.sort((a, b) => a.reference_value.localeCompare(b.reference_value)); break;
      default: result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return result;
  }, [discounts, search, typeFilter, sortBy]);

  const handleSave = async () => {
    if (!editing) { toast.error("No discount data found."); return; }
    if (editing.discount_type === "publisher" && isBlank(editing.reference_value)) { toast.error("Publisher is required."); return; }
    if (editing.discount_type === "category" && isBlank(editing.reference_value)) { toast.error("Category is required."); return; }
    if (editing.discount_type === "product" && isBlank(editing.book_id)) { toast.error("Book is required."); return; }
    const fixedPrice = editing.fixed_price == null ? null : Number(editing.fixed_price);
    if (fixedPrice !== null && !Number.isNaN(fixedPrice) && fixedPrice < 0) { toast.error("Fixed Price must be ≥ 0."); return; }
    if (fixedPrice === null || fixedPrice === 0) {
      if (!isValidNumber(Number(editing.discount_percent), { min: 0, max: 100 })) { toast.error("Discount % must be 0-100."); return; }
    }

    setSaving(true);
    try {
      const toSave = { ...editing };
      if (toSave.discount_type === "publisher" || toSave.discount_type === "category") toSave.book_id = null;
      if (toSave.fixed_price && Number(toSave.fixed_price) > 0) toSave.discount_percent = 0; else toSave.fixed_price = null;
      await upsertDiscount.mutateAsync(toSave);
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
  const hasFilters = search || typeFilter !== "all" || sortBy !== "newest";
  const resetFilters = () => { setSearch(""); setTypeFilter("all"); setSortBy("newest"); };

  const typeColors: Record<string, string> = { product: "bg-primary/10 text-primary", publisher: "bg-amber-100 text-amber-800", category: "bg-emerald-100 text-emerald-800" };

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-serif flex items-center gap-2"><Percent className="h-5 w-5 text-primary" /> Wholesale Discounts ({discounts?.length || 0})</CardTitle>
        <Button size="sm" onClick={() => setEditing({ discount_type: "publisher", reference_value: "", discount_percent: 10, book_id: null, fixed_price: null })} className="gap-1.5"><Plus className="h-4 w-4" /> Add Discount</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
          <p><strong>Priority Rule:</strong> Fixed Price Override → Product-specific → Publisher-based → Category-based.</p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
            {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="product">Product</SelectItem><SelectItem value="publisher">Publisher</SelectItem><SelectItem value="category">Category</SelectItem></SelectContent></Select>
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
              <div className="space-y-1.5"><Label className="text-xs">Discount Type</Label><Select value={editing.discount_type} onValueChange={v => setEditing({ ...editing, discount_type: v, reference_value: "", book_id: null })}><SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="product" className="text-xs">Product-based (Highest Priority)</SelectItem><SelectItem value="publisher" className="text-xs">Publisher-based</SelectItem><SelectItem value="category" className="text-xs">Category-based (Lowest Priority)</SelectItem></SelectContent></Select></div>
              {editing.discount_type === "publisher" ? (
                <div className="space-y-1.5"><Label className="text-xs">Publisher</Label><Select value={editing.reference_value} onValueChange={v => setEditing({ ...editing, reference_value: v })}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select publisher..." /></SelectTrigger><SelectContent>{publishers?.map(p => <SelectItem key={p.id} value={p.name} className="text-xs">{p.name}</SelectItem>)}</SelectContent></Select></div>
              ) : editing.discount_type === "category" ? (
                <div className="space-y-1.5"><Label className="text-xs">Category</Label><Select value={editing.reference_value} onValueChange={v => setEditing({ ...editing, reference_value: v })}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select category..." /></SelectTrigger><SelectContent>{categories?.map(c => <SelectItem key={c.id} value={c.name} className="text-xs">{c.name}</SelectItem>)}</SelectContent></Select></div>
              ) : (
                <div className="space-y-1.5"><Label className="text-xs">Book</Label><Select value={editing.book_id || ""} onValueChange={v => { const book = books?.find(b => b.id === v); setEditing({ ...editing, book_id: v, reference_value: book?.title || v }); }}><SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select book..." /></SelectTrigger><SelectContent>{books?.map(b => <SelectItem key={b.id} value={b.id} className="text-xs">{b.title}</SelectItem>)}</SelectContent></Select></div>
              )}
              <div className="space-y-1.5"><Label className="text-xs">Discount %</Label><Input type="number" min={0} max={100} value={editing.discount_percent} onChange={e => setEditing({ ...editing, discount_percent: parseFloat(e.target.value) || 0 })} className="h-9 text-xs" disabled={editing.fixed_price && Number(editing.fixed_price) > 0} /></div>
              {editing.discount_type === "product" && (
                <div className="space-y-1.5"><Label className="text-xs">Fixed Price Override (£)</Label><Input type="number" min={0} step="0.01" value={editing.fixed_price || ""} onChange={e => setEditing({ ...editing, fixed_price: parseFloat(e.target.value) || null })} className="h-9 text-xs" placeholder="Leave empty for % discount" /><p className="text-[10px] text-muted-foreground">If set, overrides % discount.</p></div>
              )}
            </div>
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
                <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${typeColors[d.discount_type] || typeColors.publisher}`}>{d.discount_type}</div>
                <div>
                  <p className="text-sm font-medium">{d.reference_value}</p>
                  <p className="text-xs text-muted-foreground">
                    {(d as any).fixed_price && Number((d as any).fixed_price) > 0 ? `Fixed: £${Number((d as any).fixed_price).toFixed(2)}` : `${d.discount_percent}% discount`}
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing({ ...d })}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{hasFilters ? "No discounts match your filters." : "No wholesale discounts configured."}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default WholesaleDiscountsTab;
