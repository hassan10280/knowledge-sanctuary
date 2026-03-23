import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBooks, useCategories, useUpsertBook, useDeleteBook } from "@/hooks/useBooks";
import { usePublishers } from "@/hooks/usePublishers";
import { toast } from "sonner";
import {
  Save, Plus, Trash2, BookOpen, Star, Image, Upload, FileText, X, AlertCircle,
  CheckCircle2, Search, SlidersHorizontal, ArrowUpDown, Grid3X3, List, RotateCcw,
  Eye, Edit2, ChevronDown, Loader2, Filter,
} from "lucide-react";
import PreviewFileUploader from "./PreviewFileUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/admin-submit";

interface PreviewFile { url: string; name: string; type: "image" | "pdf"; }

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_PREVIEW_TYPES = [...ALLOWED_IMAGE_TYPES, "application/pdf"];

type SortOption = "newest" | "oldest" | "price_asc" | "price_desc" | "title_asc";
type ViewMode = "table" | "grid";

/* ─── Form Field ─── */
const FormField = ({ label, required, error, success, hint, children }: {
  label: string; required?: boolean; error?: string; success?: boolean; hint?: string; children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
      {label}
      {required && <span className="text-destructive">*</span>}
      {success && !error && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
    </Label>
    {children}
    {error && <p className="text-[11px] text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" /> {error}</p>}
    {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
  </div>
);

/* ─── ISBN Validation ─── */
function validateISBN(isbn: string): boolean {
  if (!isbn) return true;
  const clean = isbn.replace(/[-\s]/g, "");
  if (clean.length === 10) {
    let sum = 0;
    for (let i = 0; i < 9; i++) { if (!/\d/.test(clean[i])) return false; sum += parseInt(clean[i]) * (10 - i); }
    const last = clean[9].toUpperCase();
    sum += last === "X" ? 10 : parseInt(last);
    return !isNaN(sum) && sum % 11 === 0;
  }
  if (clean.length === 13) {
    if (!/^\d{13}$/.test(clean)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(clean[i]) * (i % 2 === 0 ? 1 : 3);
    return (10 - (sum % 10)) % 10 === parseInt(clean[12]);
  }
  return /^[a-zA-Z0-9\-]+$/.test(isbn) && isbn.length >= 3;
}

const BooksManagementTab = () => {
  const { data: books, isLoading } = useBooks();
  const { data: categories } = useCategories();
  const { data: publishers } = usePublishers();
  const upsertBook = useUpsertBook();
  const deleteBook = useDeleteBook();

  // Edit state
  const [editingBook, setEditingBook] = useState<any>(null);
  const [detailBook, setDetailBook] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);

  // Search, filter, sort
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState("__all__");
  const [filterStock, setFilterStock] = useState("__all__");
  const [filterDiscount, setFilterDiscount] = useState("__all__");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");

  // Bulk
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filterCategory !== "__all__") c++;
    if (filterStock !== "__all__") c++;
    if (filterDiscount !== "__all__") c++;
    if (priceMin) c++;
    if (priceMax) c++;
    return c;
  }, [filterCategory, filterStock, filterDiscount, priceMin, priceMax]);

  /* ─── Filtered + sorted books ─── */
  const filteredBooks = useMemo(() => {
    if (!books) return [];
    let result = [...books];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((b: any) =>
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q) ||
        b.isbn?.toLowerCase().includes(q)
      );
    }

    // Category
    if (filterCategory !== "__all__") {
      result = result.filter((b: any) => b.category === filterCategory);
    }

    // Stock
    if (filterStock === "in_stock") result = result.filter((b: any) => (b.stock_quantity ?? 0) > 0);
    else if (filterStock === "out_of_stock") result = result.filter((b: any) => (b.stock_quantity ?? 0) === 0);
    else if (filterStock === "low_stock") result = result.filter((b: any) => (b.stock_quantity ?? 0) > 0 && (b.stock_quantity ?? 0) < 5);

    // Discount
    if (filterDiscount === "discounted") result = result.filter((b: any) => b.discount_percent && b.discount_percent > 0);
    else if (filterDiscount === "no_discount") result = result.filter((b: any) => !b.discount_percent || b.discount_percent === 0);

    // Price range
    if (priceMin) result = result.filter((b: any) => (b.price ?? 0) >= parseFloat(priceMin));
    if (priceMax) result = result.filter((b: any) => (b.price ?? 0) <= parseFloat(priceMax));

    // Sort
    switch (sortBy) {
      case "price_asc": result.sort((a: any, b: any) => (a.price ?? 0) - (b.price ?? 0)); break;
      case "price_desc": result.sort((a: any, b: any) => (b.price ?? 0) - (a.price ?? 0)); break;
      case "oldest": result.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); break;
      case "title_asc": result.sort((a: any, b: any) => (a.title || "").localeCompare(b.title || "")); break;
      case "newest": default: result.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
    }

    return result;
  }, [books, search, sortBy, filterCategory, filterStock, filterDiscount, priceMin, priceMax]);

  const resetFilters = () => {
    setSearch(""); setFilterCategory("__all__"); setFilterStock("__all__");
    setFilterDiscount("__all__"); setPriceMin(""); setPriceMax("");
    setSortBy("newest");
  };

  /* ─── Selection ─── */
  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const selectAll = () => {
    if (selected.size === filteredBooks.length) setSelected(new Set());
    else setSelected(new Set(filteredBooks.map((b: any) => b.id)));
  };

  const handleBulkAction = async () => {
    if (!selected.size || !bulkAction) return;
    if (bulkAction === "delete") {
      if (!confirm(`Delete ${selected.size} book(s)?`)) return;
      for (const id of selected) {
        try { await deleteBook.mutateAsync(id); } catch (e) { toast.error(getErrorMessage(e)); }
      }
      toast.success(`${selected.size} book(s) deleted`);
    }
    setSelected(new Set());
    setBulkAction("");
  };

  /* ─── Duplicate check ─── */
  const checkISBNDuplicate = useCallback((isbn: string): string | null => {
    if (!isbn || !books) return null;
    const dup = books.find((b: any) => b.isbn && b.isbn.toLowerCase() === isbn.toLowerCase() && b.id !== editingBook?.id);
    return dup ? "This ISBN already exists" : null;
  }, [books, editingBook?.id]);

  const validateField = useCallback((field: string, value: any) => {
    const ne = { ...errors };
    switch (field) {
      case "isbn": {
        const v = String(value || "");
        if (v && !validateISBN(v)) ne.isbn = "Invalid ISBN format";
        else { const d = checkISBNDuplicate(v); if (d) ne.isbn = d; else delete ne.isbn; }
        break;
      }
      case "title": !value?.trim() ? ne.title = "Title is required" : delete ne.title; break;
      case "author": !value?.trim() ? ne.author = "Author is required" : delete ne.author; break;
      case "price": (value === null || value === undefined || value === "" || Number(value) < 0) ? ne.price = "Valid price required" : delete ne.price; break;
      default: break;
    }
    setErrors(ne);
  }, [errors, checkISBNDuplicate]);

  const updateField = (field: string, value: any) => {
    setEditingBook((prev: any) => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  /* ─── Uploads ─── */
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingBook) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { toast.error("Only JPG, PNG, WEBP allowed."); return; }
    if (file.size > MAX_FILE_SIZE) { toast.error("Max 10MB."); return; }
    setUploadingCover(true);
    try {
      const path = `covers/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("site-assets").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
      updateField("cover_image", urlData.publicUrl);
      toast.success("Cover uploaded!");
    } catch (err: any) { toast.error("Upload failed: " + (err.message || "Unknown")); }
    finally { setUploadingCover(false); e.target.value = ""; }
  };

  const handlePreviewUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !editingBook) return;
    const valid: File[] = [];
    for (const f of Array.from(files)) {
      if (!ALLOWED_PREVIEW_TYPES.includes(f.type)) { toast.error(`"${f.name}" skipped.`); continue; }
      if (f.size > MAX_FILE_SIZE) { toast.error(`"${f.name}" too large.`); continue; }
      valid.push(f);
    }
    if (!valid.length) return;
    setUploadingPreview(true);
    const cur: PreviewFile[] = editingBook.preview_files || [];
    const nf = [...cur];
    try {
      for (const f of valid) {
        const path = `previews/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage.from("site-assets").upload(path, f);
        if (error) { toast.error(`Failed: ${f.name}`); continue; }
        const { data: u } = supabase.storage.from("site-assets").getPublicUrl(path);
        nf.push({ url: u.publicUrl, name: f.name, type: f.type === "application/pdf" ? "pdf" : "image" });
      }
      updateField("preview_files", nf);
      toast.success(`${valid.length} file(s) uploaded!`);
    } catch (err: any) { toast.error("Upload failed"); }
    finally { setUploadingPreview(false); e.target.value = ""; }
  };

  const removePreviewFile = (i: number) => {
    const cur: PreviewFile[] = editingBook.preview_files || [];
    updateField("preview_files", cur.filter((_, idx) => idx !== i));
  };

  /* ─── Save ─── */
  const handleSave = async () => {
    if (!editingBook) return;
    if (uploadingCover || uploadingPreview) {
      toast.error("Please wait for file uploads to complete before saving.");
      return;
    }
    const ve: Record<string, string> = {};
    if (!editingBook.title?.trim()) ve.title = "Title is required";
    if (!editingBook.author?.trim()) ve.author = "Author is required";
    if (!editingBook.category?.trim()) ve.category = "Category is required";
    if (editingBook.price === null || editingBook.price === undefined || Number(editingBook.price) < 0) ve.price = "Valid price required";
    if (editingBook.isbn) {
      if (!validateISBN(editingBook.isbn)) ve.isbn = "Invalid ISBN format";
      const d = checkISBNDuplicate(editingBook.isbn);
      if (d) ve.isbn = d;
    }
    if (Object.keys(ve).length > 0) { setErrors(ve); toast.error(Object.values(ve)[0]); return; }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        title: editingBook.title,
        author: editingBook.author,
        category: editingBook.category,
        price: editingBook.price,
        original_price: editingBook.original_price ?? null,
        discount_percent: editingBook.discount_percent ?? 0,
        cover_color: editingBook.cover_color || "#1a5276",
        cover_pattern: editingBook.cover_pattern || "geometric",
        cover_image: editingBook.cover_image || null,
        rating: editingBook.rating ?? 4.5,
        sort_order: editingBook.sort_order ?? 0,
        sample_url: editingBook.sample_url || null,
        show_ratings: editingBook.show_ratings !== false,
        publisher: editingBook.publisher || "",
        isbn: editingBook.isbn || null,
        stock_quantity: editingBook.stock_quantity ?? 100,
        in_stock: editingBook.in_stock !== false,
        description: editingBook.description || null,
        preview_files: editingBook.preview_files && editingBook.preview_files.length > 0
          ? editingBook.preview_files
          : [],
      };
      if (editingBook.id) payload.id = editingBook.id;

      await upsertBook.mutateAsync(payload);
      toast.success("Book saved!");
      setEditingBook(null);
      setErrors({});
    } catch (e: unknown) { toast.error(getErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const startNew = () => {
    setErrors({});
    setEditingBook({
      title: "", author: "", category: categories?.[0]?.name || "",
      price: 0, original_price: null, discount_percent: 0,
      cover_color: "#1a5276", cover_image: "", rating: 4.5,
      sort_order: 0, sample_url: "", show_ratings: true,
      publisher: "", isbn: "", stock_quantity: 100, in_stock: true,
      description: "", preview_files: [],
    });
  };

  const startEdit = (book: any) => {
    setErrors({});
    setEditingBook({ ...book, preview_files: book.preview_files || [] });
  };

  const previewFiles: PreviewFile[] = editingBook?.preview_files || [];

  const getStockBadge = (book: any) => {
    const qty = book.stock_quantity ?? 0;
    if (qty === 0) return <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>;
    if (qty < 5) return <Badge className="text-[10px] bg-orange-500 hover:bg-orange-600">Low: {qty}</Badge>;
    return <Badge variant="secondary" className="text-[10px]">{qty}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Books Management</h2>
          <p className="text-xs text-muted-foreground">{books?.length ?? 0} total • {filteredBooks.length} showing</p>
        </div>
        <Button size="sm" onClick={startNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Book
        </Button>
      </div>

      {/* ─── Search Bar ─── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, author, or ISBN..."
          className="pl-9 h-9 text-sm"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* ─── Toolbar: Filters + Sort + View ─── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-1.5 text-xs h-8">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="h-4 min-w-4 text-[10px] p-0 flex items-center justify-center">{activeFilterCount}</Badge>
          )}
        </Button>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <ArrowUpDown className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest" className="text-xs">Newest First</SelectItem>
            <SelectItem value="oldest" className="text-xs">Oldest First</SelectItem>
            <SelectItem value="price_asc" className="text-xs">Price: Low → High</SelectItem>
            <SelectItem value="price_desc" className="text-xs">Price: High → Low</SelectItem>
            <SelectItem value="title_asc" className="text-xs">Title: A → Z</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex border border-border rounded-md overflow-hidden">
          <button onClick={() => setViewMode("table")} className={`p-1.5 ${viewMode === "table" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}>
            <List className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setViewMode("grid")} className={`p-1.5 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}>
            <Grid3X3 className="h-3.5 w-3.5" />
          </button>
        </div>

        {activeFilterCount > 0 && (
          <Button size="sm" variant="ghost" onClick={resetFilters} className="gap-1 text-xs h-8 text-muted-foreground">
            <RotateCcw className="h-3 w-3" /> Reset
          </Button>
        )}

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">{selected.size} selected</span>
            <Button size="sm" variant="destructive" className="h-8 text-xs gap-1" onClick={() => { setBulkAction("delete"); handleBulkAction(); }}>
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* ─── Filter Panel ─── */}
      {showFilters && (
        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Category</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__" className="text-xs">All Categories</SelectItem>
                    {categories?.map((c: any) => <SelectItem key={c.id} value={c.name} className="text-xs">{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Stock Status</Label>
                <Select value={filterStock} onValueChange={setFilterStock}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__" className="text-xs">All</SelectItem>
                    <SelectItem value="in_stock" className="text-xs">In Stock</SelectItem>
                    <SelectItem value="out_of_stock" className="text-xs">Out of Stock</SelectItem>
                    <SelectItem value="low_stock" className="text-xs">Low Stock (&lt;5)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Discount</Label>
                <Select value={filterDiscount} onValueChange={setFilterDiscount}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__" className="text-xs">All</SelectItem>
                    <SelectItem value="discounted" className="text-xs">Discounted</SelectItem>
                    <SelectItem value="no_discount" className="text-xs">No Discount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Min Price</Label>
                <Input type="number" min={0} value={priceMin} onChange={(e) => setPriceMin(e.target.value)} className="h-8 text-xs" placeholder="£0" />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Max Price</Label>
                <Input type="number" min={0} value={priceMax} onChange={(e) => setPriceMax(e.target.value)} className="h-8 text-xs" placeholder="£999" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Edit Form (kept intact) ─── */}
      {editingBook && (
        <Card className="border-primary/30">
          <CardContent className="p-5 space-y-5">
            <h3 className="font-semibold text-sm text-foreground">{editingBook.id ? "Edit Book" : "New Book"}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Book Title" required error={errors.title}>
                <Input value={editingBook.title} onChange={(e) => updateField("title", e.target.value)} placeholder="Enter book title" className={errors.title ? "border-destructive" : ""} />
              </FormField>
              <FormField label="Author Name" required error={errors.author}>
                <Input value={editingBook.author} onChange={(e) => updateField("author", e.target.value)} placeholder="Enter author name" className={errors.author ? "border-destructive" : ""} />
              </FormField>
              <FormField label="ISBN" error={errors.isbn} success={!!editingBook.isbn && !errors.isbn} hint="ISBN-10, ISBN-13, or custom ID">
                <Input value={editingBook.isbn || ""} onChange={(e) => updateField("isbn", e.target.value)} placeholder="978-3-16-148410-0" className={errors.isbn ? "border-destructive" : editingBook.isbn && !errors.isbn ? "border-emerald-500" : ""} />
              </FormField>
              <FormField label="Category" required error={errors.category}>
                <Select value={editingBook.category} onValueChange={(v) => updateField("category", v)}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>{categories?.map((c: any) => <SelectItem key={c.id} value={c.name} className="text-sm">{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </FormField>
              <FormField label="Publisher">
                <Select value={editingBook.publisher || "__none__"} onValueChange={(v) => updateField("publisher", v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-sm">No Publisher</SelectItem>
                    {publishers?.map((p: any) => <SelectItem key={p.id} value={p.name} className="text-sm">{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>
              <FormField label="Rating" hint="0 to 5">
                <Input type="number" step="0.1" min={0} max={5} value={editingBook.rating ?? ""} onChange={(e) => updateField("rating", parseFloat(e.target.value) || null)} />
              </FormField>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <FormField label="Price" required error={errors.price}>
                <Input type="number" step="0.01" min={0} value={editingBook.price ?? ""} onChange={(e) => updateField("price", e.target.value === "" ? null : parseFloat(e.target.value))} className={errors.price ? "border-destructive" : ""} />
              </FormField>
              <FormField label="Original Price" hint="Strikethrough price">
                <Input type="number" step="0.01" min={0} value={editingBook.original_price ?? ""} onChange={(e) => updateField("original_price", e.target.value === "" ? null : parseFloat(e.target.value))} />
              </FormField>
              <FormField label="Discount %">
                <Input type="number" min={0} max={100} value={editingBook.discount_percent ?? ""} onChange={(e) => updateField("discount_percent", e.target.value === "" ? 0 : parseInt(e.target.value))} />
              </FormField>
              <FormField label="Stock Qty">
                <Input type="number" min={0} value={editingBook.stock_quantity ?? 100} onChange={(e) => updateField("stock_quantity", parseInt(e.target.value) || 0)} />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Sort Order">
                <Input type="number" min={0} value={editingBook.sort_order || 0} onChange={(e) => updateField("sort_order", parseInt(e.target.value) || 0)} />
              </FormField>
              <FormField label="Cover Color" hint="Fallback color">
                <div className="flex items-center gap-2">
                  <input type="color" value={editingBook.cover_color || "#1a5276"} onChange={(e) => updateField("cover_color", e.target.value)} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                  <Input value={editingBook.cover_color || "#1a5276"} onChange={(e) => updateField("cover_color", e.target.value)} className="flex-1 font-mono text-xs" />
                </div>
              </FormField>
            </div>

            <FormField label="Description">
              <Textarea value={editingBook.description || ""} onChange={(e) => updateField("description", e.target.value)} placeholder="Book description..." rows={3} />
            </FormField>

            <div className="flex items-center gap-6 py-2 flex-wrap">
              <div className="flex items-center gap-3">
                <Switch checked={editingBook.show_ratings !== false} onCheckedChange={(c) => updateField("show_ratings", c)} />
                <Label className="text-sm font-medium flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-amber-500" /> Show Ratings</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editingBook.in_stock !== false} onCheckedChange={(c) => updateField("in_stock", c)} />
                <Label className="text-sm font-medium">Active (Visible)</Label>
              </div>
            </div>

            {/* Cover Image */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
              <Label className="text-xs font-semibold flex items-center gap-1.5"><Image className="h-4 w-4 text-primary" /> Cover Image</Label>
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border bg-background hover:bg-muted/60 transition-colors text-sm">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  {uploadingCover ? "Uploading..." : "Choose Image"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverUpload} className="hidden" disabled={uploadingCover} />
                </label>
                {editingBook.cover_image && (
                  <div className="flex items-center gap-2">
                    <img src={editingBook.cover_image} alt="Cover" className="h-20 w-14 object-cover rounded-lg border border-border shadow-sm" />
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateField("cover_image", "")}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">JPG, PNG, WEBP • Max 10MB</p>
            </div>

            {/* Preview Files */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
              <Label className="text-xs font-semibold flex items-center gap-1.5"><FileText className="h-4 w-4 text-primary" /> Inside Pages Preview</Label>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border bg-background hover:bg-muted/60 transition-colors text-sm">
                <Upload className="h-4 w-4 text-muted-foreground" />
                {uploadingPreview ? "Uploading..." : "Upload Images / PDFs"}
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={handlePreviewUpload} className="hidden" disabled={uploadingPreview} />
              </label>
              <p className="text-[11px] text-muted-foreground">JPG, PNG, WEBP, PDF • Max 10MB per file</p>
              {previewFiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  {previewFiles.map((file, index) => (
                    <div key={index} className="relative group rounded-lg border border-border overflow-hidden bg-muted/30">
                      {file.type === "image" ? (
                        <img src={file.url} alt={file.name} className="w-full h-24 object-cover" />
                      ) : (
                        <div className="w-full h-24 flex flex-col items-center justify-center bg-muted/50">
                          <FileText className="h-8 w-8 text-destructive/70" />
                          <span className="text-[10px] text-muted-foreground mt-1">PDF</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={() => removePreviewFile(index)} className="p-1.5 rounded-full bg-destructive text-destructive-foreground"><X className="h-3.5 w-3.5" /></button>
                      </div>
                      <p className="text-[10px] text-muted-foreground px-2 py-1 truncate">{file.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <FormField label="Sample Preview URL" hint="Direct link to sample PDF or image">
              <Input placeholder="https://..." value={editingBook.sample_url || ""} onChange={(e) => updateField("sample_url", e.target.value)} />
            </FormField>

            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleSave} disabled={saving || uploadingCover || uploadingPreview || Object.keys(errors).length > 0} className="gap-1.5">
                <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setEditingBook(null); setErrors({}); }}>Cancel</Button>
              {Object.keys(errors).length > 0 && (
                <span className="text-[11px] text-destructive flex items-center gap-1 ml-2"><AlertCircle className="h-3 w-3" /> Fix errors above</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Detail View Modal ─── */}
      {detailBook && (
        <Card className="border-primary/20">
          <CardContent className="p-5">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-semibold text-foreground">{detailBook.title}</h3>
              <Button size="sm" variant="ghost" onClick={() => setDetailBook(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                {detailBook.cover_image && <img src={detailBook.cover_image} alt="" className="w-24 h-32 object-cover rounded-lg border border-border" />}
                <p><span className="text-muted-foreground">Author:</span> {detailBook.author}</p>
                <p><span className="text-muted-foreground">Category:</span> {detailBook.category}</p>
                <p><span className="text-muted-foreground">Publisher:</span> {detailBook.publisher || "—"}</p>
                <p><span className="text-muted-foreground">ISBN:</span> {detailBook.isbn || "—"}</p>
              </div>
              <div className="space-y-2">
                <p><span className="text-muted-foreground">Price:</span> £{detailBook.price}</p>
                <p><span className="text-muted-foreground">Original:</span> {detailBook.original_price ? `£${detailBook.original_price}` : "—"}</p>
                <p><span className="text-muted-foreground">Discount:</span> {detailBook.discount_percent || 0}%</p>
                <p><span className="text-muted-foreground">Stock:</span> {detailBook.stock_quantity ?? "N/A"}</p>
                <p><span className="text-muted-foreground">Rating:</span> {detailBook.rating ?? "—"}</p>
                <p><span className="text-muted-foreground">Status:</span> {detailBook.in_stock ? "Active" : "Inactive"}</p>
              </div>
            </div>
            {detailBook.description && <p className="text-sm text-muted-foreground mt-3">{detailBook.description}</p>}
            {Array.isArray(detailBook.preview_files) && detailBook.preview_files.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Preview Files ({detailBook.preview_files.length})</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {detailBook.preview_files.map((f: any, i: number) => (
                    <div key={i} className="rounded-lg border border-border overflow-hidden bg-muted/30">
                      {f.type === "image" ? (
                        <img src={f.url} alt={f.name} className="w-full h-20 object-cover" />
                      ) : (
                        <div className="w-full h-20 flex flex-col items-center justify-center">
                          <FileText className="h-6 w-6 text-destructive/70" />
                          <span className="text-[10px] text-muted-foreground mt-1">PDF</span>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground px-1.5 py-1 truncate">{f.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {detailBook.sample_url && (
              <p className="text-sm mt-2"><span className="text-muted-foreground">Sample URL:</span> <a href={detailBook.sample_url} target="_blank" rel="noopener noreferrer" className="text-primary underline">View Sample</a></p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── Loading State ─── */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      )}

      {/* ─── Table View ─── */}
      {!isLoading && viewMode === "table" && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={selected.size === filteredBooks.length && filteredBooks.length > 0} onCheckedChange={selectAll} />
                </TableHead>
                <TableHead className="w-12"></TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="hidden sm:table-cell">Author</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBooks.map((book: any) => (
                <TableRow key={book.id} className={!book.in_stock ? "opacity-60" : ""}>
                  <TableCell>
                    <Checkbox checked={selected.has(book.id)} onCheckedChange={() => toggleSelect(book.id)} />
                  </TableCell>
                  <TableCell>
                    {book.cover_image ? (
                      <img src={book.cover_image} alt="" className="w-8 h-10 rounded object-cover" />
                    ) : (
                      <div className="w-8 h-10 rounded" style={{ backgroundColor: book.cover_color || "#3b82f6" }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate max-w-[200px]">{book.title}</p>
                      <p className="text-[11px] text-muted-foreground sm:hidden">{book.author}</p>
                      {book.discount_percent > 0 && (
                        <Badge variant="secondary" className="text-[10px] mt-0.5">{book.discount_percent}% off</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{book.author}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{book.category}</TableCell>
                  <TableCell className="text-sm font-medium">£{book.price}</TableCell>
                  <TableCell>{getStockBadge(book)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetailBook(book)} title="View">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEdit(book)} title="Edit">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => { if (confirm("Delete this book?")) deleteBook.mutate(book.id); }} title="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredBooks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-sm text-muted-foreground">
                    {search || activeFilterCount > 0 ? "No books match your filters." : "No books yet. Click \"Add Book\" to start."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ─── Grid View ─── */}
      {!isLoading && viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredBooks.map((book: any) => (
            <Card key={book.id} className={`overflow-hidden ${!book.in_stock ? "opacity-60" : ""}`}>
              <CardContent className="p-3">
                <div className="flex gap-3">
                  {book.cover_image ? (
                    <img src={book.cover_image} alt="" className="w-14 h-20 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-14 h-20 rounded shrink-0" style={{ backgroundColor: book.cover_color || "#3b82f6" }} />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{book.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{book.author}</p>
                    <p className="text-xs text-muted-foreground">{book.category}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-semibold">£{book.price}</span>
                      {book.discount_percent > 0 && <Badge variant="secondary" className="text-[10px]">{book.discount_percent}%</Badge>}
                    </div>
                    <div className="mt-1">{getStockBadge(book)}</div>
                  </div>
                </div>
                <div className="flex gap-1 mt-3 border-t border-border pt-2">
                  <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs gap-1" onClick={() => setDetailBook(book)}><Eye className="h-3 w-3" /> View</Button>
                  <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs gap-1" onClick={() => startEdit(book)}><Edit2 className="h-3 w-3" /> Edit</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => { if (confirm("Delete?")) deleteBook.mutate(book.id); }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredBooks.length === 0 && (
            <p className="col-span-full text-center py-8 text-sm text-muted-foreground">
              {search || activeFilterCount > 0 ? "No books match your filters." : "No books yet."}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default BooksManagementTab;
