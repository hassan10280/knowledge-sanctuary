import { useState, useCallback, useEffect, memo } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings, useUpdateSetting } from "@/hooks/useSiteSettings";
import { Save, Monitor, Tablet, Smartphone, Upload, RotateCcw, ChevronDown, ChevronUp, Minus, Plus, Image, Layout, Menu as MenuIcon, GripVertical, Eye, EyeOff, Trash2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type Device = "mobile" | "tablet" | "desktop";

interface MenuItem {
  id: string;
  label: string;
  href: string;
  visible: boolean;
  children: MenuItem[];
}

const DEVICE_META: Record<Device, { icon: React.ElementType; label: string; breakpoint: string }> = {
  mobile: { icon: Smartphone, label: "Mobile", breakpoint: "≤767px" },
  tablet: { icon: Tablet, label: "Tablet", breakpoint: "768–1024px" },
  desktop: { icon: Monitor, label: "Desktop", breakpoint: "≥1025px" },
};

const LOGO_POSITIONS = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
];

const MENU_LAYOUTS: Record<Device, Array<{ value: string; label: string }>> = {
  mobile: [{ value: "hamburger", label: "Hamburger" }],
  tablet: [
    { value: "hamburger", label: "Hamburger" },
    { value: "horizontal", label: "Horizontal" },
  ],
  desktop: [
    { value: "horizontal", label: "Horizontal" },
    { value: "dropdown", label: "With Dropdowns" },
  ],
};

const DEFAULT_MENU: MenuItem[] = [
  { id: "1", label: "Home", href: "/", visible: true, children: [] },
  { id: "2", label: "Browse Books", href: "/browse", visible: true, children: [] },
  { id: "3", label: "Categories", href: "/categories", visible: true, children: [] },
  { id: "4", label: "Membership", href: "/membership", visible: true, children: [] },
  { id: "5", label: "Contact", href: "/contact", visible: true, children: [] },
];

const DEFAULTS: Record<Device, Record<string, unknown>> = {
  mobile: { logo_width: 120, logo_height: 40, logo_position: "left", logo_offset_x: 0, logo_offset_y: 0, logo_scale: 100, header_height: 56, header_padding_x: 16, header_padding_y: 0, header_bg: "", sticky: true, menu_layout: "hamburger", menu_items: DEFAULT_MENU },
  tablet: { logo_width: 160, logo_height: 48, logo_position: "left", logo_offset_x: 0, logo_offset_y: 0, logo_scale: 100, header_height: 64, header_padding_x: 24, header_padding_y: 0, header_bg: "", sticky: true, menu_layout: "hamburger", menu_items: DEFAULT_MENU },
  desktop: { logo_width: 200, logo_height: 56, logo_position: "left", logo_offset_x: 0, logo_offset_y: 0, logo_scale: 100, header_height: 80, header_padding_x: 32, header_padding_y: 0, header_bg: "", sticky: true, menu_layout: "horizontal", menu_items: DEFAULT_MENU },
};

const sectionKey = (device: Device) => `layout_${device}`;
const genId = () => Math.random().toString(36).slice(2, 8);

/* ───────── Extracted stable sub-components ───────── */

const SliderField = memo(({ label, value, min = 0, max = 200, unit = "px", onChange }: {
  label: string; value: number; min?: number; max?: number; unit?: string;
  onChange: (v: number) => void;
}) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <Label className="text-xs font-medium">{label}</Label>
      <span className="text-xs font-mono text-muted-foreground">{value}{unit}</span>
    </div>
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="w-7 h-7 rounded-md bg-muted hover:bg-accent flex items-center justify-center shrink-0 transition-colors">
        <Minus className="h-3 w-3" />
      </button>
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={1} className="flex-1" />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="w-7 h-7 rounded-md bg-muted hover:bg-accent flex items-center justify-center shrink-0 transition-colors">
        <Plus className="h-3 w-3" />
      </button>
    </div>
  </div>
));
SliderField.displayName = "SliderField";

