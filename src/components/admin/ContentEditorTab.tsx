import { useState, useEffect, useCallback } from "react";
import { useSiteSettings, useUpdateSettingsBatch } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { Save, RotateCcw, Type, ShoppingCart, AlertCircle, CheckCircle, Search, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

const SECTION = "content";

interface ContentGroup {
  title: string;
  icon: React.ReactNode;
  fields: { key: string; label: string; multiline?: boolean; placeholder?: string }[];
}

const GROUPS: Record<string, ContentGroup[]> = {
  buttons: [
    {
      title: "Shopping Actions",
      icon: <ShoppingCart className="h-4 w-4" />,
      fields: [
        { key: "btn_add_to_cart", label: "Add to Cart", placeholder: "Add to Cart" },
        { key: "btn_buy_now", label: "Buy Now", placeholder: "Buy Now" },
        { key: "btn_checkout", label: "Checkout", placeholder: "Proceed to Checkout" },
        { key: "btn_place_order", label: "Place Order", placeholder: "Place Order" },
        { key: "btn_continue_shopping", label: "Continue Shopping", placeholder: "Continue Shopping" },
        { key: "btn_view_cart", label: "View Cart", placeholder: "View Cart" },
        { key: "btn_apply_coupon", label: "Apply Coupon", placeholder: "Apply" },
      ],
    },
    {
      title: "Account Actions",
      icon: <Type className="h-4 w-4" />,
      fields: [
        { key: "btn_sign_in", label: "Sign In", placeholder: "Sign In" },
        { key: "btn_sign_up", label: "Sign Up", placeholder: "Create Account" },
        { key: "btn_sign_out", label: "Sign Out", placeholder: "Sign Out" },
        { key: "btn_save_profile", label: "Save Profile", placeholder: "Save Changes" },
      ],
    },
  ],
  messages: [
    {
      title: "Success Messages",
      icon: <CheckCircle className="h-4 w-4" />,
      fields: [
        { key: "msg_order_success", label: "Order Placed", placeholder: "Order Placed Successfully!", multiline: true },
        { key: "msg_profile_saved", label: "Profile Saved", placeholder: "Profile updated successfully" },
        { key: "msg_coupon_applied", label: "Coupon Applied", placeholder: "Coupon applied successfully!" },
        { key: "msg_item_added", label: "Item Added to Cart", placeholder: "Added to cart" },
      ],
    },
    {
      title: "Error Messages",
      icon: <AlertCircle className="h-4 w-4" />,
      fields: [
        { key: "msg_out_of_stock", label: "Out of Stock", placeholder: "This item is currently out of stock" },
        { key: "msg_invalid_coupon", label: "Invalid Coupon", placeholder: "Invalid or expired coupon code" },
        { key: "msg_login_required", label: "Login Required", placeholder: "Please sign in to continue" },
        { key: "msg_order_failed", label: "Order Failed", placeholder: "Something went wrong. Please try again." },
      ],
    },
    {
      title: "Empty States",
      icon: <Search className="h-4 w-4" />,
      fields: [
        { key: "msg_empty_cart", label: "Empty Cart Title", placeholder: "Your cart is empty" },
        { key: "msg_empty_cart_desc", label: "Empty Cart Description", placeholder: "Browse our collection and add books to your cart.", multiline: true },
        { key: "msg_no_results", label: "No Search Results", placeholder: "No books found matching your search." },
        { key: "msg_no_orders", label: "No Orders", placeholder: "You haven't placed any orders yet." },
      ],
    },
  ],
  placeholders: [
    {
      title: "Input Placeholders",
      icon: <MessageSquare className="h-4 w-4" />,
      fields: [
        { key: "ph_search", label: "Search Box", placeholder: "Search books..." },
        { key: "ph_email", label: "Email Input", placeholder: "Enter your email" },
        { key: "ph_password", label: "Password Input", placeholder: "Enter your password" },
        { key: "ph_coupon", label: "Coupon Input", placeholder: "Enter coupon code" },
        { key: "ph_name", label: "Name Input", placeholder: "Enter your full name" },
        { key: "ph_phone", label: "Phone Input", placeholder: "Enter phone number" },
        { key: "ph_address", label: "Address Input", placeholder: "Enter your address" },
        { key: "ph_transaction_id", label: "Transaction ID", placeholder: "Enter transaction ID" },
      ],
    },
  ],
};

// Build flat defaults from groups
const DEFAULTS: Record<string, string> = {};
Object.values(GROUPS).forEach((groups) =>
  groups.forEach((g) => g.fields.forEach((f) => { DEFAULTS[f.key] = f.placeholder || ""; }))
);

const ContentEditorTab = () => {
  const { data: allSettings, isLoading } = useSiteSettings(SECTION);
  const updateSettingsBatch = useUpdateSettingsBatch();
  const [local, setLocal] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (isDirty) return;
    const merged = { ...DEFAULTS };
    allSettings?.forEach((s) => {
      merged[s.key] = String(s.value ?? "");
    });
    setLocal(merged);
  }, [allSettings, isDirty]);

  const get = useCallback((key: string) => local[key] ?? DEFAULTS[key] ?? "", [local]);
  const markDirty = useCallback(() => {
    setIsDirty(true);
    setLastSavedAt(null);
  }, []);
  const set = useCallback((key: string, value: string) => {
    markDirty();
    setLocal((prev) => ({ ...prev, [key]: value }));
  }, [markDirty]);

  const saveAll = async () => {
    const entries = Object.entries(local).map(([key, value]) => ({ key, value }));
    if (!entries.length || !isDirty) return;

    setSaving(true);
    try {
      await updateSettingsBatch.mutateAsync({ section: SECTION, entries });
      setIsDirty(false);
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      toast.success("Content saved successfully");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    markDirty();
    setLocal({ ...DEFAULTS });
    toast.info("Reset to defaults — save to apply");
  };

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading…</p>;

  const renderGroup = (group: ContentGroup) => (
    <Collapsible key={group.title} defaultOpen>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-left p-3 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors group/collapsible">
        {group.icon}
        <span className="text-sm font-medium flex-1">{group.title}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]/collapsible:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {group.fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label className="text-xs font-medium">{f.label}</Label>
              {f.multiline ? (
                <Textarea
                  value={get(f.key)}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  rows={3}
                  className="text-sm"
                />
              ) : (
                <Input
                  value={get(f.key)}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="h-9 text-sm"
                />
              )}
              {get(f.key) !== (f.placeholder || "") && (
                <p className="text-[10px] text-muted-foreground">
                  Default: <span className="italic">{f.placeholder}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-serif flex items-center gap-2">
            <Type className="h-5 w-5 text-primary" /> Content Editor
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetAll} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
            <Button size="sm" onClick={saveAll} disabled={saving || !isDirty} className="gap-1.5">
              <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : isDirty ? "Save All" : "Saved"}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Edit button labels, messages, and placeholders. Changes apply site-wide after save.
        </p>
        <p className="text-xs text-muted-foreground">
          {saving ? "Saving your latest content changes..." : lastSavedAt ? `Last saved at ${lastSavedAt}` : isDirty ? "You have unsaved changes." : "All content changes are saved."}
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="buttons" className="space-y-4">
          <TabsList className="h-auto bg-muted p-1">
            <TabsTrigger value="buttons" className="text-xs gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" /> Buttons
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-xs gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" /> Messages
            </TabsTrigger>
            <TabsTrigger value="placeholders" className="text-xs gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" /> Placeholders
            </TabsTrigger>
          </TabsList>

          {Object.entries(GROUPS).map(([tabKey, groups]) => (
            <TabsContent key={tabKey} value={tabKey} className="space-y-4">
              {groups.map(renderGroup)}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ContentEditorTab;
