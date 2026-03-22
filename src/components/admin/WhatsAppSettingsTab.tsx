import { useState, useCallback, useEffect } from "react";
import { useSiteSettings, useUpdateSettingsBatch } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { Save, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const WhatsAppSettingsTab = () => {
  const { data: settings, isLoading } = useSiteSettings("whatsapp");
  const updateSettingsBatch = useUpdateSettingsBatch();
  const [local, setLocal] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    const waSettings: Record<string, any> = {};
    settings.forEach((s) => {
      waSettings[s.key] = s.value;
    });
    if (isDirty) return;
    setLocal(waSettings);
  }, [settings, isDirty]);

  const get = useCallback((key: string, fallback = "") => local[key] ?? fallback, [local]);
  const markDirty = useCallback(() => {
    setIsDirty(true);
    setLastSavedAt(null);
  }, []);
  const set = useCallback((key: string, value: any) => {
    markDirty();
    setLocal((prev) => ({ ...prev, [key]: value }));
  }, [markDirty]);

  const saveAll = async () => {
    const entries = Object.entries(local).filter(([, value]) => value !== undefined);
    if (!entries.length || !isDirty) return;

    setSaving(true);
    try {
      await updateSettingsBatch.mutateAsync({ section: "whatsapp", entries: entries.map(([key, value]) => ({ key, value })) });
      setIsDirty(false);
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      toast.success("WhatsApp settings saved!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading…</p>;

  return (
    <Card>
      <CardHeader><CardTitle className="font-serif flex items-center gap-2"><MessageCircle className="h-5 w-5 text-primary" /> WhatsApp Contact</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1.5"><Label className="text-xs font-medium">WhatsApp Number</Label><Input value={(get("number", "+8801703396108") as string)} onChange={(e) => set("number", e.target.value)} className="h-9 text-xs" placeholder="+8801703396108" /><p className="text-xs text-muted-foreground">Include country code</p></div>
        <div className="space-y-1.5"><Label className="text-xs font-medium">Default Message</Label><Textarea value={(get("message", "Hello! I have a question.") as string)} onChange={(e) => set("message", e.target.value)} rows={2} className="text-xs" /></div>
        <div className="space-y-2">
          <Button onClick={saveAll} disabled={saving || !isDirty} className="gap-2"><Save className="h-4 w-4" /> {saving ? "Saving..." : isDirty ? "Save WhatsApp" : "Saved"}</Button>
          <p className="text-xs text-muted-foreground">{saving ? "Saving your latest WhatsApp changes..." : lastSavedAt ? `Last saved at ${lastSavedAt}` : isDirty ? "You have unsaved changes." : "All WhatsApp changes are saved."}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WhatsAppSettingsTab;
