import { useState, useCallback, useEffect } from "react";
import { useSiteSettings, useUpdateSettingsBatch } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const HeroSettingsTab = () => {
  const { data: settings, isLoading } = useSiteSettings("hero");
  const updateSettingsBatch = useUpdateSettingsBatch();
  const [local, setLocal] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    const heroSettings: Record<string, any> = {};
    settings.forEach((s) => {
      heroSettings[s.key] = s.value;
    });
    if (isDirty) return;
    setLocal(heroSettings);
  }, [settings, isDirty]);

  const get = useCallback((key: string) => local[key] ?? "", [local]);
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
      await updateSettingsBatch.mutateAsync({ section: "hero", entries: entries.map(([key, value]) => ({ key, value })) });
      setIsDirty(false);
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      toast.success("Hero section saved!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading…</p>;

  return (
    <Card>
      <CardHeader><CardTitle className="font-serif">Hero Section</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-1.5"><Label className="text-xs font-medium">Badge Text</Label><Input value={(get("badge_text") as string) || ""} onChange={(e) => set("badge_text", e.target.value)} className="h-9 text-xs" /></div>
        <div className="space-y-1.5"><Label className="text-xs font-medium">Title</Label><Input value={(get("title") as string) || ""} onChange={(e) => set("title", e.target.value)} className="h-9 text-xs" /></div>
        <div className="space-y-1.5"><Label className="text-xs font-medium">Title Accent</Label><Input value={(get("title_accent") as string) || ""} onChange={(e) => set("title_accent", e.target.value)} className="h-9 text-xs" /></div>
        <div className="space-y-1.5"><Label className="text-xs font-medium">Description</Label><Textarea value={(get("description") as string) || ""} onChange={(e) => set("description", e.target.value)} rows={3} className="text-xs" /></div>
        <div className="space-y-1.5"><Label className="text-xs font-medium">Search Placeholder</Label><Input value={(get("search_placeholder") as string) || ""} onChange={(e) => set("search_placeholder", e.target.value)} className="h-9 text-xs" /></div>
        <div className="space-y-2">
          <Button onClick={saveAll} disabled={saving || !isDirty} className="gap-2"><Save className="h-4 w-4" /> {saving ? "Saving..." : isDirty ? "Save Hero" : "Saved"}</Button>
          <p className="text-xs text-muted-foreground">{saving ? "Saving your latest hero changes..." : lastSavedAt ? `Last saved at ${lastSavedAt}` : isDirty ? "You have unsaved changes." : "All hero changes are saved."}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HeroSettingsTab;
