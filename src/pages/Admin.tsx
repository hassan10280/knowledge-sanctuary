import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings, useUpdateSetting } from "@/hooks/useSiteSettings";
import { useBooks, useCategories, useUpsertBook, useDeleteBook, useUpsertCategory, useDeleteCategory } from "@/hooks/useBooks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Save, Plus, Trash2, Settings, BookOpen, Layout, Globe, Menu, Users, Shield, ShieldOff, Paintbrush, Type, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Admin = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: settings, isLoading: settingsLoading } = useSiteSettings();
  const { data: books } = useBooks();
  const { data: categories } = useCategories();
  const updateSetting = useUpdateSetting();
  const upsertBook = useUpsertBook();
  const deleteBook = useDeleteBook();
  const upsertCategory = useUpsertCategory();
  const deleteCategory = useDeleteCategory();

  const [localSettings, setLocalSettings] = useState<Record<string, Record<string, any>>>({});
  const [editingBook, setEditingBook] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const getSetting = (section: string, key: string) => localSettings[section]?.[key] ?? "";

  const setSetting = (section: string, key: string, value: any) => {
    setLocalSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

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

  const handleSampleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingBook) return;
    const path = `samples/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("site-assets").upload(path, file);
    if (error) { toast.error("Upload failed: " + error.message); return; }
    const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
    setEditingBook({ ...editingBook, sample_url: urlData.publicUrl });
    toast.success("Sample uploaded!");
  };

  const handleSaveBook = async () => {
    if (!editingBook) return;
    try {
      await upsertBook.mutateAsync(editingBook);
      toast.success("Book saved!");
      setEditingBook(null);
    } catch (e: any) { toast.error(e.message); }
  };

  const handleSaveCategory = async () => {
    if (!editingCategory) return;
    try {
      await upsertCategory.mutateAsync(editingCategory);
      toast.success("Category saved!");
      setEditingCategory(null);
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  const SettingField = ({ section, keyName, label, multiline = false, type = "text" }: { section: string; keyName: string; label: string; multiline?: boolean; type?: string }) => {
    const val = getSetting(section, keyName);
    const displayVal = typeof val === "string" ? val : JSON.stringify(val, null, 2);
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {multiline ? (
          <Textarea
            value={displayVal}
            onChange={(e) => {
              try { setSetting(section, keyName, JSON.parse(e.target.value)); }
              catch { setSetting(section, keyName, e.target.value); }
            }}
            rows={4}
          />
        ) : type === "color" ? (
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={displayVal || "#000000"}
              onChange={(e) => setSetting(section, keyName, e.target.value)}
              className="w-12 h-10 p-1 cursor-pointer"
            />
            <Input
              value={displayVal}
              onChange={(e) => setSetting(section, keyName, e.target.value)}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        ) : (
          <Input
            type={type}
            value={displayVal}
            onChange={(e) => {
              try { setSetting(section, keyName, JSON.parse(e.target.value)); }
              catch { setSetting(section, keyName, e.target.value); }
            }}
          />
        )}
      </div>
    );
  };

  /* Design controls sub-component */
  const DesignControls = ({ section, label }: { section: string; label: string }) => (
    <details className="border border-border rounded-lg overflow-hidden">
      <summary className="flex items-center gap-2 px-4 py-3 bg-muted/50 cursor-pointer hover:bg-muted transition-colors">
        <Paintbrush className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{label} — Design Controls</span>
      </summary>
      <div className="p-4 space-y-4 bg-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Spacing */}
          <div className="space-y-3 p-3 border border-border rounded-lg">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layout className="h-3 w-3" /> Spacing
            </h4>
            <SettingField section={section} keyName="margin" label="Margin (e.g. 0 auto)" />
            <SettingField section={section} keyName="padding" label="Padding (e.g. 20px 16px)" />
            <SettingField section={section} keyName="gap" label="Gap / Spacing" />
          </div>
          {/* Colors */}
          <div className="space-y-3 p-3 border border-border rounded-lg">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="h-3 w-3" /> Colors
            </h4>
            <SettingField section={section} keyName="bg_color" label="Background Color" type="color" />
            <SettingField section={section} keyName="text_color" label="Text Color" type="color" />
            <SettingField section={section} keyName="accent_color" label="Accent / Button Color" type="color" />
          </div>
          {/* Typography */}
          <div className="space-y-3 p-3 border border-border rounded-lg">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Type className="h-3 w-3" /> Typography
            </h4>
            <SettingField section={section} keyName="font_family" label="Font Family" />
            <SettingField section={section} keyName="font_size" label="Font Size (e.g. 16px)" />
            <SettingField section={section} keyName="font_weight" label="Font Weight (e.g. 400, 600, bold)" />
            <SettingField section={section} keyName="line_height" label="Line Height (e.g. 1.5)" />
          </div>
          {/* Button & Layout */}
          <div className="space-y-3 p-3 border border-border rounded-lg">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Settings className="h-3 w-3" /> Button & Layout
            </h4>
            <SettingField section={section} keyName="button_bg" label="Button Background" type="color" />
            <SettingField section={section} keyName="button_text" label="Button Text Color" type="color" />
            <SettingField section={section} keyName="button_radius" label="Button Radius (e.g. 8px)" />
            <SettingField section={section} keyName="layout" label="Layout (e.g. grid, flex, centered)" />
          </div>
        </div>
        <Button onClick={() => saveAllSection(section)} size="sm" className="gap-2">
          <Save className="h-3.5 w-3.5" /> Save {label} Design
        </Button>
      </div>
    </details>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="sticky top-0 z-50 bg-[hsl(var(--sky-deep))] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-1" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <Menu className="h-5 w-5" />
            </button>
            <Settings className="h-5 w-5" />
            <h1 className="font-serif text-lg">Admin Panel</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/60 hidden sm:block">{user?.email}</span>
            <Button size="sm" variant="ghost" onClick={() => { signOut(); navigate("/"); }} className="text-white hover:bg-white/10">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="header" className="space-y-6">
          <TabsList className="flex flex-wrap gap-1 bg-muted p-1 h-auto">
            <TabsTrigger value="header" className="text-xs sm:text-sm gap-1.5">
              <Layout className="h-3.5 w-3.5" /> Header
            </TabsTrigger>
            <TabsTrigger value="hero" className="text-xs sm:text-sm gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Hero
            </TabsTrigger>
            <TabsTrigger value="books" className="text-xs sm:text-sm gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Books
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-xs sm:text-sm gap-1.5">
              <BookOpen className="h-3.5 w-3.5" /> Categories
            </TabsTrigger>
            <TabsTrigger value="design" className="text-xs sm:text-sm gap-1.5">
              <Paintbrush className="h-3.5 w-3.5" /> Design
            </TabsTrigger>
            <TabsTrigger value="footer" className="text-xs sm:text-sm gap-1.5">
              <Layout className="h-3.5 w-3.5" /> Footer
            </TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm gap-1.5">
              <Users className="h-3.5 w-3.5" /> Users
            </TabsTrigger>
          </TabsList>

          {/* HEADER TAB */}
          <TabsContent value="header">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Header & Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-2">Upload Logo</label>
                  <div className="flex items-center gap-4">
                    <Input type="file" accept="image/*" onChange={handleLogoUpload} className="max-w-xs" />
                    {getSetting("header", "logo_url") && (
                      <img src={getSetting("header", "logo_url") as string} alt="Logo" className="h-12 rounded" />
                    )}
                  </div>
                </div>
                <SettingField section="header" keyName="logo_size" label="Logo Size (CSS classes)" />
                <SettingField section="header" keyName="nav_links" label="Navigation Links (JSON)" multiline />
                <Button onClick={() => saveAllSection("header")} className="gap-2">
                  <Save className="h-4 w-4" /> Save Header
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* HERO TAB */}
          <TabsContent value="hero">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Hero Section</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <SettingField section="hero" keyName="badge_text" label="Badge Text" />
                <SettingField section="hero" keyName="title" label="Title" />
                <SettingField section="hero" keyName="title_accent" label="Title Accent (italic part)" />
                <SettingField section="hero" keyName="description" label="Description" multiline />
                <SettingField section="hero" keyName="search_placeholder" label="Search Placeholder" />
                <SettingField section="hero" keyName="categories" label="Category Tags (JSON array)" multiline />
                <Button onClick={() => saveAllSection("hero")} className="gap-2">
                  <Save className="h-4 w-4" /> Save Hero
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BOOKS TAB */}
          <TabsContent value="books">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-serif">Books Management</CardTitle>
                <Button
                  size="sm"
                  onClick={() => setEditingBook({ title: "", author: "", category: categories?.[0]?.name || "", price: 0, cover_color: "#1a5276", rating: 4.5, sort_order: 0, sample_url: "" })}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Add Book
                </Button>
              </CardHeader>
              <CardContent>
                {editingBook && (
                  <div className="mb-6 p-4 bg-muted rounded-lg space-y-3">
                    <h3 className="font-semibold text-sm">{editingBook.id ? "Edit Book" : "New Book"}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input placeholder="Title" value={editingBook.title} onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })} />
                      <Input placeholder="Author" value={editingBook.author} onChange={(e) => setEditingBook({ ...editingBook, author: e.target.value })} />
                      <select
                        value={editingBook.category}
                        onChange={(e) => setEditingBook({ ...editingBook, category: e.target.value })}
                        className="px-3 py-2 border rounded-md text-sm bg-background"
                      >
                        {categories?.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      <Input type="number" step="0.01" placeholder="Price" value={editingBook.price || ""} onChange={(e) => setEditingBook({ ...editingBook, price: parseFloat(e.target.value) || null })} />
                      <Input type="number" step="0.01" placeholder="Original Price" value={editingBook.original_price || ""} onChange={(e) => setEditingBook({ ...editingBook, original_price: parseFloat(e.target.value) || null })} />
                      <Input type="number" placeholder="Discount %" value={editingBook.discount_percent || ""} onChange={(e) => setEditingBook({ ...editingBook, discount_percent: parseInt(e.target.value) || 0 })} />
                      <Input type="color" value={editingBook.cover_color || "#1a5276"} onChange={(e) => setEditingBook({ ...editingBook, cover_color: e.target.value })} />
                      <Input type="number" step="0.1" placeholder="Rating" value={editingBook.rating || ""} onChange={(e) => setEditingBook({ ...editingBook, rating: parseFloat(e.target.value) || null })} />
                      <Input type="number" placeholder="Sort Order" value={editingBook.sort_order || 0} onChange={(e) => setEditingBook({ ...editingBook, sort_order: parseInt(e.target.value) || 0 })} />
                    </div>
                    <Textarea placeholder="Description" value={editingBook.description || ""} onChange={(e) => setEditingBook({ ...editingBook, description: e.target.value })} />
                    
                    {/* Sample URL */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Sample Preview (PDF or Image)</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          placeholder="Sample URL (or upload below)"
                          value={editingBook.sample_url || ""}
                          onChange={(e) => setEditingBook({ ...editingBook, sample_url: e.target.value })}
                          className="flex-1"
                        />
                        <Input type="file" accept=".pdf,image/*" onChange={handleSampleUpload} className="max-w-xs" />
                      </div>
                      <p className="text-xs text-muted-foreground">Upload a PDF or image for the "Read a Sample" feature</p>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveBook} className="gap-1.5"><Save className="h-3.5 w-3.5" /> Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingBook(null)}>Cancel</Button>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {books?.map((book) => (
                    <div key={book.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-10 rounded" style={{ backgroundColor: book.cover_color || "#3b82f6" }} />
                        <div>
                          <p className="text-sm font-medium">{book.title}</p>
                          <p className="text-xs text-muted-foreground">{book.author} • {book.category} • £{book.price}</p>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => setEditingBook({ ...book })}>Edit</Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteBook.mutate(book.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CATEGORIES TAB */}
          <TabsContent value="categories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="font-serif">Categories</CardTitle>
                <Button size="sm" onClick={() => setEditingCategory({ name: "", name_bn: "", icon: "BookOpen", sort_order: 0 })} className="gap-1.5">
                  <Plus className="h-4 w-4" /> Add Category
                </Button>
              </CardHeader>
              <CardContent>
                {editingCategory && (
                  <div className="mb-6 p-4 bg-muted rounded-lg space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input placeholder="Name (English)" value={editingCategory.name} onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })} />
                      <Input placeholder="Name (Secondary)" value={editingCategory.name_bn || ""} onChange={(e) => setEditingCategory({ ...editingCategory, name_bn: e.target.value })} />
                      <Input placeholder="Icon" value={editingCategory.icon || ""} onChange={(e) => setEditingCategory({ ...editingCategory, icon: e.target.value })} />
                      <Input type="number" placeholder="Sort Order" value={editingCategory.sort_order || 0} onChange={(e) => setEditingCategory({ ...editingCategory, sort_order: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleSaveCategory} className="gap-1.5"><Save className="h-3.5 w-3.5" /> Save</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>Cancel</Button>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {categories?.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">{cat.name_bn}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => setEditingCategory({ ...cat })}>Edit</Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete?")) deleteCategory.mutate(cat.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DESIGN TAB */}
          <TabsContent value="design">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif flex items-center gap-2">
                  <Paintbrush className="h-5 w-5 text-primary" />
                  Section Design Controls
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Customise margin, padding, colours, typography, button styles and layout for each section.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <DesignControls section="design_header" label="Header" />
                <DesignControls section="design_hero" label="Hero Section" />
                <DesignControls section="design_books" label="Books Grid" />
                <DesignControls section="design_book_card" label="Book Card" />
                <DesignControls section="design_book_modal" label="Book Detail Modal" />
                <DesignControls section="design_cart" label="Cart Page" />
                <DesignControls section="design_checkout" label="Checkout Page" />
                <DesignControls section="design_footer" label="Footer" />
                <DesignControls section="design_auth" label="Auth / Login Page" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* FOOTER TAB */}
          <TabsContent value="footer">
            <Card>
              <CardHeader>
                <CardTitle className="font-serif">Footer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <SettingField section="footer" keyName="description" label="Description" multiline />
                <SettingField section="footer" keyName="copyright" label="Copyright Text" />
                <SettingField section="footer" keyName="tagline" label="Tagline" />
                <SettingField section="footer" keyName="library_links" label="Library Links (JSON)" multiline />
                <SettingField section="footer" keyName="community_links" label="Community Links (JSON)" multiline />
                <SettingField section="footer" keyName="support_links" label="Support Links (JSON)" multiline />
                <Button onClick={() => saveAllSection("footer")} className="gap-2">
                  <Save className="h-4 w-4" /> Save Footer
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* USERS TAB */}
          <TabsContent value="users">
            <UsersManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

/* ─── Users / Role Management Component ─── */
const UsersManagement = () => {
  const [adminEmail, setAdminEmail] = useState("");
  const [admins, setAdmins] = useState<Array<{ id: string; user_id: string; email?: string }>>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(true);
  const [adding, setAdding] = useState(false);

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-admin", {
        body: { action: "list" },
      });
      if (error) throw error;
      setAdmins(data?.admins || []);
    } catch (e) {
      console.error("Failed to fetch admins", e);
    }
    setLoadingAdmins(false);
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleMakeAdmin = async () => {
    if (!adminEmail.trim()) return;
    setAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-admin", {
        body: { action: "add", email: adminEmail.trim() },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); }
      else { toast.success(`${adminEmail} is now an admin!`); setAdminEmail(""); fetchAdmins(); }
    } catch (e: any) { toast.error(e.message || "Failed to add admin"); }
    setAdding(false);
  };

  const handleRemoveAdmin = async (roleId: string, userId: string) => {
    if (!confirm("Are you sure you want to remove this admin?")) return;
    try {
      const { data, error } = await supabase.functions.invoke("manage-admin", {
        body: { action: "remove", role_id: roleId, user_id: userId },
      });
      if (error) throw error;
      if (data?.error) { toast.error(data.error); }
      else { toast.success("Admin removed!"); fetchAdmins(); }
    } catch (e: any) { toast.error(e.message || "Failed to remove admin"); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif">User Role Management</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Make someone Admin</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="Enter user email..." value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className="flex-1" type="email" />
            <Button onClick={handleMakeAdmin} disabled={adding || !adminEmail.trim()} className="gap-1.5 shrink-0">
              <Shield className="h-4 w-4" />
              {adding ? "Adding..." : "Make Admin"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">The user must have an account (signed up) before you can make them admin.</p>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Current Admins</h3>
          {loadingAdmins ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : admins.length === 0 ? (
            <p className="text-sm text-muted-foreground">No admins found</p>
          ) : (
            <div className="space-y-2">
              {admins.map((admin) => (
                <div key={admin.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-sm font-mono">{admin.email || admin.user_id}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive gap-1" onClick={() => handleRemoveAdmin(admin.id, admin.user_id)}>
                    <ShieldOff className="h-3.5 w-3.5" />
                    Remove
                  </Button>
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
