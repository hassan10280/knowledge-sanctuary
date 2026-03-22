import { useState } from "react";
import { useBundleDiscounts, useUpsertBundleDiscount, useDeleteBundleDiscount } from "@/hooks/useBundleDiscounts";
import { useBooks } from "@/hooks/useBooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Plus, Trash2, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const BundleDiscountsTab = () => {
  const { data: bundles, isLoading } = useBundleDiscounts();
  const { data: books } = useBooks();
  const upsert = useUpsertBundleDiscount();
  const deleteFn = useDeleteBundleDiscount();

  const [editing, setEditing] = useState<any>(null);
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);

  const startNew = () => {
    setEditing({
      name: "",
      discount_type: "percentage",
      discount_value: 10,
      is_active: true,
      is_wholesale: false,
      min_qty: 2,
      max_discount_amount: null,
    });
    setSelectedBooks([]);
  };

  const startEdit = (bundle: any) => {
    setEditing({
      id: bundle.id,
      name: bundle.name,
      discount_type: bundle.discount_type,
      discount_value: bundle.discount_value,
      is_active: bundle.is_active,
      is_wholesale: bundle.is_wholesale,
      min_qty: bundle.min_qty,
      max_discount_amount: bundle.max_discount_amount,
      start_date: bundle.start_date?.split("T")[0] || "",
      end_date: bundle.end_date?.split("T")[0] || "",
    });
    setSelectedBooks(bundle.bundle_items?.map((i: any) => i.book_id) || []);
  };

  const handleSave = async () => {
    if (!editing?.name) { toast.error("Name required"); return; }
    if (selectedBooks.length < 2) { toast.error("Select at least 2 books"); return; }
    try {
      const bundle = { ...editing };
      if (!bundle.start_date) delete bundle.start_date;
      if (!bundle.end_date) delete bundle.end_date;
      if (!bundle.max_discount_amount) bundle.max_discount_amount = null;
      await upsert.mutateAsync({ bundle, bookIds: selectedBooks });
      toast.success("Bundle saved!");
      setEditing(null);
      setSelectedBooks([]);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFn.mutateAsync(id);
      toast.success("Bundle deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleBook = (bookId: string) => {
    setSelectedBooks((prev) =>
      prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]
    );
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Existing bundles */}
      {bundles?.map((b: any) => (
        <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
          <div>
            <p className="text-sm font-medium">{b.name}</p>
            <p className="text-xs text-muted-foreground">
              {b.discount_value}{b.discount_type === "percentage" ? "%" : "£"} off · {b.bundle_items?.length || 0} books · {b.is_active ? "Active" : "Inactive"}
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" onClick={() => startEdit(b)}>Edit</Button>
            <Button size="sm" variant="destructive" onClick={() => handleDelete(b.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}

      {/* Add / Edit form */}
      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              {editing.id ? "Edit Bundle" : "New Bundle"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Summer Bundle" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Discount Type</Label>
                <Select value={editing.discount_type} onValueChange={(v) => setEditing({ ...editing, discount_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Discount Value</Label>
                <Input type="number" value={editing.discount_value} onChange={(e) => setEditing({ ...editing, discount_value: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Min Qty from Bundle</Label>
                <Input type="number" value={editing.min_qty} onChange={(e) => setEditing({ ...editing, min_qty: Number(e.target.value) })} min={2} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max Discount (£, optional)</Label>
                <Input type="number" value={editing.max_discount_amount || ""} onChange={(e) => setEditing({ ...editing, max_discount_amount: e.target.value ? Number(e.target.value) : null })} placeholder="No cap" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Start Date</Label>
                <Input type="date" value={editing.start_date || ""} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End Date</Label>
                <Input type="date" value={editing.end_date || ""} onChange={(e) => setEditing({ ...editing, end_date: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch checked={editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label className="text-xs">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.is_wholesale} onCheckedChange={(v) => setEditing({ ...editing, is_wholesale: v })} />
                <Label className="text-xs">Wholesale Only</Label>
              </div>
            </div>

            {/* Book selection */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Select Books ({selectedBooks.length} selected)</Label>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                {books?.map((book) => (
                  <label key={book.id} className="flex items-center gap-2 p-1.5 hover:bg-muted/50 rounded cursor-pointer">
                    <Checkbox checked={selectedBooks.includes(book.id)} onCheckedChange={() => toggleBook(book.id)} />
                    <span className="text-xs">{book.title} — £{Number(book.price).toFixed(2)}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm" disabled={upsert.isPending}>
                <Save className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
              <Button variant="outline" size="sm" onClick={() => { setEditing(null); setSelectedBooks([]); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={startNew} size="sm" variant="outline">
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Bundle
        </Button>
      )}
    </div>
  );
};

export default BundleDiscountsTab;
