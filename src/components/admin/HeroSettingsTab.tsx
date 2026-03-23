import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings, useUpdateSettingsBatch } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { Save, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/admin-submit";

const IMAGE_FIT_OPTIONS = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
  { value: "fill", label: "Fill" },
  { value: "none", label: "None" },
];

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
  const getNum = useCallback((key: string, fallback = 0) => {
    const v = local[key];
    return typeof v === "number" ? v : fallback;
  }, [local]);
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
      await Promise.race([
        updateSettingsBatch.mutateAsync({ section: "hero", entries: entries.map(([key, value]) => ({ key, value })) }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Save timed out. Please try again.")), 15000)),
      ]);
      setIsDirty(false);
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      toast.success("Hero section saved!");
    } catch (e: any) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `hero/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("site-assets").upload(path, file);
    if (error) { toast.error("Upload failed: " + error.message); return; }
    const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
    set("hero_image_url", urlData.publicUrl);
    toast.success("Hero image uploaded. Click Save to apply.");
  };

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading…</p>;

  return (
    <Card>
      <CardHeader><CardTitle className="font-serif">Hero Section</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {/* Text Fields */}
        <div className="space-y-1.5"><Label className="text-xs font-medium">Badge Text</Label><Input value={(get("badge_text") as string) || ""} onChange={(e) => set("badge_text", e.target.value)} className="h-9 text-xs" /></div>
        <div className="space-y-1.5"><Label className="text-xs font-medium">Title</Label><Input value={(get("title") as string) || ""} onChange={(e) => set("title", e.target.value)} className="h-9 text-xs" /></div>
        <div className="space-y-1.5"><Label className="text-xs font-medium">Title Accent</Label><Input value={(get("title_accent") as string) || ""} onChange={(e) => set("title_accent", e.target.value)} className="h-9 text-xs" /></div>
        <div className="space-y-1.5"><Label className="text-xs font-medium">Description</Label><Textarea value={(get("description") as string) || ""} onChange={(e) => set("description", e.target.value)} rows={3} className="text-xs" /></div>
        <div className="space-y-1.5"><Label className="text-xs font-medium">Search Placeholder</Label><Input value={(get("search_placeholder") as string) || ""} onChange={(e) => set("search_placeholder", e.target.value)} className="h-9 text-xs" /></div>

        {/* Hero Image Upload */}
        <div className="space-y-3 border-t border-border pt-4">
          <Label className="text-sm font-semibold">Hero Background Image</Label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-3 py-2 text-xs font-medium border border-border rounded-lg cursor-pointer hover:bg-muted transition-colors">
              <Upload className="h-3.5 w-3.5" /> Upload Image
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            {get("hero_image_url") && (
              <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => set("hero_image_url", "")}>
                <X className="h-3 w-3 mr-1" /> Remove
              </Button>
            )}
          </div>
          {get("hero_image_url") && (
            <div className="rounded-lg border border-dashed border-border overflow-hidden bg-muted/30">
              <img src={get("hero_image_url") as string} alt="Hero preview" className="w-full h-32 object-cover" />
            </div>
          )}
        </div>

        {/* Image Size/Fit */}
        <div className="space-y-3">
          <Label className="text-xs font-medium">Image Fit</Label>
          <div className="flex gap-1.5">
            {IMAGE_FIT_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => set("hero_image_fit", opt.value)}
                className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${(get("hero_image_fit") || "cover") === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Image Width</Label>
            <div className="flex items-center gap-2">
              <Slider value={[getNum("hero_image_width", 100)]} onValueChange={([v]) => set("hero_image_width", v)} min={20} max={100} step={1} className="flex-1" />
              <span className="text-xs font-mono text-muted-foreground w-10 text-right">{getNum("hero_image_width", 100)}%</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Image Height (px)</Label>
            <div className="flex items-center gap-2">
              <Slider value={[getNum("hero_image_height", 600)]} onValueChange={([v]) => set("hero_image_height", v)} min={200} max={1200} step={10} className="flex-1" />
              <span className="text-xs font-mono text-muted-foreground w-12 text-right">{getNum("hero_image_height", 600)}px</span>
            </div>
          </div>
        </div>

        {/* Padding & Margin */}
        <div className="space-y-3 border-t border-border pt-4">
          <Label className="text-sm font-semibold">Spacing Controls</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Padding Top (px)</Label>
              <div className="flex items-center gap-2">
                <Slider value={[getNum("hero_padding_top", 0)]} onValueChange={([v]) => set("hero_padding_top", v)} min={0} max={200} step={4} className="flex-1" />
                <Input type="number" value={getNum("hero_padding_top", 0)} onChange={(e) => set("hero_padding_top", parseInt(e.target.value) || 0)} className="w-16 h-8 text-xs text-center" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Padding Bottom (px)</Label>
              <div className="flex items-center gap-2">
                <Slider value={[getNum("hero_padding_bottom", 0)]} onValueChange={([v]) => set("hero_padding_bottom", v)} min={0} max={200} step={4} className="flex-1" />
                <Input type="number" value={getNum("hero_padding_bottom", 0)} onChange={(e) => set("hero_padding_bottom", parseInt(e.target.value) || 0)} className="w-16 h-8 text-xs text-center" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Padding Left (px)</Label>
              <div className="flex items-center gap-2">
                <Slider value={[getNum("hero_padding_left", 0)]} onValueChange={([v]) => set("hero_padding_left", v)} min={0} max={200} step={4} className="flex-1" />
                <Input type="number" value={getNum("hero_padding_left", 0)} onChange={(e) => set("hero_padding_left", parseInt(e.target.value) || 0)} className="w-16 h-8 text-xs text-center" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Padding Right (px)</Label>
              <div className="flex items-center gap-2">
                <Slider value={[getNum("hero_padding_right", 0)]} onValueChange={([v]) => set("hero_padding_right", v)} min={0} max={200} step={4} className="flex-1" />
                <Input type="number" value={getNum("hero_padding_right", 0)} onChange={(e) => set("hero_padding_right", parseInt(e.target.value) || 0)} className="w-16 h-8 text-xs text-center" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Margin Top (px)</Label>
              <div className="flex items-center gap-2">
                <Slider value={[getNum("hero_margin_top", 0)]} onValueChange={([v]) => set("hero_margin_top", v)} min={-100} max={200} step={4} className="flex-1" />
                <Input type="number" value={getNum("hero_margin_top", 0)} onChange={(e) => set("hero_margin_top", parseInt(e.target.value) || 0)} className="w-16 h-8 text-xs text-center" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium">Margin Bottom (px)</Label>
              <div className="flex items-center gap-2">
                <Slider value={[getNum("hero_margin_bottom", 0)]} onValueChange={([v]) => set("hero_margin_bottom", v)} min={-100} max={200} step={4} className="flex-1" />
                <Input type="number" value={getNum("hero_margin_bottom", 0)} onChange={(e) => set("hero_margin_bottom", parseInt(e.target.value) || 0)} className="w-16 h-8 text-xs text-center" />
              </div>
            </div>
          </div>
        </div>

        {/* Save */}
        <div className="space-y-2">
          <Button onClick={saveAll} disabled={saving || !isDirty} className="gap-2"><Save className="h-4 w-4" /> {saving ? "Saving..." : isDirty ? "Save Hero" : "Saved"}</Button>
          <p className="text-xs text-muted-foreground">{saving ? "Saving your latest hero changes..." : lastSavedAt ? `Last saved at ${lastSavedAt}` : isDirty ? "You have unsaved changes." : "All hero changes are saved."}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HeroSettingsTab;
