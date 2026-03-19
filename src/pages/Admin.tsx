import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings, useUpdateSetting } from "@/hooks/useSiteSettings";
import { useBooks, useCategories, useUpsertBook, useDeleteBook, useUpsertCategory, useDeleteCategory } from "@/hooks/useBooks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Save, Plus, Trash2, Settings, BookOpen, Layout, Globe, Image, Menu } from "lucide-react";
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

  const getSetting = (section: string, key: string) => {
    return localSettings[section]?.[key] ?? "";
  };

  const setSetting = (section: string, key: string, value: any) => {
    setLocalSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));
  };

  const saveSetting = async (section: string, key: string) => {
    try {
      await updateSetting.mutateAsync({
        section,
        key,
        value: localSettings[section]?.[key],
      });
      toast.success("Saved!");
    } catch (e: any) {
      toast.error(e.message);
    }
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
    if (error) {
      toast.error("Upload failed: " + error.message);
      return;
    }
    const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
    await updateSetting.mutateAsync({ section: "header", key: "logo_url", value: urlData.publicUrl });
    toast.success("Logo uploaded!");
  };

  const handleSaveBook = async () => {
    if (!editingBook) return;
    try {
      await upsertBook.mutateAsync(editingBook);
      toast.success("Book saved!");
      setEditingBook(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSaveCategory = async () => {
    if (!editingCategory) return;
    try {
      await upsertCategory.mutateAsync(editingCategory);
      toast.success("Category saved!");
      setEditingCategory(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading || settingsLoading) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  const SettingField = ({ section, keyName, label, multiline = false }: { section: string; keyName: string; label: string; multiline?: boolean }) => {
    const val = getSetting(section, keyName);
    const displayVal = typeof val === "string" ? val : JSON.stringify(val, null, 2);
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {multiline ? (
          <Textarea
            value={displayVal}
            onChange={(e) => {
              try {
                setSetting(section, keyName, JSON.parse(e.target.value));
              } catch {
                setSetting(section, keyName, e.target.value);
              }
            }}
            rows={4}
          />
        ) : (
          <Input
            value={displayVal}
            onChange={(e) => {
              try {
                setSetting(section, keyName, JSON.parse(e.target.value));
              } catch {
                setSetting(section, keyName, e.target.value);
              }
            }}
          />
        )}
      </div>
    );
  };

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
            <TabsTrigger value="footer" className="text-xs sm:text-sm gap-1.5">
              <Layout className="h-3.5 w-3.5" /> Footer
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
                  onClick={() => setEditingBook({ title: "", author: "", category: categories?.[0]?.name || "", price: 0, cover_color: "#1a5276", rating: 4.5, sort_order: 0 })}
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
                          <option key={c.id} value={c.name}>{c.name} ({c.name_bn})</option>
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
                      <Input placeholder="Name (Bangla)" value={editingCategory.name_bn || ""} onChange={(e) => setEditingCategory({ ...editingCategory, name_bn: e.target.value })} />
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
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
