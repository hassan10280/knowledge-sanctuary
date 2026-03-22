import { useState } from "react";
import { Plus, Trash2, Save, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuantityTiers, useUpsertQuantityTier, useDeleteQuantityTier } from "@/hooks/useAdvancedDiscounts";
import { toast } from "sonner";
import { getErrorMessage, isValidNumber } from "@/lib/admin-submit";

const QuantityTiersTab = () => {
  const { data: tiers, isLoading } = useQuantityTiers();
  const upsert = useUpsertQuantityTier();
  const deleteTier = useDeleteQuantityTier();
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editing) {
      toast.error("No quantity tier data found.");
      return;
    }

    if (!isValidNumber(Number(editing.min_qty), { min: 1 })) {
      toast.error("Min Qty must be 1 or greater.");
      return;
    }

    if (editing.max_qty !== null && editing.max_qty !== undefined && editing.max_qty !== "") {
      if (!isValidNumber(Number(editing.max_qty), { min: Number(editing.min_qty) })) {
        toast.error("Max Qty must be greater than or equal to Min Qty.");
        return;
      }
    }

    if (!isValidNumber(Number(editing.discount_percent), { min: 0.01, max: 100 })) {
      toast.error("Discount % must be greater than 0 and no more than 100.");
      return;
    }

    setSaving(true);
    try {
      await upsert.mutateAsync(editing);
      toast.success("Quantity tier saved!");
      setEditing(null);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tier?")) return;
    try {
      await deleteTier.mutateAsync(id);
      toast.success("Tier deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-serif flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Quantity-Based Discounts
        </CardTitle>
        <Button
          size="sm"
          onClick={() => setEditing({ min_qty: 10, max_qty: 20, discount_percent: 5, scope: "cart" })}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add Tier
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <strong>How it works:</strong> When a wholesale customer orders a quantity within a tier range, the corresponding discount is applied. Only applies to wholesale customers.
        </div>

        {editing && (
          <div className="p-4 bg-muted rounded-xl space-y-4 border border-border">
            <h3 className="text-sm font-semibold">{editing.id ? "Edit Tier" : "New Tier"}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Min Qty</Label>
                <Input
                  type="number"
                  min={1}
                  value={editing.min_qty}
                  onChange={e => setEditing({ ...editing, min_qty: parseInt(e.target.value) || 0 })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max Qty (empty = unlimited)</Label>
                <Input
                  type="number"
                  min={0}
                  value={editing.max_qty || ""}
                  onChange={e => setEditing({ ...editing, max_qty: parseInt(e.target.value) || null })}
                  className="h-9 text-xs"
                  placeholder="∞"
                />
              </div>
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
              <div className="space-y-1.5">
                <Label className="text-xs">Scope</Label>
                <Select value={editing.scope} onValueChange={v => setEditing({ ...editing, scope: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cart" className="text-xs">Cart Total Qty</SelectItem>
                    <SelectItem value="product" className="text-xs">Per Product Qty</SelectItem>
                  </SelectContent>
                </Select>
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

        <div className="space-y-2">
          {tiers?.map(t => (
            <div key={t.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
              <div>
                <p className="text-sm font-medium">
                  {t.min_qty}–{t.max_qty || "∞"} qty → {t.discount_percent}% off
                </p>
                <p className="text-xs text-muted-foreground capitalize">Scope: {t.scope}</p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing({ ...t })}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(t.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {(!tiers || tiers.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">No quantity tiers configured.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuantityTiersTab;
