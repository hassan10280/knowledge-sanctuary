import { useStackingRules, useUpdateStackingRule } from "@/hooks/useStackingRules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";

const RULE_LABELS: Record<string, string> = {
  coupon_plus_quantity: "Coupon + Quantity Tier",
  coupon_plus_wholesale: "Coupon + Wholesale Price",
  bundle_plus_category: "Bundle + Category Discount",
  coupon_plus_order_total: "Coupon + Order Total Discount",
  wholesale_plus_other: "Wholesale + Other Discounts",
};

const StackingRulesTab = () => {
  const { data: rules, isLoading } = useStackingRules();
  const updateRule = useUpdateStackingRule();

  const handleToggle = async (id: string, allowed: boolean) => {
    try {
      await updateRule.mutateAsync({ id, allowed });
      toast.success("Rule updated");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2 text-base">
          <Layers className="h-4 w-4 text-primary" />
          Discount Stacking Rules
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Control which discount types can be combined together. Disabled = only the highest priority discount applies.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rules?.map((rule) => (
          <div
            key={rule.id}
            className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
          >
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">
                {RULE_LABELS[rule.rule_key] || rule.rule_key}
              </Label>
              <p className="text-xs text-muted-foreground">{rule.description}</p>
            </div>
            <Switch
              checked={rule.allowed}
              onCheckedChange={(checked) => handleToggle(rule.id, checked)}
            />
          </div>
        ))}

        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            <strong>Priority Order:</strong> Fixed Price → Wholesale → Product → Publisher → Category → Bundle → Quantity Tier → Coupon.
            Higher priority discounts always override lower ones unless stacking is explicitly allowed above.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default StackingRulesTab;
