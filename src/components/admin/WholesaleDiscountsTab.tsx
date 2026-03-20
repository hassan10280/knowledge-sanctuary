import { useState } from "react";
import { Plus, Trash2, Save, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useWholesaleDiscounts, useUpsertDiscount, useDeleteDiscount } from "@/hooks/useWholesale";
import { useBooks, useCategories } from "@/hooks/useBooks";
import { usePublishers } from "@/hooks/usePublishers";
import { toast } from "sonner";

const WholesaleDiscountsTab = () => {
  const { data: discounts, isLoading } = useWholesaleDiscounts();
  const { data: books } = useBooks();
  const { data: categories } = useCategories();
  const { data: publishers } = usePublishers();
  const upsertDiscount = useUpsertDiscount();
  const deleteDiscount = useDeleteDiscount();
  const [editing, setEditing] = useState<any>(null);

  const handleSave = async () => {
    if (!editing?.reference_value?.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const toSave = { ...editing };
      if (toSave.discount_type === "publisher" || toSave.discount_type === "category") {
        toSave.book_id = null;
      }
      // If fixed_price is set, discount_percent becomes 0
      if (toSave.fixed_price && Number(toSave.fixed_price) > 0) {
        toSave.discount_percent = 0;
      } else {
        toSave.fixed_price = null;
      }
      await upsertDiscount.mutateAsync(toSave);
      toast.success("Discount saved!");
      setEditing(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this discount?")) return;
    try {
      await deleteDiscount.mutateAsync(id);
      toast.success("Discount deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const typeColors: Record<string, string> = {
    product: "bg-primary/10 text-primary",
    publisher: "bg-amber-100 text-amber-800",
    category: "bg-emerald-100 text-emerald-800",
  };

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-serif flex items-center gap-2">
          <Percent className="h-5 w-5 text-primary" />
          Wholesale Discounts
        </CardTitle>
        <Button
          size="sm"
          onClick={() => setEditing({ discount_type: "publisher", reference_value: "", discount_percent: 10, book_id: null, fixed_price: null })}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add Discount
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
          <p><strong>Priority Rule:</strong> Fixed Price Override → Product-specific → Publisher-based → Category-based.</p>
          <p><strong>Fixed Price:</strong> If set on a product discount, the wholesale price is fixed regardless of percentage.</p>
        </div>

        {editing && (
          <div className="p-4 bg-muted rounded-xl space-y-4 border border-border">
            <h3 className="text-sm font-semibold">{editing.id ? "Edit Discount" : "New Discount"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Discount Type</Label>
                <Select value={editing.discount_type} onValueChange={v => setEditing({ ...editing, discount_type: v, reference_value: "", book_id: null })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="product" className="text-xs">Product-based (Highest Priority)</SelectItem>
                    <SelectItem value="publisher" className="text-xs">Publisher-based</SelectItem>
                    <SelectItem value="category" className="text-xs">Category-based (Lowest Priority)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editing.discount_type === "publisher" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Publisher</Label>
                  <Select value={editing.reference_value} onValueChange={v => setEditing({ ...editing, reference_value: v })}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select publisher..." /></SelectTrigger>
                    <SelectContent>
                      {publishers?.map(p => <SelectItem key={p.id} value={p.name} className="text-xs">{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : editing.discount_type === "category" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <Select value={editing.reference_value} onValueChange={v => setEditing({ ...editing, reference_value: v })}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select category..." /></SelectTrigger>
                    <SelectContent>
                      {categories?.map(c => <SelectItem key={c.id} value={c.name} className="text-xs">{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs">Book</Label>
                  <Select value={editing.book_id || ""} onValueChange={v => {
                    const book = books?.find(b => b.id === v);
                    setEditing({ ...editing, book_id: v, reference_value: book?.title || v });
                  }}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select book..." /></SelectTrigger>
                    <SelectContent>
                      {books?.map(b => <SelectItem key={b.id} value={b.id} className="text-xs">{b.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Discount %</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editing.discount_percent}
                  onChange={e => setEditing({ ...editing, discount_percent: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={upsertDiscount.isPending} className="gap-1.5">
                <Save className="h-3.5 w-3.5" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {discounts?.map(d => (
            <div key={d.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
              <div className="flex items-center gap-3">
                <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${typeColors[d.discount_type] || typeColors.publisher}`}>
                  {d.discount_type}
                </div>
                <div>
                  <p className="text-sm font-medium">{d.reference_value}</p>
                  <p className="text-xs text-muted-foreground">{d.discount_percent}% discount</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing({ ...d })}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(d.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {(!discounts || discounts.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">No wholesale discounts configured.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WholesaleDiscountsTab;
