import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useSiteSettings, useUpdateSetting } from "@/hooks/useSiteSettings";
import { Save, Plus, Trash2, RotateCcw, ChevronUp, ChevronDown, Link2, MessageSquare, Phone, Globe, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface FooterLink {
  label: string;
  href: string;
}

const SOCIAL_PLATFORMS = ["Facebook", "Twitter", "Instagram", "YouTube", "LinkedIn", "TikTok", "WhatsApp"];

const DEFAULTS: Record<string, unknown> = {
  description: "A curated digital sanctuary of Islamic scholarship for the UK community.",
  copyright: "© 2026 MadrasahMatters. All rights reserved.",
  tagline: "Made with reverence for knowledge.",
  library_links: [
    { label: "Browse Books", href: "/browse" },
    { label: "New Arrivals", href: "/new" },
    { label: "Categories", href: "/categories" },
  ],
  community_links: [
    { label: "Local Events", href: "/events" },
    { label: "Wholesale", href: "/wholesale" },
    { label: "Newsletter", href: "/newsletter" },
  ],
  support_links: [
    { label: "Contact Us", href: "/contact" },
    { label: "FAQs", href: "/faq" },
    { label: "Privacy Policy", href: "/privacy" },
  ],
  social_links: [] as Array<{ platform: string; url: string }>,
  contact_email: "",
  contact_phone: "",
  contact_address: "",
};

const FooterEditorTab = () => {
  const { data: settings, isLoading } = useSiteSettings("footer");
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
  const set = useCallback((key: string, value: unknown) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  }, []);

  const saveAll = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(local)) {
        await updateSetting.mutateAsync({ section: "footer", key, value });
      }
      toast.success("Footer settings saved!");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
    setSaving(false);
  };

  const resetAll = () => {
    setLocal({ ...DEFAULTS });
    toast.info("Reset to defaults — save to apply");
  };

  // Link column editor
  const LinkColumnEditor = ({ title, settingsKey, icon: Icon }: { title: string; settingsKey: string; icon: LucideIcon }) => {
    const links = (get(settingsKey) as FooterLink[]) || [];
    const [open, setOpen] = useState(true);

    const updateLinks = (newLinks: FooterLink[]) => set(settingsKey, newLinks);

    const moveLink = (idx: number, dir: -1 | 1) => {
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= links.length) return;
      const copy = [...links];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      updateLinks(copy);
    };

    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-semibold">{title}</span>
              <span className="text-[11px] text-muted-foreground">({links.length})</span>
            </div>
            {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 pb-2 px-1 space-y-2">
          {links.map((link, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input
                value={link.label}
                onChange={(e) => {
                  const updated = [...links];
                  updated[i] = { ...updated[i], label: e.target.value };
                  updateLinks(updated);
                }}
                className="h-7 text-xs flex-1"
                placeholder="Label"
              />
              <Input
                value={link.href}
                onChange={(e) => {
                  const updated = [...links];
                  updated[i] = { ...updated[i], href: e.target.value };
                  updateLinks(updated);
                }}
                className="h-7 text-xs w-28 font-mono"
                placeholder="/path"
              />
              <button type="button" onClick={() => moveLink(i, -1)} className="w-6 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted shrink-0">
                <ChevronUp className="h-3 w-3" />
              </button>
              <button type="button" onClick={() => moveLink(i, 1)} className="w-6 h-7 rounded flex items-center justify-center text-muted-foreground hover:bg-muted shrink-0">
                <ChevronDown className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => updateLinks(links.filter((_, idx) => idx !== i))}
                className="w-7 h-7 rounded-md hover:bg-destructive/10 text-destructive flex items-center justify-center shrink-0"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs w-full"
            onClick={() => updateLinks([...links, { label: "New Link", href: "/" }])}
          >
            <Plus className="h-3 w-3" /> Add Link
          </Button>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  if (isLoading) return <p className="text-sm text-muted-foreground p-4">Loading…</p>;

  const socialLinks = (get("social_links") as Array<{ platform: string; url: string }>) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" /> Footer Editor
        </CardTitle>
        <p className="text-sm text-muted-foreground">Manage footer columns, links, social icons, and contact info.</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Text Fields */}
        <Collapsible defaultOpen>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold">Text & Branding</span>
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 pb-2 px-1 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description</Label>
              <Textarea
                value={get("description") as string}
                onChange={(e) => set("description", e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Copyright</Label>
                <Input value={get("copyright") as string} onChange={(e) => set("copyright", e.target.value)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tagline</Label>
                <Input value={get("tagline") as string} onChange={(e) => set("tagline", e.target.value)} className="h-8 text-xs" />
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Link Columns */}
        <LinkColumnEditor title="Library Links" settingsKey="library_links" icon={Link2} />
        <LinkColumnEditor title="Community Links" settingsKey="community_links" icon={Link2} />
        <LinkColumnEditor title="Support Links" settingsKey="support_links" icon={Link2} />

        {/* Social Links */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                  <Globe className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold">Social Links</span>
                <span className="text-[11px] text-muted-foreground">({socialLinks.length})</span>
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 pb-2 px-1 space-y-2">
            {socialLinks.map((social, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <select
                  value={social.platform}
                  onChange={(e) => {
                    const updated = [...socialLinks];
                    updated[i] = { ...updated[i], platform: e.target.value };
                    set("social_links", updated);
                  }}
                  className="h-7 text-xs border border-input rounded-md bg-background px-2 w-28"
                >
                  {SOCIAL_PLATFORMS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <Input
                  value={social.url}
                  onChange={(e) => {
                    const updated = [...socialLinks];
                    updated[i] = { ...updated[i], url: e.target.value };
                    set("social_links", updated);
                  }}
                  className="h-7 text-xs flex-1 font-mono"
                  placeholder="https://..."
                />
                <button
                  type="button"
                  onClick={() => set("social_links", socialLinks.filter((_, idx) => idx !== i))}
                  className="w-7 h-7 rounded-md hover:bg-destructive/10 text-destructive flex items-center justify-center shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs w-full"
              onClick={() => set("social_links", [...socialLinks, { platform: "Facebook", url: "" }])}
            >
              <Plus className="h-3 w-3" /> Add Social Link
            </Button>
          </CollapsibleContent>
        </Collapsible>

        {/* Contact Info */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold">Contact Info</span>
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 pb-2 px-1 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Email</Label>
              <Input value={get("contact_email") as string} onChange={(e) => set("contact_email", e.target.value)} className="h-8 text-xs" placeholder="info@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Phone</Label>
              <Input value={get("contact_phone") as string} onChange={(e) => set("contact_phone", e.target.value)} className="h-8 text-xs" placeholder="+44 ..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Address</Label>
              <Textarea value={get("contact_address") as string} onChange={(e) => set("contact_address", e.target.value)} rows={2} className="text-xs" placeholder="Street, City, Postcode" />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-border">
          <Button onClick={saveAll} disabled={saving} className="gap-1.5">
            <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save Footer"}
          </Button>
          <Button variant="outline" onClick={resetAll} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FooterEditorTab;
