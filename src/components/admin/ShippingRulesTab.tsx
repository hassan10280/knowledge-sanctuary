import { useState } from "react";
import { Plus, Trash2, Save, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useShippingRules, useUpsertShippingRule, useDeleteShippingRule } from "@/hooks/useAdvancedDiscounts";
import { toast } from "sonner";
import { getErrorMessage, isBlank, isValidNumber } from "@/lib/admin-submit";

interface ShippingRulesTabProps {
  wholesaleOnly?: boolean;
  retailOnly?: boolean;
}

const ShippingRulesTab = ({ wholesaleOnly, retailOnly }: ShippingRulesTabProps) => {
  const { data: allRules, isLoading } = useShippingRules();
  const rules = allRules?.filter(r => {
    if (wholesaleOnly) return r.is_wholesale;
    if (retailOnly) return !r.is_wholesale;
    return true;
  });
  const upsert = useUpsertShippingRule();
  const deleteRule = useDeleteShippingRule();
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!editing) {
      toast.error("No shipping rule data found.");
      return;
    }

    if (isBlank(editing.rule_name)) {
      toast.error("Rule Name is required.");
      return;
    }

    if (!isValidNumber(Number(editing.min_amount), { min: 0 })) {
      toast.error("Min Order Amount must be 0 or greater.");
      return;
    }

    if (!isValidNumber(Number(editing.shipping_cost), { min: 0 })) {
      toast.error("Shipping Cost must be 0 or greater.");
      return;
    }

    setSaving(true);
    try {
      await upsert.mutateAsync(editing);
      toast.success("Shipping rule saved!");
      setEditing(null);
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this rule?")) return;
    try {
      await deleteRule.mutateAsync(id);
      toast.success("Rule deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-serif flex items-center gap-2">
          <Truck className="h-5 w-5 text-primary" />
          Shipping Rules
        </CardTitle>
        <Button
          size="sm"
          onClick={() => setEditing({ rule_name: "", min_amount: 25, shipping_cost: 0, is_wholesale: !!wholesaleOnly, is_active: true })}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add Rule
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <strong>How it works:</strong> The system finds the best matching rule based on order amount. If shipping cost is £0, it means free shipping. Wholesale-specific rules apply only to wholesale customers.
        </div>

        {editing && (
          <div className="p-4 bg-muted rounded-xl space-y-4 border border-border">
            <h3 className="text-sm font-semibold">{editing.id ? "Edit Rule" : "New Rule"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Rule Name</Label>
                <Input
                  value={editing.rule_name}
                  onChange={e => setEditing({ ...editing, rule_name: e.target.value })}
                  placeholder="Free shipping over £25"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Min Order Amount (£)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editing.min_amount}
                  onChange={e => setEditing({ ...editing, min_amount: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Shipping Cost (£0 = free)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={editing.shipping_cost}
                  onChange={e => setEditing({ ...editing, shipping_cost: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              {!wholesaleOnly && !retailOnly && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editing.is_wholesale}
                    onCheckedChange={v => setEditing({ ...editing, is_wholesale: v })}
                  />
                  <Label className="text-xs">Wholesale Only</Label>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.is_active}
                  onCheckedChange={v => setEditing({ ...editing, is_active: v })}
                />
                <Label className="text-xs">Active</Label>
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
          {rules?.map(r => (
            <div key={r.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
              <div>
                <p className="text-sm font-medium">{r.rule_name}</p>
                <p className="text-xs text-muted-foreground">
                  Orders ≥ £{Number(r.min_amount).toFixed(2)} →{" "}
                  {Number(r.shipping_cost) === 0 ? "Free Shipping" : `£${Number(r.shipping_cost).toFixed(2)}`}
                  {r.is_wholesale ? " • Wholesale only" : " • All customers"}
                  {!r.is_active ? " • Inactive" : ""}
                </p>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => setEditing({ ...r })}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {(!rules || rules.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">No shipping rules configured. Default: £3.99 shipping, free over £25.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ShippingRulesTab;
