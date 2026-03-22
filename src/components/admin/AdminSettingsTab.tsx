import { useState, useEffect, useCallback } from "react";
import { useAppSettings, useUpdateAppSetting, useSettingsDefaults } from "@/hooks/useAppSettings";
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
  const updateSetting = useUpdateAppSetting();
  const DEFAULTS = useSettingsDefaults();
  const [local, setLocal] = useState<Record<string, Record<string, unknown>>>({});
  const [saving, setSaving] = useState(false);

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

  const set = useCallback((section: string, key: string, value: unknown) => {
    setLocal((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  }, []);

  const saveSection = async (section: string) => {
    const data = local[section];
    if (!data) return;
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(data)) {
        await updateSetting.mutateAsync({ section, key, value });
      }
      toast.success(`${section} settings saved`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
    setSaving(false);
  };

  const resetSection = (section: string) => {
    const defaults = DEFAULTS[section];
    if (!defaults) return;
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
    <div className="flex gap-2 pt-4 border-t border-border">
      <Button onClick={() => saveSection(section)} disabled={saving} size="sm" className="gap-1.5">
        <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
      </Button>
      <Button variant="outline" size="sm" onClick={() => resetSection(section)} className="gap-1.5">
        <RotateCcw className="h-3.5 w-3.5" /> Reset
      </Button>
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
