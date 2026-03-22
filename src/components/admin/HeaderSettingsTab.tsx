import { useState, useCallback, useEffect, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings, useUpdateSetting } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { Save, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/* ── Stable row component — never remounts on sibling edits ── */
const NavLinkRow = memo(({
  index, label, href, onUpdateLabel, onUpdateHref, onRemove,
}: {
  index: number; label: string; href: string;
  onUpdateLabel: (i: number, val: string) => void;
  onUpdateHref: (i: number, val: string) => void;
  onRemove: (i: number) => void;
}) => (
  <div className="flex gap-2 items-center">
    <Input value={label} placeholder="Label" className="flex-1 h-8 text-xs"
      onChange={(e) => onUpdateLabel(index, e.target.value)}
      onClick={(e) => e.stopPropagation()} onFocus={(e) => e.stopPropagation()} />
    <Input value={href} placeholder="/path" className="flex-1 h-8 text-xs"
      onChange={(e) => onUpdateHref(index, e.target.value)}
      onClick={(e) => e.stopPropagation()} onFocus={(e) => e.stopPropagation()} />
    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => onRemove(index)}>
      <Trash2 className="h-3 w-3" />
    </Button>
  </div>
));
NavLinkRow.displayName = "NavLinkRow";

/* ── Main component ── */
const HeaderSettingsTab = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const updateSetting = useUpdateSetting();
  const [local, setLocal] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!settings) return;
    const headerSettings: Record<string, any> = {};
    settings.forEach((s) => {
      if (s.section === "header") headerSettings[s.key] = s.value;
    });
    setLocal(headerSettings);
  }, [settings]);

  const get = useCallback((key: string) => local[key] ?? "", [local]);
  const set = useCallback((key: string, value: any) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveAll = async () => {
    try {
      for (const [key, value] of Object.entries(local)) {
        await updateSetting.mutateAsync({ section: "header", key, value });
      }
      toast.success("Header saved!");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `logos/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("site-assets").upload(path, file);
    if (error) { toast.error("Upload failed: " + error.message); return; }
    const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
    set("logo_url", urlData.publicUrl);
    await updateSetting.mutateAsync({ section: "header", key: "logo_url", value: urlData.publicUrl });
    toast.success("Logo uploaded!");
  };

  const logoSizePx = typeof local.logo_size_px === "number" ? local.logo_size_px : 56;
  const links = (local.nav_links || []) as Array<{ label: string; href: string }>;

  // Stable callbacks that use index parameter — no closure over changing array
  const handleUpdateLabel = useCallback((index: number, val: string) => {
    setLocal((prev) => {
      const currentLinks = [...((prev.nav_links || []) as Array<{ label: string; href: string }>)];
      currentLinks[index] = { ...currentLinks[index], label: val };
      return { ...prev, nav_links: currentLinks };
    });
  }, []);

  const handleUpdateHref = useCallback((index: number, val: string) => {
    setLocal((prev) => {
      const currentLinks = [...((prev.nav_links || []) as Array<{ label: string; href: string }>)];
      currentLinks[index] = { ...currentLinks[index], href: val };
      return { ...prev, nav_links: currentLinks };
    });
  }, []);

  const handleRemoveLink = useCallback((index: number) => {
    setLocal((prev) => {
      const currentLinks = [...((prev.nav_links || []) as Array<{ label: string; href: string }>)];
      currentLinks.splice(index, 1);
      return { ...prev, nav_links: currentLinks };
    });
  }, []);

  const addLink = useCallback(() => {
    setLocal((prev) => ({
      ...prev,
      nav_links: [...((prev.nav_links || []) as Array<{ label: string; href: string }>), { label: "", href: "/" }],
    }));
  }, []);

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading…</p>;

  return (
    <Card>
      <CardHeader><CardTitle className="font-serif">Header & Navigation</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Upload Logo</label>
          <div className="flex items-center gap-4">
            <Input type="file" accept="image/*" onChange={handleLogoUpload} className="max-w-xs" />
            {get("logo_url") && <img src={get("logo_url") as string} alt="Logo" className="h-12 rounded" />}
          </div>
        </div>
        <div className="space-y-3">
          <Label className="text-xs font-medium text-foreground">Logo Size (px)</Label>
          <div className="flex items-center gap-3">
            <Slider value={[logoSizePx]} onValueChange={([v]) => set("logo_size_px", v)} min={20} max={120} step={1} className="flex-1" />
            <Input type="number" value={logoSizePx} onChange={(e) => set("logo_size_px", Math.min(120, Math.max(20, parseInt(e.target.value) || 56)))} className="w-20 h-9 text-xs text-center font-mono" />
            <span className="text-xs text-muted-foreground">px</span>
          </div>
          {get("logo_url") && (
            <div className="p-3 bg-muted/30 rounded-lg border border-dashed border-border">
              <p className="text-[10px] text-muted-foreground mb-2">Preview</p>
              <img src={get("logo_url") as string} alt="Preview" style={{ height: `${logoSizePx}px` }} className="object-contain" />
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground">Navigation Links</Label>
          <p className="text-xs text-muted-foreground mb-2">Edit labels and URLs for nav links</p>
          <div className="space-y-2">
            {links.map((link, i) => (
              <NavLinkRow key={i} index={i} label={link.label} href={link.href}
                onUpdateLabel={handleUpdateLabel} onUpdateHref={handleUpdateHref} onRemove={handleRemoveLink} />
            ))}
            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={addLink}>
              <Plus className="h-3 w-3" /> Add Link
            </Button>
          </div>
        </div>
        <Button onClick={saveAll} className="gap-2"><Save className="h-4 w-4" /> Save Header</Button>
      </CardContent>
    </Card>
  );
};

export default HeaderSettingsTab;
