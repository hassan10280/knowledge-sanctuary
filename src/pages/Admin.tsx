import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings, useUpdateSetting } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Save, Plus, Trash2, Settings, BookOpen, Layout, Globe, Menu, Users, Shield, ShieldOff, Paintbrush, Type, Palette, ChevronDown, ChevronUp, RotateCcw, Minus, MessageCircle, Star, Building2, Percent, FileText, Layers, Truck, Bell, Package, Cog, PenLine, BarChart3, ShoppingCart, X, Home } from "lucide-react";
import HeaderSettingsTab from "@/components/admin/HeaderSettingsTab";
import HeroSettingsTab from "@/components/admin/HeroSettingsTab";
import WhatsAppSettingsTab from "@/components/admin/WhatsAppSettingsTab";
import { Button } from "@/components/ui/button";
import FormBuilderTab from "@/components/admin/FormBuilderTab";
import WholesaleRequestsTab from "@/components/admin/WholesaleRequestsTab";
import DiscountsTab from "@/components/admin/DiscountsTab";
import PublishersTab from "@/components/admin/PublishersTab";
import ShippingSettingsTab from "@/components/admin/ShippingSettingsTab";
import AdminNotificationsTab from "@/components/admin/AdminNotificationsTab";
import AdminOrdersTab from "@/components/admin/AdminOrdersTab";
import AdminSettingsTab from "@/components/admin/AdminSettingsTab";
import LayoutSettingsTab from "@/components/admin/LayoutSettingsTab";
import FooterEditorTab from "@/components/admin/FooterEditorTab";
import DesignSystemTab from "@/components/admin/DesignSystemTab";
import ContentEditorTab from "@/components/admin/ContentEditorTab";
import AnalyticsDashboardTab from "@/components/admin/AnalyticsDashboardTab";
import AbandonedCartsTab from "@/components/admin/AbandonedCartsTab";
import BooksManagementTab from "@/components/admin/BooksManagementTab";
import CategoriesManagementTab from "@/components/admin/CategoriesManagementTab";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { useIsMobile } from "@/hooks/use-mobile";
import { getErrorMessage, isBlank, isValidNumber } from "@/lib/admin-submit";

const FONT_FAMILIES = [
  "Instrument Serif", "Georgia", "Geist", "system-ui", "Inter", "Roboto", "Open Sans",
  "Lora", "Playfair Display", "Merriweather", "Poppins", "Montserrat", "Raleway",
];
const FONT_WEIGHTS = ["300", "400", "500", "600", "700", "800", "900"];
const FONT_SIZES = ["10", "11", "12", "13", "14", "15", "16", "18", "20", "22", "24", "28", "32", "36", "40", "48", "56", "64"];
const LAYOUT_OPTIONS = ["default", "grid", "flex", "centered", "wide", "compact"];

/* ─── Sidebar menu config ─── */
interface SidebarItem {
  id: string;
  label: string;
  icon: React.ElementType;
  group: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "header", label: "Header", icon: Layout, group: "Content" },
  { id: "hero", label: "Hero", icon: Globe, group: "Content" },
  { id: "books", label: "Books", icon: BookOpen, group: "Content" },
  { id: "categories", label: "Categories", icon: BookOpen, group: "Content" },
  { id: "publishers", label: "Publishers", icon: Building2, group: "Content" },
  { id: "footer", label: "Footer", icon: Layout, group: "Content" },
  { id: "content", label: "Content Editor", icon: PenLine, group: "Content" },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, group: "Content" },

  { id: "layout", label: "Layout", icon: Layers, group: "Design" },
  { id: "design", label: "Design System", icon: Paintbrush, group: "Design" },

  { id: "orders", label: "Orders", icon: Package, group: "Business" },
  { id: "discounts", label: "Discounts", icon: Percent, group: "Business" },
  { id: "shipping", label: "Shipping", icon: Truck, group: "Business" },
  { id: "wholesale-requests", label: "Wholesale", icon: Building2, group: "Business" },
  { id: "form-builder", label: "Form Builder", icon: FileText, group: "Business" },

  { id: "analytics", label: "Analytics", icon: BarChart3, group: "Insights" },
  { id: "abandoned-carts", label: "Abandoned Carts", icon: ShoppingCart, group: "Insights" },
  { id: "notifications", label: "Notifications", icon: Bell, group: "Insights" },

  { id: "users", label: "Account", icon: Users, group: "System" },
  { id: "settings", label: "Settings", icon: Cog, group: "System" },
];

