import { useState, useCallback, useEffect } from "react";
import { useSiteSettings, useUpdateSetting } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const HeroSettingsTab = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const updateSetting = useUpdateSetting();
  const [local, setLocal] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!settings) return;
    const heroSettings: Record<string, any> = {};
    settings.forEach((s) => {
      if (s.section === "hero") heroSettings[s.key] = s.value;
    });
    setLocal(heroSettings);
  }, [settings]);

  const get = useCallback((key: string) => local[key] ?? "", [local]);
  const set = useCallback((key: string, value: any) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveAll = async () => {
    try {
      for (const [key, value] of Object.entries(local)) {
        await updateSetting.mutateAsync({ section: "hero", key, value });
      }
      toast.success("Hero section saved!");
    } catch (e: any) {
      toast.error(e.message);
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
        <Button onClick={saveAll} className="gap-2"><Save className="h-4 w-4" /> Save Hero</Button>
      </CardContent>
    </Card>
  );
};

export default HeroSettingsTab;
