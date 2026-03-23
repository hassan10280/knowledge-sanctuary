import { useState, useMemo } from "react";
import { useCategories, useUpsertCategory, useDeleteCategory, useBooks } from "@/hooks/useBooks";
import { toast } from "sonner";
import { Plus, Save, Trash2, Pencil, Eye, Search, RotateCcw, ChevronDown, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isBlank, getErrorMessage } from "@/lib/admin-submit";

type SortOption = "name-asc" | "name-desc" | "newest" | "oldest" | "most-books" | "least-books";
type StockFilter = "__all__" | "has-books" | "empty";

const CategoriesManagementTab = () => {
  const { data: categories, isLoading: loadingCats } = useCategories();
  const { data: books } = useBooks();
  const upsertCategory = useUpsertCategory();
  const deleteCategoryMut = useDeleteCategory();

  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [stockFilter, setStockFilter] = useState<StockFilter>("__all__");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [viewTarget, setViewTarget] = useState<any>(null);

  // Book count per category
  const bookCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (books) {
      books.forEach((b: any) => {
        const cat = b.category || "";
        map[cat] = (map[cat] || 0) + 1;
      });
    }
    return map;
  }, [books]);

  // Filter + search + sort
  const filtered = useMemo(() => {
    if (!categories) return [];
    let result = categories.map((c: any) => ({ ...c, _bookCount: bookCountMap[c.name] || 0 }));

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c: any) => c.name?.toLowerCase().includes(q) || c.name_bn?.toLowerCase().includes(q));
    }
    if (stockFilter === "has-books") result = result.filter((c: any) => c._bookCount > 0);
    if (stockFilter === "empty") result = result.filter((c: any) => c._bookCount === 0);

    switch (sortBy) {
      case "name-asc": result.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || "")); break;
      case "name-desc": result.sort((a: any, b: any) => (b.name || "").localeCompare(a.name || "")); break;
      case "newest": result.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
      case "oldest": result.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case "most-books": result.sort((a: any, b: any) => b._bookCount - a._bookCount); break;
      case "least-books": result.sort((a: any, b: any) => a._bookCount - b._bookCount); break;
    }
    return result;
  }, [categories, books, search, sortBy, stockFilter, bookCountMap]);

  const handleSave = async () => {
    if (!editing) return;
    if (isBlank(editing.name)) { toast.error("Category name is required."); return; }
    setSaving(true);
    try {
      await upsertCategory.mutateAsync(editing);
      toast.success("Category saved!");
      setEditing(null);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const count = bookCountMap[deleteTarget.name] || 0;
    if (count > 0) { toast.error(`This category contains ${count} book(s) and cannot be deleted.`); setDeleteTarget(null); return; }
    try {
      await deleteCategoryMut.mutateAsync(deleteTarget.id);
      toast.success("Category deleted.");
      setSelected((prev) => { const n = new Set(prev); n.delete(deleteTarget.id); return n; });
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    }
    setDeleteTarget(null);
  };

  const toggleSelect = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((c: any) => c.id)));
  };

  const bulkDelete = async () => {
    const toDelete = filtered.filter((c: any) => selected.has(c.id));
    const blocked = toDelete.filter((c: any) => c._bookCount > 0);
    if (blocked.length > 0) { toast.error(`${blocked.length} selected categor(ies) contain books and cannot be deleted.`); return; }
    for (const c of toDelete) {
      try { await deleteCategoryMut.mutateAsync(c.id); } catch {}
    }
    toast.success(`${toDelete.length} categories deleted.`);
    setSelected(new Set());
  };

  const resetFilters = () => { setSearch(""); setSortBy("newest"); setStockFilter("__all__"); };
  const hasActiveFilters = search || sortBy !== "newest" || stockFilter !== "__all__";

  const isLoading = loadingCats;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="font-serif flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Category Management</CardTitle>
            <Button size="sm" onClick={() => setEditing({ name: "", name_bn: "", icon: "BookOpen", sort_order: 0 })} className="gap-1.5"><Plus className="h-4 w-4" /> Add Category</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search + Sort + Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
              {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-full sm:w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="most-books">Most Books</SelectItem>
                <SelectItem value="least-books">Least Books</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as StockFilter)}>
              <SelectTrigger className="w-full sm:w-40 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Categories</SelectItem>
                <SelectItem value="has-books">With Books</SelectItem>
                <SelectItem value="empty">Empty (0 books)</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button size="sm" variant="outline" onClick={resetFilters} className="gap-1.5 h-9 shrink-0"><RotateCcw className="h-3.5 w-3.5" /> Reset</Button>
            )}
          </div>

          {/* Bulk actions */}
          {selected.size > 0 && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border/50">
              <span className="text-sm font-medium">{selected.size} selected</span>
              <Button size="sm" variant="destructive" onClick={bulkDelete} className="gap-1.5 h-8"><Trash2 className="h-3.5 w-3.5" /> Delete Selected</Button>
              <Button size="sm" variant="outline" onClick={() => setSelected(new Set())} className="h-8">Clear</Button>
            </div>
          )}

          {/* Edit/Add form */}
          {editing && (
            <div className="p-4 bg-muted/40 rounded-lg border border-border/50 space-y-3">
              <h3 className="text-sm font-semibold">{editing.id ? "Edit Category" : "New Category"}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name (English) *</Label>
                  <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Category name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Name (Secondary)</Label>
                  <Input value={editing.name_bn || ""} onChange={(e) => setEditing({ ...editing, name_bn: e.target.value })} placeholder="Secondary name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Icon</Label>
                  <Input value={editing.icon || ""} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} placeholder="e.g. BookOpen" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Sort Order</Label>
                  <Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5"><Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No categories found.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-10"><Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} /></TableHead>
                    <TableHead>Category Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Secondary Name</TableHead>
                    <TableHead className="text-center">Books</TableHead>
                    <TableHead className="hidden md:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((cat: any) => (
                    <TableRow key={cat.id} className={selected.has(cat.id) ? "bg-primary/5" : ""}>
                      <TableCell><Checkbox checked={selected.has(cat.id)} onCheckedChange={() => toggleSelect(cat.id)} /></TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{cat.name}</p>
                        <p className="text-xs text-muted-foreground sm:hidden">{cat.name_bn}</p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{cat.name_bn || "—"}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={cat._bookCount > 0 ? "default" : "secondary"} className="text-xs">
                          {cat._bookCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {new Date(cat.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setViewTarget(cat)} title="View"><Eye className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditing({ ...cat })} title="Edit"><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => setDeleteTarget(cat)} title="Delete"><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Showing {filtered.length} of {categories?.length || 0} categories</p>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (bookCountMap[deleteTarget.name] || 0) > 0
                ? `"${deleteTarget?.name}" contains ${bookCountMap[deleteTarget?.name] || 0} book(s) and cannot be deleted. Remove or reassign the books first.`
                : `Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {deleteTarget && (bookCountMap[deleteTarget.name] || 0) === 0 && (
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View detail dialog */}
      <Dialog open={!!viewTarget} onOpenChange={(open) => !open && setViewTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{viewTarget?.name}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-muted-foreground">Secondary:</span><p className="font-medium">{viewTarget?.name_bn || "—"}</p></div>
              <div><span className="text-muted-foreground">Icon:</span><p className="font-medium">{viewTarget?.icon || "—"}</p></div>
              <div><span className="text-muted-foreground">Sort Order:</span><p className="font-medium">{viewTarget?.sort_order ?? 0}</p></div>
              <div><span className="text-muted-foreground">Total Books:</span><p className="font-medium">{viewTarget ? (bookCountMap[viewTarget.name] || 0) : 0}</p></div>
              <div className="col-span-2"><span className="text-muted-foreground">Created:</span><p className="font-medium">{viewTarget?.created_at ? new Date(viewTarget.created_at).toLocaleString() : "—"}</p></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoriesManagementTab;
