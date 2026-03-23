import { useState, useCallback, useEffect, memo } from "react";
import { useSiteSettings, useUpdateSettingsBatch } from "@/hooks/useSiteSettings";
import { toast } from "sonner";
import { Save, Plus, Trash2, ChevronRight, GripVertical, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { getErrorMessage } from "@/lib/admin-submit";

type NavLink = { label: string; href: string; children?: NavLink[] };

/* ── helpers ── */
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
    if (path.length === 1) return { ...link, children: [...(link.children || []), { label: "", href: "/" }] };
    return { ...link, children: deepAddChild(link.children || [], path.slice(1)) };
  });
}

const NavLinkRow = memo(({ path, link, depth, onUpdate, onRemove, onAddChild }: {
  path: number[]; link: NavLink; depth: number;
  onUpdate: (p: number[], f: "label" | "href", v: string) => void;
  onRemove: (p: number[]) => void; onAddChild: (p: number[]) => void;
}) => (
  <div className="space-y-1.5">
    <div className="flex gap-2 items-center" style={{ paddingLeft: `${depth * 24}px` }}>
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
      {depth > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
      <Input value={link.label} placeholder="Label" className="flex-1 h-8 text-xs"
        onChange={(e) => onUpdate(path, "label", e.target.value)} onClick={(e) => e.stopPropagation()} />
      <Input value={link.href} placeholder="/path" className="flex-1 h-8 text-xs"
        onChange={(e) => onUpdate(path, "href", e.target.value)} onClick={(e) => e.stopPropagation()} />
      {depth < 3 && (
        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary shrink-0" onClick={() => onAddChild(path)}>
          <Plus className="h-3 w-3" />
        </Button>
      )}
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => onRemove(path)}>
        <Trash2 className="h-3 w-3" />
      </Button>
      {depth > 0 && <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0">L{depth}</Badge>}
    </div>
    {link.children?.map((child, ci) => (
      <NavLinkRow key={ci} path={[...path, ci]} link={child} depth={depth + 1}
        onUpdate={onUpdate} onRemove={onRemove} onAddChild={onAddChild} />
    ))}
  </div>
));
NavLinkRow.displayName = "MobileNavLinkRow";

const DRAWER_BG_OPTIONS = [
  { value: "white", label: "White (Light)" },
  { value: "navy", label: "Navy Blue (Dark)" },
  { value: "cream", label: "Cream" },
];

const MobileMenuSettingsTab = () => {
  const { data: settings, isLoading } = useSiteSettings("mobile_menu");
  const updateBatch = useUpdateSettingsBatch();
  const [local, setLocal] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!settings || isDirty) return;
    const map: Record<string, any> = {};
    settings.forEach((s) => { map[s.key] = s.value; });
    setLocal(map);
  }, [settings, isDirty]);

  const get = useCallback((key: string, fallback: any = "") => local[key] ?? fallback, [local]);
  const set = useCallback((key: string, value: any) => {
    setIsDirty(true);
    setLastSavedAt(null);
    setLocal((p) => ({ ...p, [key]: value }));
  }, []);

  const saveAll = async () => {
    const entries = Object.entries(local).filter(([, v]) => v !== undefined).map(([key, value]) => ({ key, value }));
    if (!entries.length) return;
    setSaving(true);
    try {
      await Promise.race([
        updateBatch.mutateAsync({ section: "mobile_menu", entries }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("Save timed out")), 15000)),
      ]);
      setIsDirty(false);
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      toast.success("✅ Mobile menu settings saved!");
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const links = (local.nav_links || []) as NavLink[];
  const handleUpdate = useCallback((path: number[], field: "label" | "href", val: string) => {
    setIsDirty(true);
    setLocal((p) => ({ ...p, nav_links: deepUpdateLinks((p.nav_links || []) as NavLink[], path, field, val) }));
  }, []);
  const handleRemove = useCallback((path: number[]) => {
    setIsDirty(true);
    setLocal((p) => ({ ...p, nav_links: deepRemoveLink((p.nav_links || []) as NavLink[], path) }));
  }, []);
  const handleAddChild = useCallback((path: number[]) => {
    setIsDirty(true);
    setLocal((p) => ({ ...p, nav_links: deepAddChild((p.nav_links || []) as NavLink[], path) }));
  }, []);
  const addTopLink = useCallback(() => {
    setIsDirty(true);
    setLocal((p) => ({ ...p, nav_links: [...((p.nav_links || []) as NavLink[]), { label: "", href: "/" }] }));
  }, []);

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading…</p>;

  const drawerWidth = typeof local.drawer_width === "number" ? local.drawer_width : 320;
  const borderRadius = typeof local.border_radius === "number" ? local.border_radius : 16;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-serif flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Mobile & Tablet Menu
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Configure the mobile/tablet hamburger drawer menu independently from the desktop header.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Drawer Appearance */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border/50">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Drawer Appearance</h4>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Background Theme</Label>
              <Select value={get("drawer_bg", "white") as string} onValueChange={(v) => set("drawer_bg", v)}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DRAWER_BG_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Drawer Width (px)</Label>
              <div className="flex items-center gap-3">
                <Slider value={[drawerWidth]} onValueChange={([v]) => set("drawer_width", v)} min={260} max={400} step={4} className="flex-1" />
                <Input type="number" value={drawerWidth} onChange={(e) => set("drawer_width", Math.min(400, Math.max(260, parseInt(e.target.value) || 320)))}
                  className="w-20 h-9 text-xs text-center font-mono" />
                <span className="text-xs text-muted-foreground">px</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Border Radius (px)</Label>
              <div className="flex items-center gap-3">
                <Slider value={[borderRadius]} onValueChange={([v]) => set("border_radius", v)} min={0} max={32} step={2} className="flex-1" />
                <Input type="number" value={borderRadius} onChange={(e) => set("border_radius", Math.min(32, Math.max(0, parseInt(e.target.value) || 16)))}
                  className="w-20 h-9 text-xs text-center font-mono" />
                <span className="text-xs text-muted-foreground">px</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Show Wholesale Button</Label>
              <Switch checked={get("show_wholesale", true) as boolean} onCheckedChange={(v) => set("show_wholesale", v)} />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Floating Card Style</Label>
              <Switch checked={get("floating_card", true) as boolean} onCheckedChange={(v) => set("floating_card", v)} />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Show Backdrop Blur</Label>
              <Switch checked={get("backdrop_blur", true) as boolean} onCheckedChange={(v) => set("backdrop_blur", v)} />
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-foreground">Mobile Navigation Links</Label>
            <p className="text-xs text-muted-foreground">
              These links appear only in the mobile/tablet drawer. Leave empty to use the same links as the desktop header.
            </p>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium">Use Custom Mobile Links</Label>
              <Switch checked={get("use_custom_links", false) as boolean} onCheckedChange={(v) => set("use_custom_links", v)} />
            </div>

            {get("use_custom_links", false) && (
              <div className="space-y-2 border border-border rounded-lg p-3 bg-muted/10">
                {links.map((link, i) => (
                  <NavLinkRow key={i} path={[i]} link={link} depth={0}
                    onUpdate={handleUpdate} onRemove={handleRemove} onAddChild={handleAddChild} />
                ))}
                <Button variant="outline" size="sm" className="gap-1 text-xs mt-2" onClick={addTopLink}>
                  <Plus className="h-3 w-3" /> Add Link
                </Button>
              </div>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="space-y-4 p-4 bg-muted/30 rounded-xl border border-border/50">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Authentication Buttons</h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Login Button Text</Label>
                <Input value={get("login_text", "Log In") as string} onChange={(e) => set("login_text", e.target.value)}
                  className="h-9 text-xs" placeholder="Log In" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Signup Button Text</Label>
                <Input value={get("signup_text", "Create Account") as string} onChange={(e) => set("signup_text", e.target.value)}
                  className="h-9 text-xs" placeholder="Create Account" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Show Auth Buttons</Label>
              <Switch checked={get("show_auth_buttons", true) as boolean} onCheckedChange={(v) => set("show_auth_buttons", v)} />
            </div>
          </div>

          {/* Save */}
          <div className="space-y-2">
            <Button onClick={saveAll} disabled={saving || !isDirty} className="gap-2 w-full sm:w-auto">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : isDirty ? "Save Mobile Menu" : "Saved"}
            </Button>
            <p className="text-xs text-muted-foreground">
              {saving ? "Saving..." : lastSavedAt ? `Last saved at ${lastSavedAt}` : isDirty ? "You have unsaved changes." : "All changes saved."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MobileMenuSettingsTab;
