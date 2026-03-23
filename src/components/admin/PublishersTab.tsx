import { useState, useMemo } from "react";
import { Plus, Trash2, Save, Building2, Search, X, ArrowUpDown, BookOpen, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { usePublishers, useUpsertPublisher, useDeletePublisher } from "@/hooks/usePublishers";
import { useBooks } from "@/hooks/useBooks";
import { toast } from "sonner";
import { getErrorMessage, isBlank, isValidNumber } from "@/lib/admin-submit";

const PublishersTab = () => {
  const { data: publishers, isLoading } = usePublishers();
  const { data: books } = useBooks();
  const upsertPublisher = useUpsertPublisher();
  const deletePublisher = useDeletePublisher();
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("sort_order");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const getBookCount = (publisherName: string) =>
    books?.filter(b => b.publisher === publisherName).length || 0;

  const filtered = useMemo(() => {
    if (!publishers) return [];
    let result = publishers.map(p => ({ ...p, _bookCount: getBookCount(p.name) }));

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q));
    }

    switch (sortBy) {
      case "name_asc": result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "name_desc": result.sort((a, b) => b.name.localeCompare(a.name)); break;
      case "most_books": result.sort((a, b) => b._bookCount - a._bookCount); break;
      case "least_books": result.sort((a, b) => a._bookCount - b._bookCount); break;
      default: result.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    }
    return result;
  }, [publishers, books, search, sortBy]);

  const handleSave = async () => {
    if (!editing) { toast.error("No publisher data found."); return; }
    if (isBlank(editing.name)) { toast.error("Publisher Name is required."); return; }
    if (!isValidNumber(Number(editing.sort_order ?? 0), { min: 0 })) { toast.error("Sort Order must be valid."); return; }

    setSaving(true);
    try {
      await upsertPublisher.mutateAsync(editing);
      toast.success("Publisher saved!");
      setEditing(null);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const count = getBookCount(name);
    if (count > 0) {
      toast.error(`Cannot delete "${name}" — it has ${count} books linked.`);
      return;
    }
    if (!confirm(`Delete publisher "${name}"?`)) return;
    try {
      await deletePublisher.mutateAsync(id);
      toast.success("Publisher deleted");
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleBulkDelete = async () => {
    const toDelete = filtered.filter(p => selected.has(p.id));
    const blocked = toDelete.filter(p => p._bookCount > 0);
    if (blocked.length > 0) {
      toast.error(`${blocked.length} publisher(s) have books and cannot be deleted.`);
      return;
    }
    if (!confirm(`Delete ${toDelete.length} selected publishers?`)) return;
    for (const p of toDelete) {
      try { await deletePublisher.mutateAsync(p.id); } catch {}
    }
    toast.success(`${toDelete.length} publishers deleted`);
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => setSelected(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(p => p.id)));
  };

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-serif flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          Publishers ({filtered.length})
        </CardTitle>
        <Button size="sm" onClick={() => setEditing({ name: "", sort_order: 0 })} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Publisher
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search publishers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] h-9 text-xs">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sort_order">Sort Order</SelectItem>
              <SelectItem value="name_asc">Name A-Z</SelectItem>
              <SelectItem value="name_desc">Name Z-A</SelectItem>
              <SelectItem value="most_books">Most Books</SelectItem>
              <SelectItem value="least_books">Least Books</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
            <span className="text-xs font-medium">{selected.size} selected</span>
            <Button size="sm" variant="destructive" className="h-7 text-xs gap-1" onClick={handleBulkDelete}>
              <Trash2 className="h-3 w-3" /> Delete Selected
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}

        {/* Edit Form */}
        {editing && (
          <div className="p-4 bg-muted rounded-xl space-y-4 border border-border">
            <h3 className="text-sm font-semibold">{editing.id ? "Edit Publisher" : "New Publisher"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Publisher Name</Label>
                <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Darussalam" className="h-9 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sort Order</Label>
                <Input type="number" value={editing.sort_order || 0} onChange={e => setEditing({ ...editing, sort_order: parseInt(e.target.value) || 0 })} className="h-9 text-xs" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Publishers List */}
        <div className="space-y-2">
          {filtered.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5">
              <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Select All</span>
            </div>
          )}
          {filtered.map(p => (
            <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${selected.has(p.id) ? "bg-primary/5 border-primary/20" : "bg-muted/50 border-border/50"}`}>
              <div className="flex items-center gap-3">
                <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} />
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{p.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                      <BookOpen className="h-2.5 w-2.5" /> {p._bookCount} books
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">Order: {p.sort_order}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing({ ...p })}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(p.id, p.name)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {search ? "No publishers match your search." : "No publishers yet. Add your first publisher above."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PublishersTab;