const GROUPS = ["Content", "Design", "Business", "Insights", "System"];

const Admin = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { data: settings, isLoading: settingsLoading } = useSiteSettings();
  const updateSetting = useUpdateSetting();


  const [activeSection, setActiveSection] = useState("header");
  const [localSettings, setLocalSettings] = useState<Record<string, Record<string, any>>>({});
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [openPanels, setOpenPanels] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate("/admin/login");
    }
  }, [loading, user, isAdmin, navigate]);

  useEffect(() => {
    if (settings) {
      const grouped: Record<string, Record<string, any>> = {};
      settings.forEach((s) => {
        if (!grouped[s.section]) grouped[s.section] = {};
        grouped[s.section][s.key] = s.value;
      });
      setLocalSettings(grouped);
    }
  }, [settings]);

  const getSetting = useCallback((section: string, key: string) => localSettings[section]?.[key] ?? "", [localSettings]);
  const getSettingNum = useCallback((section: string, key: string, fallback = 0) => {
    const v = localSettings[section]?.[key];
    return typeof v === "number" ? v : fallback;
  }, [localSettings]);

  const setSetting = useCallback((section: string, key: string, value: any) => {
    setLocalSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  }, []);

  const saveAllSection = async (section: string) => {
    const sectionData = localSettings[section];
    if (!sectionData) return;
    try {
      for (const [key, value] of Object.entries(sectionData)) {
        await updateSetting.mutateAsync({ section, key, value });
      }
      toast.success(`${section} section saved!`);
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
    await updateSetting.mutateAsync({ section: "header", key: "logo_url", value: urlData.publicUrl });
    toast.success("Logo uploaded!");
  };



  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  /* ─── PxControl ─── */
  const PxControl = ({ value, onChange, label, min = 0, max = 200 }: { value: number; onChange: (v: number) => void; label: string; min?: number; max?: number }) => (
    <div className="space-y-1">
      <span className="text-[10px] text-muted-foreground capitalize">{label}</span>
      <div className="flex items-center gap-1">
        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(Math.max(min, value - 1)); }} className="w-7 h-7 rounded-md bg-muted hover:bg-muted-foreground/20 flex items-center justify-center text-foreground transition-colors shrink-0">
          <Minus className="h-3 w-3" />
        </button>
        <Input type="number" value={value} onChange={(e) => onChange(Math.min(max, Math.max(min, parseInt(e.target.value) || 0)))} className="h-7 text-xs text-center font-mono px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(Math.min(max, value + 1)); }} className="w-7 h-7 rounded-md bg-muted hover:bg-muted-foreground/20 flex items-center justify-center text-foreground transition-colors shrink-0">
          <Plus className="h-3 w-3" />
        </button>
        <span className="text-[10px] text-muted-foreground ml-0.5">px</span>
      </div>
    </div>
  );

  const SpacingControl = ({ section, keyName, label }: { section: string; keyName: string; label: string }) => {
    const sides = ["top", "right", "bottom", "left"] as const;
    return (
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</Label>
        <div className="grid grid-cols-2 gap-2">
          {sides.map((side) => (
            <PxControl key={side} label={side} value={getSettingNum(section, `${keyName}_${side}`, 0)} onChange={(val) => setSetting(section, `${keyName}_${side}`, val)} />
          ))}
        </div>
      </div>
    );
  };

  const ColorControl = ({ section, keyName, label }: { section: string; keyName: string; label: string }) => {
    const v = (getSetting(section, keyName) as string) || "#000000";
    return (
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-foreground">{label}</Label>
        <div className="flex items-center gap-2">
          <input type="color" value={v} onChange={(e) => setSetting(section, keyName, e.target.value)} className="w-9 h-9 rounded-lg border border-border cursor-pointer" />
          <Input value={v} onChange={(e) => setSetting(section, keyName, e.target.value)} placeholder="#000000" className="flex-1 h-9 text-xs font-mono" />
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => setSetting(section, keyName, "")}><RotateCcw className="h-3 w-3" /></Button>
        </div>
      </div>
    );
  };

  const TypographyControls = ({ section }: { section: string }) => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-foreground">Font Family</Label>
        <Select value={(getSetting(section, "font_family") as string) || ""} onValueChange={(v) => setSetting(section, "font_family", v)}>
          <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select font..." /></SelectTrigger>
          <SelectContent>{FONT_FAMILIES.map((f) => <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground">Font Size</Label>
          <Select value={(getSetting(section, "font_size") as string) || ""} onValueChange={(v) => setSetting(section, "font_size", v)}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Size..." /></SelectTrigger>
            <SelectContent>{FONT_SIZES.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}px</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground">Font Weight</Label>
          <Select value={(getSetting(section, "font_weight") as string) || ""} onValueChange={(v) => setSetting(section, "font_weight", v)}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Weight..." /></SelectTrigger>
            <SelectContent>{FONT_WEIGHTS.map((w) => <SelectItem key={w} value={w} className="text-xs">{w}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <PxControl label="Line Height %" value={getSettingNum(section, "line_height", 150)} onChange={(v) => setSetting(section, "line_height", v)} min={100} max={300} />
    </div>
  );

  const ButtonStyleControls = ({ section }: { section: string }) => (
    <div className="space-y-3">
      <ColorControl section={section} keyName="button_bg" label="Button Background" />
      <ColorControl section={section} keyName="button_text" label="Button Text Colour" />
      <PxControl label="Button Radius" value={getSettingNum(section, "button_radius", 8)} onChange={(v) => setSetting(section, "button_radius", v)} max={50} />
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-foreground">Layout</Label>
        <Select value={(getSetting(section, "layout") as string) || "default"} onValueChange={(v) => setSetting(section, "layout", v)}>
          <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{LAYOUT_OPTIONS.map((l) => <SelectItem key={l} value={l} className="text-xs capitalize">{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );

  const VisualDesignPanel = ({ section, label }: { section: string; label: string }) => {
    const isOpen = openPanels[section] ?? false;
    const toggleOpen = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setOpenPanels(prev => ({ ...prev, [section]: !prev[section] })); };
    return (
      <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
        <button type="button" onClick={toggleOpen} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center"><Paintbrush className="h-4 w-4 text-primary" /></div>
            <span className="text-sm font-semibold text-foreground">{label}</span>
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {isOpen && (
          <div className="px-5 pb-5 pt-2 space-y-5 border-t border-border" onClick={(e) => e.stopPropagation()}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-4 bg-muted/30 rounded-xl space-y-4 border border-border/50">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Layout className="h-3.5 w-3.5" /> Spacing</h4>
                <SpacingControl section={section} keyName="padding" label="Padding" />
                <SpacingControl section={section} keyName="margin" label="Margin" />
                <PxControl label="Gap" value={getSettingNum(section, "gap", 16)} onChange={(v) => setSetting(section, "gap", v)} max={100} />
              </div>
              <div className="p-4 bg-muted/30 rounded-xl space-y-4 border border-border/50">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Palette className="h-3.5 w-3.5" /> Colours</h4>
                <ColorControl section={section} keyName="bg_color" label="Background" />
                <ColorControl section={section} keyName="text_color" label="Text" />
                <ColorControl section={section} keyName="accent_color" label="Accent" />
              </div>
              <div className="p-4 bg-muted/30 rounded-xl space-y-4 border border-border/50">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Type className="h-3.5 w-3.5" /> Typography</h4>
                <TypographyControls section={section} />
              </div>
              <div className="p-4 bg-muted/30 rounded-xl space-y-4 border border-border/50">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Settings className="h-3.5 w-3.5" /> Button & Layout</h4>
                <ButtonStyleControls section={section} />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <div className="h-8 px-4 rounded-lg flex items-center text-xs font-semibold" style={{ backgroundColor: (getSetting(section, "button_bg") as string) || "hsl(207 58% 45%)", color: (getSetting(section, "button_text") as string) || "#fff", borderRadius: `${getSettingNum(section, "button_radius", 8)}px`, fontFamily: (getSetting(section, "font_family") as string) || "inherit" }}>
                  Button Preview
                </div>
              </div>
              <Button onClick={() => saveAllSection(section)} size="sm" className="gap-1.5"><Save className="h-3.5 w-3.5" /> Save</Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* HeaderSettings, HeroSettings, WhatsAppSettings extracted to separate components */

  const handleNavClick = (id: string) => {
    setActiveSection(id);
    if (isMobile) setSidebarOpen(false);
  };

  const renderContent = () => {
    switch (activeSection) {
      case "header": return <HeaderSettingsTab />;
      case "hero": return <HeroSettingsTab />;
      case "books": return <BooksManagementTab />;
      case "categories": return <CategoriesManagementTab />;
      case "publishers": return <PublishersTab />;
      case "design": return (
        <div className="space-y-6">
          <DesignSystemTab />
          <Card>
            <CardHeader>
              <CardTitle className="font-serif flex items-center gap-2"><Paintbrush className="h-5 w-5 text-primary" /> Section Design Controls</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Per-section colour, spacing, and typography overrides.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {["design_header", "design_hero", "design_books", "design_book_card", "design_book_modal", "design_cart", "design_checkout", "design_footer", "design_auth", "design_logo", "design_buttons_global"].map((s) => (
                <VisualDesignPanel key={s} section={s} label={s.replace("design_", "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} />
              ))}
            </CardContent>
          </Card>
        </div>
      );
      case "whatsapp": return <WhatsAppSettingsTab />;
      case "footer": return <FooterEditorTab />;
      case "users": return <UsersManagement />;
      case "wholesale-requests": return <WholesaleRequestsTab />;
      case "form-builder": return <FormBuilderTab />;
      case "discounts": return <DiscountsTab />;
      case "shipping": return <ShippingSettingsTab />;
      case "notifications": return <AdminNotificationsTab />;
      case "orders": return <AdminOrdersTab />;
      case "settings": return <AdminSettingsTab />;
      case "layout": return <LayoutSettingsTab />;
      case "content": return <ContentEditorTab />;
      case "analytics": return <AnalyticsDashboardTab />;
      case "abandoned-carts": return <AbandonedCartsTab />;
      default: return <div className="text-muted-foreground">Select a section</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 bg-[hsl(var(--sky-deep))] text-white shadow-lg shrink-0">
        <div className="px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-1.5 rounded-md hover:bg-white/10 transition-colors" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Settings className="h-5 w-5" />
            <h1 className="font-serif text-lg">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" onClick={() => navigate("/")} className="text-white hover:bg-white/10 gap-1.5 text-xs">
              <Home className="h-3.5 w-3.5" /> Site
            </Button>
            <span className="text-xs text-white/60 hidden sm:block">{user?.email}</span>
            <Button size="sm" variant="ghost" onClick={() => { signOut(); navigate("/"); }} className="text-white hover:bg-white/10">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarOpen && (
          <aside className={`${isMobile ? "fixed inset-y-14 left-0 z-40 w-64" : "w-60 shrink-0"} bg-card border-r border-border overflow-y-auto`}>
            <nav className="p-3 space-y-4">
              {GROUPS.map((group) => {
                const items = SIDEBAR_ITEMS.filter((i) => i.group === group);
                return (
                  <div key={group}>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1.5">{group}</p>
                    <div className="space-y-0.5">
                      {items.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeSection === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleNavClick(item.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? "bg-primary text-primary-foreground font-medium shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </aside>
        )}

        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/40" style={{ top: "56px" }} onClick={() => setSidebarOpen(false)} />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};





/* ─── Users / Role Management Component ─── */
const UsersManagement = () => {
  const [adminEmail, setAdminEmail] = useState("");
  const [admins, setAdmins] = useState<Array<{ id: string; user_id: string; email?: string }>>([]);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; email: string; created_at: string; last_sign_in_at: string | null; role: string; roles: any[] }>>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [adding, setAdding] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [searchUser, setSearchUser] = useState("");

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-admin", { body: { action: "list" } });
      if (error) throw error;
      setAdmins(data?.admins || []);
    } catch (e) { console.error("Failed to fetch admins", e); }
    setLoadingAdmins(false);
  };

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-admin", { body: { action: "list_all_users" } });
      if (error) throw error;
      setAllUsers(data?.users || []);
    } catch (e) { console.error("Failed to fetch users", e); }
    setLoadingUsers(false);
  };

  useEffect(() => { fetchAdmins(); fetchAllUsers(); }, []);

  const handleMakeAdmin = async () => {
    if (!adminEmail.trim()) return;
    setAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-admin", { body: { action: "add", email: adminEmail.trim() } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); }
      else { toast.success(`${adminEmail} is now an admin!`); setAdminEmail(""); fetchAdmins(); fetchAllUsers(); }
    } catch (e: any) { toast.error(e.message || "Failed to add admin"); }
    setAdding(false);
  };

  const handleRemoveAdmin = async (roleId: string, userId: string) => {
    if (!confirm("Are you sure you want to remove this admin?")) return;
    try {
      const { data, error } = await supabase.functions.invoke("manage-admin", { body: { action: "remove", role_id: roleId, user_id: userId } });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); }
      else { toast.success("Admin removed!"); fetchAdmins(); fetchAllUsers(); }
    } catch (e: any) { toast.error(e.message || "Failed to remove admin"); }
  };

  const roleColors: Record<string, string> = {
    admin: "bg-primary/10 text-primary border-primary/20",
    wholesale: "bg-emerald-50 text-emerald-700 border-emerald-200",
    retail: "bg-muted text-muted-foreground border-border/50",
  };

  const filteredUsers = allUsers.filter(u => {
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesSearch = !searchUser || u.email.toLowerCase().includes(searchUser.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const roleCounts = {
    all: allUsers.length,
    admin: allUsers.filter(u => u.role === "admin").length,
    wholesale: allUsers.filter(u => u.role === "wholesale").length,
    retail: allUsers.filter(u => u.role === "retail").length,
  };

  return (
    <Card>
      <CardHeader><CardTitle className="font-serif">User Role Management</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Make someone Admin</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="Enter user email..." value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className="flex-1" type="email" />
            <Button onClick={handleMakeAdmin} disabled={adding || !adminEmail.trim()} className="gap-1.5 shrink-0"><Shield className="h-4 w-4" />{adding ? "Adding..." : "Make Admin"}</Button>
          </div>
          <p className="text-xs text-muted-foreground">The user must have an account before you can make them admin.</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Current Admins</h3>
          {loadingAdmins ? <p className="text-sm text-muted-foreground">Loading...</p> : admins.length === 0 ? <p className="text-sm text-muted-foreground">No admins found</p> : (
            <div className="space-y-2">
              {admins.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /><span className="text-sm font-mono">{admin.email || admin.user_id}</span></div>
                  <Button size="sm" variant="ghost" className="text-destructive gap-1" onClick={() => handleRemoveAdmin(admin.id, admin.user_id)}><ShieldOff className="h-3.5 w-3.5" /> Remove</Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-3 pt-4 border-t border-border">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-foreground">All Registered Users ({allUsers.length})</h3>
            <div className="flex gap-1.5 flex-wrap">
              {(["all", "admin", "wholesale", "retail"] as const).map(r => (
                <button key={r} onClick={() => setRoleFilter(r)} className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border transition-colors ${roleFilter === r ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted"}`}>
                  {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)} ({roleCounts[r]})
                </button>
              ))}
            </div>
          </div>
          <Input placeholder="Search by email..." value={searchUser} onChange={e => setSearchUser(e.target.value)} className="h-9 bg-muted/30 border-border/50" />
          {loadingUsers ? <p className="text-sm text-muted-foreground text-center py-6">Loading users...</p> : filteredUsers.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">No users found.</p> : (
            <div className="space-y-1.5 max-h-[400px] overflow-auto">
              {filteredUsers.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-card border border-border/30 rounded-lg hover:border-border/60 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{u.email}</p>
                    <p className="text-[11px] text-muted-foreground">Joined {new Date(u.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}{u.last_sign_in_at && ` • Last login ${new Date(u.last_sign_in_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`}</p>
                  </div>
                  <span className={`ml-3 px-2.5 py-1 text-[11px] font-semibold rounded-full border shrink-0 ${roleColors[u.role] || roleColors.retail}`}>{u.role.charAt(0).toUpperCase() + u.role.slice(1)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default Admin;