const CollapsibleSection = memo(({ title, icon: Icon, children, defaultOpen = true }: {
  title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-sm font-semibold">{title}</span>
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-4 pb-2 px-1 space-y-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
});
CollapsibleSection.displayName = "CollapsibleSection";

const MenuItemRowComponent = memo(({
  item, depth = 0, onUpdate, onRemove, onAddSub, onMove,
}: {
  item: MenuItem; depth?: number;
  onUpdate: (id: string, update: Partial<MenuItem>) => void;
  onRemove: (id: string) => void;
  onAddSub: (parentId: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) => (
  <div className="space-y-1.5">
    <div
      className="flex items-center gap-1.5 p-2 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors"
      style={{ marginLeft: `${depth * 20}px` }}
    >
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0 cursor-grab" />
      {depth > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
      <Input
        value={item.label}
        onChange={(e) => onUpdate(item.id, { label: e.target.value })}
        className="h-7 text-xs flex-1 min-w-0"
        placeholder="Label"
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
      />
      <Input
        value={item.href}
        onChange={(e) => onUpdate(item.id, { href: e.target.value })}
        className="h-7 text-xs w-24 font-mono"
        placeholder="/path"
        onClick={(e) => e.stopPropagation()}
        onFocus={(e) => e.stopPropagation()}
      />
      <button type="button" onClick={() => onUpdate(item.id, { visible: !item.visible })}
        className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors ${item.visible ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
        title={item.visible ? "Visible" : "Hidden"}>
        {item.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      </button>
      <button type="button" onClick={() => onMove(item.id, -1)} className="w-6 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted shrink-0" title="Move up">
        <ChevronUp className="h-3 w-3" />
      </button>
      <button type="button" onClick={() => onMove(item.id, 1)} className="w-6 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted shrink-0" title="Move down">
        <ChevronDown className="h-3 w-3" />
      </button>
      {depth === 0 && (
        <button type="button" onClick={() => onAddSub(item.id)} className="w-7 h-7 rounded-md bg-muted hover:bg-accent flex items-center justify-center shrink-0 transition-colors" title="Add sub-item">
          <Plus className="h-3 w-3" />
        </button>
      )}
      <button type="button" onClick={() => onRemove(item.id)} className="w-7 h-7 rounded-md hover:bg-destructive/10 text-destructive flex items-center justify-center shrink-0 transition-colors" title="Remove">
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
    {item.children.map((child) => (
      <MenuItemRowComponent key={child.id} item={child} depth={depth + 1} onUpdate={onUpdate} onRemove={onRemove} onAddSub={onAddSub} onMove={onMove} />
    ))}
  </div>
));
MenuItemRowComponent.displayName = "MenuItemRowComponent";

/* ───────── Main component ───────── */

const LayoutSettingsTab = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const updateSetting = useUpdateSetting();
  const [device, setDevice] = useState<Device>("desktop");
  const [local, setLocal] = useState<Record<Device, Record<string, unknown>>>({ mobile: { ...DEFAULTS.mobile }, tablet: { ...DEFAULTS.tablet }, desktop: { ...DEFAULTS.desktop } });
  const [saving, setSaving] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!settings) return;
    const next: Record<Device, Record<string, unknown>> = {
      mobile: { ...DEFAULTS.mobile }, tablet: { ...DEFAULTS.tablet }, desktop: { ...DEFAULTS.desktop },
    };
    (["mobile", "tablet", "desktop"] as Device[]).forEach((d) => {
      const section = sectionKey(d);
      settings.filter((s) => s.section === section).forEach((s) => { next[d][s.key] = s.value; });
    });
    setLocal(next);
    const logoSetting = settings.find((s) => s.section === "header" && s.key === "logo_url");
    if (logoSetting?.value) setLogoPreviewUrl(logoSetting.value as string);
  }, [settings]);

  const get = useCallback((key: string): unknown => local[device]?.[key] ?? DEFAULTS[device]?.[key] ?? "", [local, device]);
  const getNum = useCallback((key: string, fallback = 0): number => {
    const v = local[device]?.[key];
    return typeof v === "number" ? v : fallback;
  }, [local, device]);
  const set = useCallback((key: string, value: unknown) => {
    setLocal((prev) => ({ ...prev, [device]: { ...prev[device], [key]: value } }));
  }, [device]);

  const menuItems = (get("menu_items") as MenuItem[] | undefined) || DEFAULT_MENU;
  const setMenuItems = useCallback((items: MenuItem[]) => set("menu_items", items), [set]);

  const saveDevice = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(local[device])) {
        await updateSetting.mutateAsync({ section: sectionKey(device), key, value });
      }
      toast.success(`${DEVICE_META[device].label} layout saved!`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
    setSaving(false);
  };

  const resetDevice = () => {
    setLocal((prev) => ({ ...prev, [device]: { ...DEFAULTS[device] } }));
    toast.info("Reset to defaults — save to apply");
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = `logos/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("site-assets").upload(path, file);
    if (error) { toast.error("Upload failed: " + error.message); return; }
    const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
    await updateSetting.mutateAsync({ section: "header", key: "logo_url", value: urlData.publicUrl });
    setLogoPreviewUrl(urlData.publicUrl);
    toast.success("Logo uploaded!");
  };

  // Menu helpers via setLocal to avoid stale closures
  const updateMenuItemInTree = (items: MenuItem[], id: string, update: Partial<MenuItem>): MenuItem[] =>
    items.map((item) => item.id === id ? { ...item, ...update } : { ...item, children: updateMenuItemInTree(item.children, id, update) });

  const removeMenuItemFromTree = (items: MenuItem[], id: string): MenuItem[] =>
    items.filter((item) => item.id !== id).map((item) => ({ ...item, children: removeMenuItemFromTree(item.children, id) }));

  const addSubItemToTree = (items: MenuItem[], parentId: string): MenuItem[] =>
    items.map((item) => item.id === parentId
      ? { ...item, children: [...item.children, { id: genId(), label: "New Link", href: "/", visible: true, children: [] }] }
      : { ...item, children: addSubItemToTree(item.children, parentId) });

  const moveItemInTree = (items: MenuItem[], id: string, direction: -1 | 1): MenuItem[] => {
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return items.map((i) => ({ ...i, children: moveItemInTree(i.children, id, direction) }));
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= items.length) return items;
    const copy = [...items];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    return copy;
  };

  const handleUpdateItem = useCallback((id: string, update: Partial<MenuItem>) => {
    setLocal((prev) => {
      const items = (prev[device]?.["menu_items"] as MenuItem[] | undefined) || DEFAULT_MENU;
      return { ...prev, [device]: { ...prev[device], menu_items: updateMenuItemInTree(items, id, update) } };
    });
  }, [device]);

  const handleRemoveItem = useCallback((id: string) => {
    setLocal((prev) => {
      const items = (prev[device]?.["menu_items"] as MenuItem[] | undefined) || DEFAULT_MENU;
      return { ...prev, [device]: { ...prev[device], menu_items: removeMenuItemFromTree(items, id) } };
    });
  }, [device]);

  const handleAddSubItem = useCallback((parentId: string) => {
    setLocal((prev) => {
      const items = (prev[device]?.["menu_items"] as MenuItem[] | undefined) || DEFAULT_MENU;
      return { ...prev, [device]: { ...prev[device], menu_items: addSubItemToTree(items, parentId) } };
    });
  }, [device]);

  const handleMoveItem = useCallback((id: string, direction: -1 | 1) => {
    setLocal((prev) => {
      const items = (prev[device]?.["menu_items"] as MenuItem[] | undefined) || DEFAULT_MENU;
      return { ...prev, [device]: { ...prev[device], menu_items: moveItemInTree(items, id, direction) } };
    });
  }, [device]);

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading…</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <Layout className="h-5 w-5 text-primary" /> Layout Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">Configure logo, header, menu, and layout per device breakpoint.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={device} onValueChange={(v) => setDevice(v as Device)} className="space-y-5">
          <TabsList className="grid grid-cols-3 h-auto p-1">
            {(Object.entries(DEVICE_META) as [Device, typeof DEVICE_META[Device]][]).map(([key, meta]) => {
              const Icon = meta.icon;
              return (
                <TabsTrigger key={key} value={key} className="flex flex-col items-center gap-1 py-2.5 text-xs">
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{meta.label}</span>
                  <span className="text-[10px] text-muted-foreground">{meta.breakpoint}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(["mobile", "tablet", "desktop"] as Device[]).map((d) => (
            <TabsContent key={d} value={d} className="space-y-4 mt-0">
              {/* Logo */}
              <CollapsibleSection title="Logo" icon={Image} defaultOpen={true}>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Upload Logo</Label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-3 py-2 text-xs font-medium border border-border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                      <Upload className="h-3.5 w-3.5" /> Choose File
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    {logoPreviewUrl && <img src={logoPreviewUrl} alt="Logo" className="h-8 rounded object-contain" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Logo image shared across devices. Size/position is per-device.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <SliderField label="Width" value={getNum("logo_width", 160)} min={40} max={400} onChange={(v) => set("logo_width", v)} />
                  <SliderField label="Height" value={getNum("logo_height", 48)} min={20} max={200} onChange={(v) => set("logo_height", v)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Alignment</Label>
                  <div className="flex gap-1.5">
                    {LOGO_POSITIONS.map((pos) => (
                      <button key={pos.value} onClick={() => set("logo_position", pos.value)}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${get("logo_position") === pos.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}>
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <SliderField label="Offset X" value={getNum("logo_offset_x", 0)} min={-100} max={100} onChange={(v) => set("logo_offset_x", v)} />
                  <SliderField label="Offset Y" value={getNum("logo_offset_y", 0)} min={-50} max={50} onChange={(v) => set("logo_offset_y", v)} />
                </div>
                <SliderField label="Scale" value={getNum("logo_scale", 100)} min={50} max={200} unit="%" onChange={(v) => set("logo_scale", v)} />
                {logoPreviewUrl && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Preview</Label>
                    <div className="relative border border-dashed border-border rounded-xl overflow-hidden bg-muted/30 p-4"
                      style={{
                        height: `${Math.max(getNum("header_height", 80), 60)}px`, display: "flex", alignItems: "center",
                        justifyContent: get("logo_position") === "center" ? "center" : get("logo_position") === "right" ? "flex-end" : "flex-start",
                        paddingLeft: `${getNum("header_padding_x", 16)}px`, paddingRight: `${getNum("header_padding_x", 16)}px`,
                      }}>
                      <img src={logoPreviewUrl} alt="Preview" style={{
                        width: `${getNum("logo_width", 160)}px`, height: `${getNum("logo_height", 48)}px`, objectFit: "contain",
                        transform: `translate(${getNum("logo_offset_x", 0)}px, ${getNum("logo_offset_y", 0)}px) scale(${getNum("logo_scale", 100) / 100})`,
                      }} />
                    </div>
                  </div>
                )}
              </CollapsibleSection>

              {/* Header */}
              <CollapsibleSection title="Header" icon={Layout} defaultOpen={false}>
                <SliderField label="Height" value={getNum("header_height", 80)} min={40} max={120} onChange={(v) => set("header_height", v)} />
                <div className="grid grid-cols-2 gap-4">
                  <SliderField label="Horizontal Padding" value={getNum("header_padding_x", 32)} min={0} max={64} onChange={(v) => set("header_padding_x", v)} />
                  <SliderField label="Vertical Padding" value={getNum("header_padding_y", 0)} min={0} max={32} onChange={(v) => set("header_padding_y", v)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Background Color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={(get("header_bg") as string) || "#1a3a5c"} onChange={(e) => set("header_bg", e.target.value)} className="w-9 h-9 rounded-lg border border-border cursor-pointer" />
                    <Input value={(get("header_bg") as string) || ""} onChange={(e) => set("header_bg", e.target.value)} placeholder="Default theme color" className="flex-1 h-9 text-xs font-mono" />
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => set("header_bg", "")}>
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Sticky Header</p>
                    <p className="text-xs text-muted-foreground">Keep header visible when scrolling</p>
                  </div>
                  <Switch checked={Boolean(get("sticky"))} onCheckedChange={(v) => set("sticky", v)} />
                </div>
              </CollapsibleSection>

              {/* Menu Builder */}
              <CollapsibleSection title="Menu Builder" icon={MenuIcon} defaultOpen={false}>
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Menu Layout</Label>
                  <div className="flex gap-1.5">
                    {MENU_LAYOUTS[device].map((opt) => (
                      <button key={opt.value} onClick={() => set("menu_layout", opt.value)}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${get("menu_layout") === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {device === "mobile" ? "Mobile always uses hamburger menu." : `Choose how the menu displays on ${device}.`}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Menu Items</Label>
                    <span className="text-[11px] text-muted-foreground">{menuItems.length} items</span>
                  </div>
                  <div className="space-y-1.5">
                    {menuItems.map((item) => (
                      <MenuItemRowComponent key={item.id} item={item} depth={0}
                        onUpdate={handleUpdateItem} onRemove={handleRemoveItem}
                        onAddSub={handleAddSubItem} onMove={handleMoveItem} />
                    ))}
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs w-full"
                    onClick={() => setMenuItems([...menuItems, { id: genId(), label: "New Link", href: "/", visible: true, children: [] }])}>
                    <Plus className="h-3 w-3" /> Add Menu Item
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Preview</Label>
                  <div className="border border-dashed border-border rounded-xl p-3 bg-muted/30">
                    {get("menu_layout") === "hamburger" ? (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">☰ Hamburger Menu</span>
                        <div className="flex flex-col gap-0.5">
                          {menuItems.filter((i) => i.visible).slice(0, 3).map((i) => (
                            <span key={i.id} className="text-[10px] text-muted-foreground">{i.label}</span>
                          ))}
                          {menuItems.filter((i) => i.visible).length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{menuItems.filter((i) => i.visible).length - 3} more</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4 flex-wrap">
                        {menuItems.filter((i) => i.visible).map((i) => (
                          <div key={i.id} className="text-xs font-medium text-foreground">
                            {i.label}
                            {i.children.filter((c) => c.visible).length > 0 && <span className="text-[10px] text-muted-foreground ml-1">▾</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleSection>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-border">
                <Button onClick={saveDevice} disabled={saving} className="gap-1.5">
                  <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : `Save ${DEVICE_META[device].label}`}
                </Button>
                <Button variant="outline" onClick={resetDevice} className="gap-1.5">
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LayoutSettingsTab;
