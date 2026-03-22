import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useSiteSettings, useUpdateSetting } from "@/hooks/useSiteSettings";
import { Save, RotateCcw, Palette, Type, Ruler, RectangleHorizontal, ChevronUp, ChevronDown, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const FONT_OPTIONS = [
  "Instrument Serif", "Georgia", "Geist", "system-ui", "Inter", "Roboto",
  "Open Sans", "Lora", "Playfair Display", "Merriweather", "Poppins", "Montserrat",
];

const DEFAULTS: Record<string, unknown> = {
  // Colors (hex)
  color_primary: "#2e7eb5",
  color_secondary: "#edf2f7",
  color_accent: "#d4a04a",
  color_background: "#f7f9fb",
  color_foreground: "#1e3349",
  color_muted: "#eceef1",
  color_destructive: "#e04848",
  // Typography
  font_heading: "Instrument Serif",
  font_body: "Geist",
  font_size_base: 16,
  font_size_heading: 32,
  font_weight_body: "400",
  font_weight_heading: "700",
  line_height: 160,
  // Spacing
  spacing_unit: 4,
  spacing_scale: 100,
  // Border
  border_radius: 12,
  border_radius_button: 8,
  border_radius_card: 12,
  border_radius_input: 8,
};

const SECTION = "design_system";

const DesignSystemTab = () => {
  const { data: settings, isLoading } = useSiteSettings(SECTION);
  const updateSetting = useUpdateSetting();
  const [local, setLocal] = useState<Record<string, unknown>>({ ...DEFAULTS });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    const merged = { ...DEFAULTS };
    settings.forEach((s) => {
      merged[s.key] = s.value;
    });
    setLocal(merged);
  }, [settings]);

  const get = useCallback((key: string): unknown => local[key] ?? DEFAULTS[key] ?? "", [local]);
  const getNum = useCallback((key: string): number => {
    const v = local[key];
    return typeof v === "number" ? v : (DEFAULTS[key] as number) ?? 0;
  }, [local]);
  const set = useCallback((key: string, value: unknown) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(local)) {
        await updateSetting.mutateAsync({ section: SECTION, key, value });
      }
      toast.success("Design system saved!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
    setSaving(false);
  };

  const resetAll = () => {
    setLocal({ ...DEFAULTS });
    toast.info("Reset to defaults — save to apply");
  };

  const ColorField = ({ label, settingsKey }: { label: string; settingsKey: string }) => {
    const val = (get(settingsKey) as string) || "#000000";
    return (
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">{label}</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={val}
            onChange={(e) => set(settingsKey, e.target.value)}
            className="w-9 h-9 rounded-lg border border-border cursor-pointer [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0"
          />
          <Input value={val} onChange={(e) => set(settingsKey, e.target.value)} className="flex-1 h-8 text-xs font-mono" />
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => set(settingsKey, DEFAULTS[settingsKey])}>
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  const SliderField = ({ label, settingsKey, min = 0, max = 100, unit = "px" }: { label: string; settingsKey: string; min?: number; max?: number; unit?: string }) => {
    const val = getNum(settingsKey);
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">{label}</Label>
          <span className="text-xs font-mono text-muted-foreground">{val}{unit}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => set(settingsKey, Math.max(min, val - 1))} className="w-7 h-7 rounded-md bg-muted hover:bg-accent flex items-center justify-center shrink-0 transition-colors">
            <Minus className="h-3 w-3" />
          </button>
          <Slider value={[val]} onValueChange={([v]) => set(settingsKey, v)} min={min} max={max} step={1} className="flex-1" />
          <button type="button" onClick={() => set(settingsKey, Math.min(max, val + 1))} className="w-7 h-7 rounded-md bg-muted hover:bg-accent flex items-center justify-center shrink-0 transition-colors">
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  };

  const SectionPanel = ({ title, icon: Icon, children, defaultOpen = true }: { title: string; icon: React.ElementType; children: React.ReactNode; defaultOpen?: boolean }) => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" /> Design System
        </CardTitle>
        <p className="text-sm text-muted-foreground">Global colors, typography, spacing, and border radius controls.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Colors */}
        <SectionPanel title="Color Palette" icon={Palette} defaultOpen={true}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ColorField label="Primary" settingsKey="color_primary" />
            <ColorField label="Secondary" settingsKey="color_secondary" />
            <ColorField label="Accent (Gold)" settingsKey="color_accent" />
            <ColorField label="Background" settingsKey="color_background" />
            <ColorField label="Text (Foreground)" settingsKey="color_foreground" />
            <ColorField label="Muted" settingsKey="color_muted" />
            <ColorField label="Destructive (Error)" settingsKey="color_destructive" />
          </div>

          {/* Live palette preview */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Preview</Label>
            <div className="flex gap-2 flex-wrap">
              {["color_primary", "color_secondary", "color_accent", "color_background", "color_foreground", "color_muted", "color_destructive"].map((key) => (
                <div key={key} className="flex flex-col items-center gap-1">
                  <div
                    className="w-10 h-10 rounded-lg border border-border shadow-sm"
                    style={{ backgroundColor: get(key) as string }}
                  />
                  <span className="text-[9px] text-muted-foreground capitalize">{key.replace("color_", "")}</span>
                </div>
              ))}
            </div>
          </div>
        </SectionPanel>

        {/* Typography */}
        <SectionPanel title="Typography" icon={Type} defaultOpen={false}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Heading Font</Label>
              <Select value={(get("font_heading") as string) || "Instrument Serif"} onValueChange={(v) => set("font_heading", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Body Font</Label>
              <Select value={(get("font_body") as string) || "Geist"} onValueChange={(v) => set("font_body", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONT_OPTIONS.map((f) => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SliderField label="Base Font Size" settingsKey="font_size_base" min={12} max={24} />
            <SliderField label="Heading Size" settingsKey="font_size_heading" min={20} max={64} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Body Weight</Label>
              <Select value={(get("font_weight_body") as string) || "400"} onValueChange={(v) => set("font_weight_body", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["300", "400", "500", "600", "700"].map((w) => <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Heading Weight</Label>
              <Select value={(get("font_weight_heading") as string) || "700"} onValueChange={(v) => set("font_weight_heading", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["400", "500", "600", "700", "800", "900"].map((w) => <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <SliderField label="Line Height" settingsKey="line_height" min={100} max={250} unit="%" />

          {/* Typography preview */}
          <div className="space-y-2 p-4 rounded-xl border border-dashed border-border bg-muted/30">
            <Label className="text-xs font-medium text-muted-foreground">Preview</Label>
            <h3
              style={{
                fontFamily: (get("font_heading") as string) || "serif",
                fontSize: `${getNum("font_size_heading")}px`,
                fontWeight: (get("font_weight_heading") as string) || "700",
                lineHeight: `${getNum("line_height")}%`,
                color: get("color_foreground") as string,
              }}
            >
              Heading Preview
            </h3>
            <p
              style={{
                fontFamily: (get("font_body") as string) || "sans-serif",
                fontSize: `${getNum("font_size_base")}px`,
                fontWeight: (get("font_weight_body") as string) || "400",
                lineHeight: `${getNum("line_height")}%`,
                color: get("color_foreground") as string,
              }}
            >
              Body text preview — The quick brown fox jumps over the lazy dog. This shows how your selected fonts and sizes will look.
            </p>
          </div>
        </SectionPanel>

        {/* Spacing */}
        <SectionPanel title="Spacing" icon={Ruler} defaultOpen={false}>
          <SliderField label="Base Unit" settingsKey="spacing_unit" min={2} max={12} />
          <SliderField label="Scale Factor" settingsKey="spacing_scale" min={50} max={200} unit="%" />
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Preview</Label>
            <div className="flex items-end gap-1 p-3 rounded-lg border border-dashed border-border bg-muted/30">
              {[1, 2, 3, 4, 6, 8].map((mult) => {
                const size = Math.round(getNum("spacing_unit") * mult * getNum("spacing_scale") / 100);
                return (
                  <div key={mult} className="flex flex-col items-center gap-1">
                    <div className="bg-primary/30 rounded" style={{ width: `${size}px`, height: `${size}px` }} />
                    <span className="text-[9px] text-muted-foreground">{size}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </SectionPanel>

        {/* Border Radius */}
        <SectionPanel title="Border Radius" icon={RectangleHorizontal} defaultOpen={false}>
          <SliderField label="Global Radius" settingsKey="border_radius" min={0} max={32} />
          <SliderField label="Button Radius" settingsKey="border_radius_button" min={0} max={32} />
          <SliderField label="Card Radius" settingsKey="border_radius_card" min={0} max={32} />
          <SliderField label="Input Radius" settingsKey="border_radius_input" min={0} max={32} />

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">Preview</Label>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border bg-muted/30">
              <div
                className="w-20 h-14 bg-primary/15 border border-primary/30 flex items-center justify-center"
                style={{ borderRadius: `${getNum("border_radius_card")}px` }}
              >
                <span className="text-[9px] text-primary font-medium">Card</span>
              </div>
              <div
                className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-medium"
                style={{ borderRadius: `${getNum("border_radius_button")}px` }}
              >
                Button
              </div>
              <div
                className="px-3 py-1 border border-input text-xs text-muted-foreground"
                style={{ borderRadius: `${getNum("border_radius_input")}px` }}
              >
                Input
              </div>
            </div>
          </div>
        </SectionPanel>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-border">
          <Button onClick={saveAll} disabled={saving} className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save Design System"}
          </Button>
          <Button variant="outline" onClick={resetAll} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DesignSystemTab;
