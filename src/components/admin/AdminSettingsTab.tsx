import { useState, useEffect, useCallback } from "react";
import { useAppSettings, useUpdateAppSettingsBatch, useSettingsDefaults } from "@/hooks/useAppSettings";
import { toast } from "sonner";
import { Save, Settings2, Mail, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const AdminSettingsTab = () => {
  const { data: allSettings, isLoading } = useAppSettings();
  const updateSettingsBatch = useUpdateAppSettingsBatch();
  const DEFAULTS = useSettingsDefaults();
  const [local, setLocal] = useState<Record<string, Record<string, unknown>>>({});
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [dirtySections, setDirtySections] = useState<Record<string, boolean>>({});
  const [lastSavedAt, setLastSavedAt] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!allSettings) return;
    const grouped: Record<string, Record<string, unknown>> = {};
    for (const [section, keys] of Object.entries(DEFAULTS)) {
      grouped[section] = { ...keys };
    }
    allSettings.forEach((s) => {
      if (!grouped[s.section]) grouped[s.section] = {};
      grouped[s.section][s.key] = s.value;
    });
    setLocal(grouped);
  }, [allSettings, DEFAULTS]);

  const get = useCallback(
    (section: string, key: string) => local[section]?.[key] ?? DEFAULTS[section]?.[key] ?? "",
    [local, DEFAULTS],
  );

  const markDirty = useCallback((section: string) => {
    setDirtySections((prev) => ({ ...prev, [section]: true }));
    setLastSavedAt((prev) => ({ ...prev, [section]: null }));
  }, []);

  const set = useCallback((section: string, key: string, value: unknown) => {
    markDirty(section);
    setLocal((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  }, [markDirty]);

  const saveSection = async (section: string) => {
    const data = local[section];
    const entries = data ? Object.entries(data).map(([key, value]) => ({ key, value })) : [];
    if (!entries.length || !dirtySections[section]) return;

    setSavingSection(section);
    try {
      await updateSettingsBatch.mutateAsync({ section, entries });
      setDirtySections((prev) => ({ ...prev, [section]: false }));
      setLastSavedAt((prev) => ({ ...prev, [section]: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) }));
      toast.success(`${section} settings saved`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingSection(null);
    }
  };

  const resetSection = (section: string) => {
    const defaults = DEFAULTS[section];
    if (!defaults) return;
    markDirty(section);
    setLocal((prev) => ({ ...prev, [section]: { ...defaults } }));
    toast.info("Reset to defaults — save to apply");
  };

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading…</p>;

  const Field = ({ section, field, label, type = "text" }: { section: string; field: string; label: string; type?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <Input
        type={type}
        value={String(get(section, field))}
        onChange={(e) => set(section, field, type === "number" ? Number(e.target.value) : e.target.value)}
        className="h-9 text-sm"
      />
    </div>
  );

  const Actions = ({ section }: { section: string }) => (
    <div className="space-y-2 pt-4 border-t border-border">
      <div className="flex gap-2">
        <Button onClick={() => saveSection(section)} disabled={Boolean(savingSection) || !dirtySections[section]} size="sm" className="gap-1.5">
          <Save className="h-3.5 w-3.5" /> {savingSection === section ? "Saving..." : dirtySections[section] ? "Save" : "Saved"}
        </Button>
        <Button variant="outline" size="sm" onClick={() => resetSection(section)} className="gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{savingSection === section ? `Saving your latest ${section} changes...` : lastSavedAt[section] ? `Last saved at ${lastSavedAt[section]}` : dirtySections[section] ? "You have unsaved changes." : `All ${section} changes are saved.`}</p>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-primary" /> Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">Business rules and email configuration.</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="business" className="space-y-4">
          <TabsList className="h-auto bg-muted p-1">
            <TabsTrigger value="business" className="text-xs gap-1.5"><Settings2 className="h-3.5 w-3.5" /> Business</TabsTrigger>
            <TabsTrigger value="email" className="text-xs gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</TabsTrigger>
          </TabsList>

          <TabsContent value="business" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field section="business" field="currency" label="Currency Symbol" />
              <Field section="business" field="currency_code" label="Currency Code" />
              <Field section="business" field="default_shipping_cost" label="Default Shipping (£)" type="number" />
              <Field section="business" field="free_shipping_threshold" label="Free Shipping Threshold (£)" type="number" />
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Global Discount Cap</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field section="business" field="global_max_discount_percent" label="Max Discount % (0 = no cap)" type="number" />
                <Field section="business" field="global_max_discount_amount" label="Max Discount £ (0 = no cap)" type="number" />
              </div>
              <p className="text-[10px] text-muted-foreground">Total discount will never exceed these limits. Set 0 to disable.</p>
            </div>
            <p className="text-xs text-muted-foreground">UI texts are managed in the "Content" tab.</p>
            <Actions section="business" />
          </TabsContent>

          <TabsContent value="email" className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
              <Switch checked={Boolean(get("email", "enabled"))} onCheckedChange={(v) => set("email", "enabled", v)} />
              <div>
                <p className="text-sm font-medium">Enable Email Sending</p>
                <p className="text-xs text-muted-foreground">Toggle email notifications globally</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field section="email" field="sender_name" label="Sender Name" />
              <Field section="email" field="sender_email" label="Sender Email" />
            </div>
            <Field section="email" field="order_subject" label="Order Confirmation Subject" />
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Order Confirmation Body</Label>
              <Textarea
                value={String(get("email", "order_body"))}
                onChange={(e) => set("email", "order_body", e.target.value)}
                rows={8}
                className="text-sm font-mono"
              />
            </div>
            <div className="bg-muted/30 rounded-lg p-3 border border-border">
              <p className="text-xs font-medium mb-1">Variables:</p>
              <div className="flex flex-wrap gap-1.5">
                {["{{order_id}}", "{{customer_name}}", "{{items}}", "{{total}}"].map((v) => (
                  <code key={v} className="text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{v}</code>
                ))}
              </div>
            </div>
            <Actions section="email" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdminSettingsTab;
