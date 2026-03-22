import { useState } from "react";
import { Plus, Trash2, Save, Ticket, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCoupons, useUpsertCoupon, useDeleteCoupon } from "@/hooks/useAdvancedDiscounts";
import { toast } from "sonner";

interface CouponsTabProps {
  wholesaleOnly?: boolean;
  retailOnly?: boolean;
}

const CouponsTab = ({ wholesaleOnly, retailOnly }: CouponsTabProps) => {
  const { data: allCoupons, isLoading } = useCoupons();
  const coupons = allCoupons?.filter(c => {
    if (wholesaleOnly) return c.wholesale_only;
    if (retailOnly) return !c.wholesale_only;
    return true;
  });
  const upsert = useUpsertCoupon();
  const deleteCoupon = useDeleteCoupon();
  const [editing, setEditing] = useState<any>(null);

  const handleSave = async () => {
    if (!editing?.code?.trim()) {
      toast.error("Coupon code is required");
      return;
    }
    try {
      const toSave = { ...editing, code: editing.code.toUpperCase().trim() };
      await upsert.mutateAsync(toSave);
      toast.success("Coupon saved!");
      setEditing(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    try {
      await deleteCoupon.mutateAsync(id);
      toast.success("Coupon deleted");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Copied!");
  };

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Loading...</div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-serif flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          Coupon / Promo Codes
        </CardTitle>
        <Button
          size="sm"
          onClick={() => setEditing({
            code: "",
            discount_type: "percentage",
            discount_value: 10,
            min_order_amount: 0,
            expiry_date: null,
            usage_limit: null,
            used_count: 0,
            is_active: true,
            wholesale_only: !!wholesaleOnly,
            auto_apply: false,
            first_order_only: false,
            max_discount_amount: null,
          })}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add Coupon
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {editing && (
          <div className="p-4 bg-muted rounded-xl space-y-4 border border-border">
            <h3 className="text-sm font-semibold">{editing.id ? "Edit Coupon" : "New Coupon"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Coupon Code</Label>
                <Input
                  value={editing.code}
                  onChange={e => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                  placeholder="RAMADAN10"
                  className="h-9 text-xs font-mono uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Discount Type</Label>
                <Select value={editing.discount_type} onValueChange={v => setEditing({ ...editing, discount_type: v })}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage" className="text-xs">Percentage (%)</SelectItem>
                    <SelectItem value="fixed" className="text-xs">Fixed Amount (£)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Discount Value</Label>
                <Input
                  type="number"
                  min={0}
                  value={editing.discount_value}
                  onChange={e => setEditing({ ...editing, discount_value: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Min Order Amount (£)</Label>
                <Input
                  type="number"
                  min={0}
                  value={editing.min_order_amount || ""}
                  onChange={e => setEditing({ ...editing, min_order_amount: parseFloat(e.target.value) || 0 })}
                  className="h-9 text-xs"
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Expiry Date (optional)</Label>
                <Input
                  type="datetime-local"
                  value={editing.expiry_date ? new Date(editing.expiry_date).toISOString().slice(0, 16) : ""}
                  onChange={e => setEditing({ ...editing, expiry_date: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Usage Limit (empty = unlimited)</Label>
                <Input
                  type="number"
                  min={0}
                  value={editing.usage_limit || ""}
                  onChange={e => setEditing({ ...editing, usage_limit: parseInt(e.target.value) || null })}
                  className="h-9 text-xs"
                  placeholder="∞"
                />
              </div>
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.is_active}
                  onCheckedChange={v => setEditing({ ...editing, is_active: v })}
                />
                <Label className="text-xs">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.auto_apply ?? false}
                  onCheckedChange={v => setEditing({ ...editing, auto_apply: v })}
                />
                <Label className="text-xs">Auto Apply</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.first_order_only ?? false}
                  onCheckedChange={v => setEditing({ ...editing, first_order_only: v })}
                />
                <Label className="text-xs">First Order Only</Label>
              </div>
              {!wholesaleOnly && !retailOnly && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editing.wholesale_only}
                    onCheckedChange={v => setEditing({ ...editing, wholesale_only: v })}
                  />
                  <Label className="text-xs">Wholesale Only</Label>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Max Discount Amount (£, optional)</Label>
              <Input
                type="number"
                min={0}
                value={editing.max_discount_amount || ""}
                onChange={e => setEditing({ ...editing, max_discount_amount: e.target.value ? parseFloat(e.target.value) : null })}
                className="h-9 text-xs"
                placeholder="No cap"
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={upsert.isPending} className="gap-1.5">
                <Save className="h-3.5 w-3.5" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {coupons?.map(c => {
            const isExpired = c.expiry_date && new Date(c.expiry_date) < new Date();
            const isMaxed = c.usage_limit && c.used_count >= c.usage_limit;
            return (
              <div key={c.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-sm font-bold text-primary">{c.code}</span>
                    <button onClick={() => copyCode(c.code)} className="text-muted-foreground hover:text-foreground">
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {c.discount_type === "percentage" ? `${c.discount_value}% off` : `£${Number(c.discount_value).toFixed(2)} off`}
                      {c.min_order_amount ? ` • Min £${Number(c.min_order_amount).toFixed(2)}` : ""}
                      {c.wholesale_only ? " • Wholesale only" : ""}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Used: {c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ""}
                      {c.expiry_date ? ` • Expires: ${new Date(c.expiry_date).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!c.is_active && <span className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground">Inactive</span>}
                  {isExpired && <span className="text-[10px] px-1.5 py-0.5 bg-destructive/10 rounded text-destructive">Expired</span>}
                  {isMaxed && <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 rounded text-amber-700">Maxed</span>}
                  <Button size="sm" variant="ghost" onClick={() => setEditing({ ...c })}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(c.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
          {(!coupons || coupons.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">No coupons created yet.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CouponsTab;
