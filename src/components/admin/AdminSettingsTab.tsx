import { useState, useEffect, useCallback } from "react";
import { useAppSettings, useUpdateAppSetting, useSettingsDefaults } from "@/hooks/useAppSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Store, Mail, Type, MessageCircle, RotateCcw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminSettingsTab = () => {
  const { data: allSettings, isLoading } = useAppSettings();
  const updateSetting = useUpdateAppSetting();
  const DEFAULTS = useSettingsDefaults();
  const [local, setLocal] = useState<Record<string, Record<string, unknown>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!allSettings) return;
    const grouped: Record<string, Record<string, unknown>> = {};
    // Seed defaults first
    for (const [section, keys] of Object.entries(DEFAULTS)) {
      grouped[section] = { ...keys };
    }
    // Override with DB values
    allSettings.forEach((s) => {
      if (!grouped[s.section]) grouped[s.section] = {};
      grouped[s.section][s.key] = s.value;
    });
    setLocal(grouped);
  }, [allSettings, DEFAULTS]);

  const get = useCallback(
    (section: string, key: string) => local[section]?.[key] ?? DEFAULTS[section]?.[key] ?? "",
    [local, DEFAULTS]
  );

  const set = useCallback((section: string, key: string, value: unknown) => {
    setLocal((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  }, []);

  const saveSection = async (section: string) => {
    const sectionData = local[section];
    if (!sectionData) return;
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(sectionData)) {
        await updateSetting.mutateAsync({ section, key, value });
      }
      toast.success(`${section} settings saved!`);
    } catch (e: any) {
      toast.error(e.message);
    }
    setSaving(false);
  };

  const resetToDefaults = (section: string) => {
    const defaults = DEFAULTS[section];
    if (!defaults) return;
    setLocal((prev) => ({ ...prev, [section]: { ...defaults } }));
    toast.info("Reset to defaults — save to apply.");
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `logos/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("site-assets").upload(path, file);
    if (error) {
      toast.error("Upload failed: " + error.message);
      return;
    }
    const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
    set("store", "logo_url", urlData.publicUrl);
    toast.success("Logo uploaded — save to apply.");
  };

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading settings...</p>;

  const FieldInput = ({
    section,
    field,
    label,
    type = "text",
    placeholder,
  }: {
    section: string;
    field: string;
    label: string;
    type?: string;
    placeholder?: string;
  }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <Input
        type={type}
        value={String(get(section, field))}
        onChange={(e) => set(section, field, type === "number" ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder || label}
        className="h-9 text-sm"
      />
    </div>
  );

  const FieldTextarea = ({
    section,
    field,
    label,
    rows = 3,
  }: {
    section: string;
    field: string;
    label: string;
    rows?: number;
  }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <Textarea
        value={String(get(section, field))}
        onChange={(e) => set(section, field, e.target.value)}
        rows={rows}
        className="text-sm"
      />
    </div>
  );

  const SectionActions = ({ section }: { section: string }) => (
    <div className="flex items-center gap-2 pt-4 border-t border-border">
      <Button onClick={() => saveSection(section)} disabled={saving} className="gap-1.5">
        <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
      </Button>
      <Button variant="outline" onClick={() => resetToDefaults(section)} className="gap-1.5">
        <RotateCcw className="h-4 w-4" /> Reset Defaults
      </Button>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          Global Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure store details, UI text, messages, and email templates. Changes reflect across the entire application.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="store" className="space-y-4">
          <TabsList className="flex flex-wrap gap-1 h-auto bg-muted p-1">
            <TabsTrigger value="store" className="text-xs gap-1.5">
              <Store className="h-3.5 w-3.5" /> Store
            </TabsTrigger>
            <TabsTrigger value="ui_text" className="text-xs gap-1.5">
              <Type className="h-3.5 w-3.5" /> UI Text
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-xs gap-1.5">
              <MessageCircle className="h-3.5 w-3.5" /> Messages
            </TabsTrigger>
            <TabsTrigger value="email" className="text-xs gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Email
            </TabsTrigger>
          </TabsList>

          {/* Store Settings */}
          <TabsContent value="store" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput section="store" field="store_name" label="Store Name" />
              <FieldInput section="store" field="currency" label="Currency Symbol" placeholder="£" />
              <FieldInput section="store" field="currency_code" label="Currency Code" placeholder="GBP" />
              <FieldInput section="store" field="contact_email" label="Contact Email" type="email" />
              <FieldInput section="store" field="contact_phone" label="Contact Phone" />
              <FieldInput section="store" field="default_shipping_cost" label="Default Shipping Cost" type="number" />
              <FieldInput section="store" field="free_shipping_threshold" label="Free Shipping Threshold" type="number" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Store Logo</Label>
              <div className="flex items-center gap-4">
                <Input type="file" accept="image/*" onChange={handleLogoUpload} className="max-w-xs" />
                {get("store", "logo_url") && (
                  <img src={String(get("store", "logo_url"))} alt="Logo" className="h-12 rounded" />
                )}
              </div>
            </div>
            <SectionActions section="store" />
          </TabsContent>

          {/* UI Text Settings */}
          <TabsContent value="ui_text" className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Change button labels, placeholders, and other UI text. These values replace hardcoded text across the app.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput section="ui_text" field="add_to_cart" label="Add to Cart Button" />
              <FieldInput section="ui_text" field="buy_now" label="Buy Now Button" />
              <FieldInput section="ui_text" field="checkout" label="Checkout Button" />
              <FieldInput section="ui_text" field="place_order" label="Place Order Button" />
              <FieldInput section="ui_text" field="search_placeholder" label="Search Placeholder" />
              <FieldInput section="ui_text" field="login_title" label="Login Page Title" />
              <FieldInput section="ui_text" field="signup_title" label="Signup Page Title" />
            </div>
            <FieldInput section="ui_text" field="empty_cart" label="Empty Cart Title" />
            <FieldInput section="ui_text" field="empty_cart_desc" label="Empty Cart Description" />
            <FieldInput section="ui_text" field="order_success_title" label="Order Success Title" />
            <FieldInput section="ui_text" field="order_success_desc" label="Order Success Description" />
            <FieldInput section="ui_text" field="no_results" label="No Results Message" />
            <SectionActions section="ui_text" />
          </TabsContent>

          {/* Messages Settings */}
          <TabsContent value="messages" className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Customize toast messages, error texts, and status messages shown to users.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput section="messages" field="shipping_estimate_note" label="Shipping Estimate Note" />
              <FieldInput section="messages" field="price_updated" label="Price Updated Badge" />
              <FieldInput section="messages" field="prices_syncing" label="Prices Syncing Text" />
              <FieldInput section="messages" field="coupon_applied" label="Coupon Applied" />
              <FieldInput section="messages" field="coupon_invalid" label="Coupon Invalid" />
              <FieldInput section="messages" field="coupon_expired" label="Coupon Expired" />
              <FieldInput section="messages" field="coupon_already_used" label="Coupon Already Used" />
              <FieldInput section="messages" field="out_of_stock" label="Out of Stock" />
              <FieldInput section="messages" field="order_placed" label="Order Placed" />
              <FieldInput section="messages" field="login_required" label="Login Required" />
              <FieldInput section="messages" field="address_required" label="Address Required" />
              <FieldInput section="messages" field="txn_id_required" label="Transaction ID Required" />
              <FieldInput section="messages" field="txn_id_invalid" label="Transaction ID Invalid" />
              <FieldInput section="messages" field="txn_id_duplicate" label="Transaction ID Duplicate" />
            </div>
            <SectionActions section="messages" />
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email" className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
              <Switch
                checked={Boolean(get("email", "enabled"))}
                onCheckedChange={(v) => set("email", "enabled", v)}
              />
              <div>
                <p className="text-sm font-medium">Enable Email Sending</p>
                <p className="text-xs text-muted-foreground">Toggle email notifications on/off globally</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldInput section="email" field="sender_name" label="Sender Name" />
              <FieldInput section="email" field="sender_email" label="Sender Email" type="email" />
            </div>
            <FieldInput section="email" field="order_confirmation_subject" label="Order Confirmation Subject" />
            <FieldTextarea section="email" field="order_confirmation_body" label="Order Confirmation Body" rows={12} />
            <div className="bg-muted/30 rounded-lg p-3 border border-border">
              <p className="text-xs font-medium text-foreground mb-1">Available Variables:</p>
              <div className="flex flex-wrap gap-1.5">
                {["{{order_id}}", "{{customer_name}}", "{{items}}", "{{subtotal}}", "{{discount}}", "{{shipping}}", "{{total}}", "{{transaction_id}}"].map((v) => (
                  <code key={v} className="text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{v}</code>
                ))}
              </div>
            </div>
            <SectionActions section="email" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdminSettingsTab;
