import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings, useUpdateSetting } from "@/hooks/useSiteSettings";
import { Save, Monitor, Tablet, Smartphone, Upload, RotateCcw, ChevronDown, ChevronUp, Minus, Plus, Image, Layout, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type Device = "mobile" | "tablet" | "desktop";

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

const DEFAULTS: Record<Device, Record<string, unknown>> = {
  mobile: { logo_width: 120, logo_height: 40, logo_position: "left", logo_offset_x: 0, logo_offset_y: 0, logo_scale: 100, header_height: 56, header_padding_x: 16, header_padding_y: 0, header_bg: "", sticky: true },
  tablet: { logo_width: 160, logo_height: 48, logo_position: "left", logo_offset_x: 0, logo_offset_y: 0, logo_scale: 100, header_height: 64, header_padding_x: 24, header_padding_y: 0, header_bg: "", sticky: true },
  desktop: { logo_width: 200, logo_height: 56, logo_position: "left", logo_offset_x: 0, logo_offset_y: 0, logo_scale: 100, header_height: 80, header_padding_x: 32, header_padding_y: 0, header_bg: "", sticky: true },
};

const sectionKey = (device: Device) => `layout_${device}`;

const LayoutSettingsTab = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const updateSetting = useUpdateSetting();
  const [device, setDevice] = useState<Device>("desktop");
  const [local, setLocal] = useState<Record<Device, Record<string, unknown>>>({ ...DEFAULTS });
  const [saving, setSaving] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  // Load settings from DB
  useEffect(() => {
    if (!settings) return;
    const next = { ...DEFAULTS };
    (["mobile", "tablet", "desktop"] as Device[]).forEach((d) => {
      const section = sectionKey(d);
      const sectionSettings = settings.filter((s) => s.section === section);
      const merged = { ...DEFAULTS[d] };
      sectionSettings.forEach((s) => {
        merged[s.key] = s.value;
      });
      next[d] = merged;
    });
    setLocal(next);

    // Get logo URL from header settings
    const logoSetting = settings.find((s) => s.section === "header" && s.key === "logo_url");
    if (logoSetting?.value) setLogoPreviewUrl(logoSetting.value as string);
  }, [settings]);

  const get = useCallback((key: string): unknown => {
    return local[device]?.[key] ?? DEFAULTS[device]?.[key] ?? "";
  }, [local, device]);

  const getNum = useCallback((key: string, fallback = 0): number => {
    const v = local[device]?.[key];
    return typeof v === "number" ? v : fallback;
  }, [local, device]);

  const set = useCallback((key: string, value: unknown) => {
    setLocal((prev) => ({
      ...prev,
      [device]: { ...prev[device], [key]: value },
    }));
  }, [device]);

  const saveDevice = async () => {
    setSaving(true);
    const section = sectionKey(device);
    const data = local[device];
    try {
      for (const [key, value] of Object.entries(data)) {
        await updateSetting.mutateAsync({ section, key, value });
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
    const url = urlData.publicUrl;
    await updateSetting.mutateAsync({ section: "header", key: "logo_url", value: url });
    setLogoPreviewUrl(url);
    toast.success("Logo uploaded!");
  };

  // Reusable slider with +/- buttons
  const SliderField = ({ label, valueKey, min = 0, max = 200, unit = "px" }: { label: string; valueKey: string; min?: number; max?: number; unit?: string }) => {
    const val = getNum(valueKey, (DEFAULTS[device][valueKey] as number) || 0);
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">{label}</Label>
          <span className="text-xs font-mono text-muted-foreground">{val}{unit}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => set(valueKey, Math.max(min, val - 1))}
            className="w-7 h-7 rounded-md bg-muted hover:bg-accent flex items-center justify-center shrink-0 transition-colors"
          >
            <Minus className="h-3 w-3" />
          </button>
          <Slider
            value={[val]}
            onValueChange={([v]) => set(valueKey, v)}
            min={min}
            max={max}
            step={1}
            className="flex-1"
          />
          <button
            type="button"
            onClick={() => set(valueKey, Math.min(max, val + 1))}
            className="w-7 h-7 rounded-md bg-muted hover:bg-accent flex items-center justify-center shrink-0 transition-colors"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  const Section = ({ title, icon: Icon, children, defaultOpen = true }: { title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean }) => {
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
  };

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading…</p>;

  const DeviceIcon = DEVICE_META[device].icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <Layout className="h-5 w-5 text-primary" /> Layout Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">Configure logo, header, and layout per device breakpoint.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Device Tabs */}
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
              {/* Logo Section */}
              <Section title="Logo" icon={Image} defaultOpen={true}>
                {/* Upload */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Upload Logo</Label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-3 py-2 text-xs font-medium border border-border rounded-lg cursor-pointer hover:bg-muted transition-colors">
                      <Upload className="h-3.5 w-3.5" />
                      Choose File
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    {logoPreviewUrl && (
                      <img src={logoPreviewUrl} alt="Logo" className="h-8 rounded object-contain" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Logo image is shared across all devices. Size/position is per-device.</p>
                </div>

                {/* Size */}
                <div className="grid grid-cols-2 gap-4">
                  <SliderField label="Width" valueKey="logo_width" min={40} max={400} />
                  <SliderField label="Height" valueKey="logo_height" min={20} max={200} />
                </div>

                {/* Position */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Alignment</Label>
                  <div className="flex gap-1.5">
                    {LOGO_POSITIONS.map((pos) => (
                      <button
                        key={pos.value}
                        onClick={() => set("logo_position", pos.value)}
                        className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
                          get("logo_position") === pos.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:bg-muted"
                        }`}
                      >
                        {pos.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fine position */}
                <div className="grid grid-cols-2 gap-4">
                  <SliderField label="Offset X" valueKey="logo_offset_x" min={-100} max={100} />
                  <SliderField label="Offset Y" valueKey="logo_offset_y" min={-50} max={50} />
                </div>

                {/* Scale */}
                <SliderField label="Scale" valueKey="logo_scale" min={50} max={200} unit="%" />

                {/* Live Preview */}
                {logoPreviewUrl && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Preview</Label>
                    <div
                      className="relative border border-dashed border-border rounded-xl overflow-hidden bg-muted/30 p-4"
                      style={{
                        height: `${Math.max(getNum("header_height", 80), 60)}px`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent:
                          get("logo_position") === "center" ? "center" :
                          get("logo_position") === "right" ? "flex-end" : "flex-start",
                        paddingLeft: `${getNum("header_padding_x", 16)}px`,
                        paddingRight: `${getNum("header_padding_x", 16)}px`,
                      }}
                    >
                      <img
                        src={logoPreviewUrl}
                        alt="Preview"
                        style={{
                          width: `${getNum("logo_width", 160)}px`,
                          height: `${getNum("logo_height", 48)}px`,
                          objectFit: "contain",
                          transform: `translate(${getNum("logo_offset_x", 0)}px, ${getNum("logo_offset_y", 0)}px) scale(${getNum("logo_scale", 100) / 100})`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </Section>

              {/* Header Section */}
              <Section title="Header" icon={Layout} defaultOpen={false}>
                <SliderField label="Height" valueKey="header_height" min={40} max={120} />

                <div className="grid grid-cols-2 gap-4">
                  <SliderField label="Horizontal Padding" valueKey="header_padding_x" min={0} max={64} />
                  <SliderField label="Vertical Padding" valueKey="header_padding_y" min={0} max={32} />
                </div>

                {/* Background Color */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Background Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={(get("header_bg") as string) || "#1a3a5c"}
                      onChange={(e) => set("header_bg", e.target.value)}
                      className="w-9 h-9 rounded-lg border border-border cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0"
                    />
                    <Input
                      value={(get("header_bg") as string) || ""}
                      onChange={(e) => set("header_bg", e.target.value)}
                      placeholder="Default theme color"
                      className="flex-1 h-9 text-xs font-mono"
                    />
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => set("header_bg", "")}>
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Sticky Toggle */}
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Sticky Header</p>
                    <p className="text-xs text-muted-foreground">Keep header visible when scrolling</p>
                  </div>
                  <Switch
                    checked={Boolean(get("sticky"))}
                    onCheckedChange={(v) => set("sticky", v)}
                  />
                </div>
              </Section>

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
