import { useState, useCallback, useEffect, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings, useUpdateSettingsBatch } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { Save, Plus, Trash2, ChevronRight, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export type NavLink = {
  label: string;
  href: string;
  children?: NavLink[];
};

/* ── Stable row component with nesting support ── */
const NavLinkRow = memo(({
  index, path, link, depth, onUpdate, onRemove, onAddChild,
}: {
  index: number;
  path: number[];
  link: NavLink;
  depth: number;
  onUpdate: (path: number[], field: "label" | "href", val: string) => void;
  onRemove: (path: number[]) => void;
  onAddChild: (path: number[]) => void;
}) => (
  <div className="space-y-1.5">
    <div className="flex gap-2 items-center" style={{ paddingLeft: `${depth * 24}px` }}>
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 cursor-grab" />
      {depth > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
      <Input value={link.label} placeholder="Label" className="flex-1 h-8 text-xs"
        onChange={(e) => onUpdate(path, "label", e.target.value)}
        onClick={(e) => e.stopPropagation()} onFocus={(e) => e.stopPropagation()} />
      <Input value={link.href} placeholder="/path" className="flex-1 h-8 text-xs"
        onChange={(e) => onUpdate(path, "href", e.target.value)}
        onClick={(e) => e.stopPropagation()} onFocus={(e) => e.stopPropagation()} />
      {depth < 3 && (
        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary shrink-0" title="Add sub-link"
          onClick={() => onAddChild(path)}>
          <Plus className="h-3 w-3" />
        </Button>
      )}
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => onRemove(path)}>
        <Trash2 className="h-3 w-3" />
      </Button>
      {depth > 0 && <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0">L{depth}</Badge>}
    </div>
    {link.children?.map((child, ci) => (
      <NavLinkRow key={ci} index={ci} path={[...path, ci]} link={child} depth={depth + 1}
        onUpdate={onUpdate} onRemove={onRemove} onAddChild={onAddChild} />
    ))}
  </div>
));
NavLinkRow.displayName = "NavLinkRow";

/* ── Helper: deep update/remove/addChild on nested nav_links ── */
function deepUpdateLinks(links: NavLink[], path: number[], field: "label" | "href", val: string): NavLink[] {
  return links.map((link, i) => {
    if (i !== path[0]) return link;
    if (path.length === 1) return { ...link, [field]: val };
    return { ...link, children: deepUpdateLinks(link.children || [], path.slice(1), field, val) };
  });
}

function deepRemoveLink(links: NavLink[], path: number[]): NavLink[] {
  if (path.length === 1) return links.filter((_, i) => i !== path[0]);
  return links.map((link, i) => {
    if (i !== path[0]) return link;
    return { ...link, children: deepRemoveLink(link.children || [], path.slice(1)) };
  });
}

function deepAddChild(links: NavLink[], path: number[]): NavLink[] {
  return links.map((link, i) => {
    if (i !== path[0]) return link;
    if (path.length === 1) {
      return { ...link, children: [...(link.children || []), { label: "", href: "/" }] };
    }
    return { ...link, children: deepAddChild(link.children || [], path.slice(1)) };
  });
}

/* ── Main component ── */
const HeaderSettingsTab = () => {
  const { data: settings, isLoading } = useSiteSettings("header");
  const updateSettingsBatch = useUpdateSettingsBatch();
  const [local, setLocal] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    const headerSettings: Record<string, any> = {};
    settings.forEach((s) => {
      headerSettings[s.key] = s.value;
    });
    if (isDirty) return;
    setLocal(headerSettings);
  }, [settings, isDirty]);

  const get = useCallback((key: string) => local[key] ?? "", [local]);
  const set = useCallback((key: string, value: any) => {
    setIsDirty(true);
    setLastSavedAt(null);
    setLocal((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveAll = async () => {
    const entries = Object.entries(local).filter(([, value]) => value !== undefined);
    if (!entries.length) return;

    setSaving(true);
    try {
      await updateSettingsBatch.mutateAsync({
        section: "header",
        entries: entries.map(([key, value]) => ({ key, value })),
      });
      setIsDirty(false);
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      toast.success("✅ Header settings saved successfully!");
    } catch (e: any) {
      toast.error("Save failed: " + e.message);
    } finally {
      setSaving(false);
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
    toast.success("Logo uploaded. Now click Save Header.");
  };

  const logoSizePx = typeof local.logo_size_px === "number" ? local.logo_size_px : 56;
  const links = (local.nav_links || []) as NavLink[];

  const handleUpdate = useCallback((path: number[], field: "label" | "href", val: string) => {
    setLocal((prev) => ({
      ...prev,
      nav_links: deepUpdateLinks((prev.nav_links || []) as NavLink[], path, field, val),
    }));
  }, []);

  const handleRemove = useCallback((path: number[]) => {
    setLocal((prev) => ({
      ...prev,
      nav_links: deepRemoveLink((prev.nav_links || []) as NavLink[], path),
    }));
  }, []);

  const handleAddChild = useCallback((path: number[]) => {
    setLocal((prev) => ({
      ...prev,
      nav_links: deepAddChild((prev.nav_links || []) as NavLink[], path),
    }));
  }, []);

  const addTopLink = useCallback(() => {
    setLocal((prev) => ({
      ...prev,
      nav_links: [...((prev.nav_links || []) as NavLink[]), { label: "", href: "/" }],
    }));
  }, []);

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading…</p>;

  return (
    <Card>
      <CardHeader><CardTitle className="font-serif">Header & Navigation</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Upload */}
        <div>
          <label className="text-sm font-medium text-foreground block mb-2">Upload Logo</label>
          <div className="flex items-center gap-4">
            <Input type="file" accept="image/*" onChange={handleLogoUpload} className="max-w-xs" />
            {get("logo_url") && <img src={get("logo_url") as string} alt="Logo" className="h-12 rounded" />}
          </div>
        </div>

        {/* Logo Size */}
        <div className="space-y-3">
          <Label className="text-xs font-medium text-foreground">Logo Size (px)</Label>
          <div className="flex items-center gap-3">
            <Slider value={[logoSizePx]} onValueChange={([v]) => set("logo_size_px", v)} min={20} max={120} step={1} className="flex-1" />
            <Input type="number" value={logoSizePx} onChange={(e) => set("logo_size_px", Math.min(120, Math.max(20, parseInt(e.target.value) || 56)))} className="w-20 h-9 text-xs text-center font-mono"
              onClick={(e) => e.stopPropagation()} onFocus={(e) => e.stopPropagation()} />
            <span className="text-xs text-muted-foreground">px</span>
          </div>
          {get("logo_url") && (
            <div className="p-3 bg-muted/30 rounded-lg border border-dashed border-border">
              <p className="text-[10px] text-muted-foreground mb-2">Preview</p>
              <img src={get("logo_url") as string} alt="Preview" style={{ height: `${logoSizePx}px` }} className="object-contain" />
            </div>
          )}
        </div>

        {/* Navigation Links with nesting */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground">Navigation Links</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Edit labels, URLs, and add sub-links (up to 4 levels). Click <Plus className="inline h-3 w-3" /> to add a child.
          </p>
          <div className="space-y-2 border border-border rounded-lg p-3 bg-muted/10">
            {links.map((link, i) => (
              <NavLinkRow key={i} index={i} path={[i]} link={link} depth={0}
                onUpdate={handleUpdate} onRemove={handleRemove} onAddChild={handleAddChild} />
            ))}
            <Button variant="outline" size="sm" className="gap-1 text-xs mt-2" onClick={addTopLink}>
              <Plus className="h-3 w-3" /> Add Top-Level Link
            </Button>
          </div>
        </div>

        {/* Save Button */}
        <div className="space-y-2">
          <Button onClick={saveAll} disabled={saving || !isDirty} className="gap-2 w-full sm:w-auto">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : isDirty ? "Save Header" : "Saved"}
          </Button>
          <p className="text-xs text-muted-foreground">
            {saving ? "Saving your latest header changes..." : lastSavedAt ? `Last saved at ${lastSavedAt}` : isDirty ? "You have unsaved changes." : "All header changes are saved."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default HeaderSettingsTab;
