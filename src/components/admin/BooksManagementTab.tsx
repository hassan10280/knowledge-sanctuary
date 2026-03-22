import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBooks, useCategories, useUpsertBook, useDeleteBook } from "@/hooks/useBooks";
import { usePublishers } from "@/hooks/usePublishers";
import { toast } from "sonner";
import { Save, Plus, Trash2, BookOpen, Star, Image, Upload, FileText, GripVertical, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getErrorMessage } from "@/lib/admin-submit";

interface PreviewFile {
  url: string;
  name: string;
  type: "image" | "pdf";
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_PREVIEW_TYPES = [...ALLOWED_IMAGE_TYPES, "application/pdf"];

/* ─── Field wrapper with label + validation state ─── */
const FormField = ({ label, required, error, success, hint, children }: {
  label: string;
  required?: boolean;
  error?: string;
  success?: boolean;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
      {label}
      {required && <span className="text-destructive">*</span>}
      {success && !error && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
    </Label>
    {children}
    {error && (
      <p className="text-[11px] text-destructive flex items-center gap-1">
        <AlertCircle className="h-3 w-3 shrink-0" /> {error}
      </p>
    )}
    {hint && !error && (
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    )}
  </div>
);

/* ─── ISBN Validation ─── */
function validateISBN(isbn: string): boolean {
  if (!isbn) return true; // optional
  const clean = isbn.replace(/[-\s]/g, "");
  if (clean.length === 10) {
    // ISBN-10
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      if (!/\d/.test(clean[i])) return false;
      sum += parseInt(clean[i]) * (10 - i);
    }
    const last = clean[9].toUpperCase();
    sum += last === "X" ? 10 : parseInt(last);
    return !isNaN(sum) && sum % 11 === 0;
  }
  if (clean.length === 13) {
    // ISBN-13
    if (!/^\d{13}$/.test(clean)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(clean[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const check = (10 - (sum % 10)) % 10;
    return check === parseInt(clean[12]);
  }
  // Allow any alphanumeric string as a custom ID
  return /^[a-zA-Z0-9\-]+$/.test(isbn) && isbn.length >= 3;
}

const BooksManagementTab = () => {
  const { data: books } = useBooks();
  const { data: categories } = useCategories();
  const { data: publishers } = usePublishers();
  const upsertBook = useUpsertBook();
  const deleteBook = useDeleteBook();

  const [editingBook, setEditingBook] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPreview, setUploadingPreview] = useState(false);

  /* ─── Duplicate ISBN check ─── */
  const checkISBNDuplicate = useCallback((isbn: string): string | null => {
    if (!isbn || !books) return null;
    const duplicate = books.find(
      (b: any) => b.isbn && b.isbn.toLowerCase() === isbn.toLowerCase() && b.id !== editingBook?.id
    );
    return duplicate ? "This ISBN already exists" : null;
  }, [books, editingBook?.id]);

  /* ─── Real-time field validation ─── */
  const validateField = useCallback((field: string, value: any) => {
    const newErrors = { ...errors };

    switch (field) {
      case "isbn": {
        const v = String(value || "");
        if (v && !validateISBN(v)) {
          newErrors.isbn = "Invalid ISBN format";
        } else {
          const dup = checkISBNDuplicate(v);
          if (dup) newErrors.isbn = dup;
          else delete newErrors.isbn;
        }
        break;
      }
      case "title":
        if (!value || !String(value).trim()) newErrors.title = "Title is required";
        else delete newErrors.title;
        break;
      case "author":
        if (!value || !String(value).trim()) newErrors.author = "Author is required";
        else delete newErrors.author;
        break;
      case "price":
        if (value === null || value === undefined || value === "" || Number(value) < 0) newErrors.price = "Valid price required";
        else delete newErrors.price;
        break;
      default:
        break;
    }

    setErrors(newErrors);
  }, [errors, checkISBNDuplicate]);

  const updateField = (field: string, value: any) => {
    setEditingBook((prev: any) => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  /* ─── Cover Image Upload ─── */
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingBook) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, WEBP images are allowed for cover.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum 10MB.");
      return;
    }

    setUploadingCover(true);
    try {
      const path = `covers/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("site-assets").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
      updateField("cover_image", urlData.publicUrl);
      toast.success("Cover image uploaded!");
    } catch (err: any) {
      toast.error("Upload failed: " + (err.message || "Unknown error"));
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  };

  /* ─── Preview Files Upload (multiple) ─── */
  const handlePreviewUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !editingBook) return;

    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      if (!ALLOWED_PREVIEW_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" skipped — unsupported format.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`"${file.name}" skipped — exceeds 10MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (!validFiles.length) return;

    setUploadingPreview(true);
    const currentFiles: PreviewFile[] = editingBook.preview_files || [];
    const newFiles: PreviewFile[] = [...currentFiles];

    try {
      for (const file of validFiles) {
        const path = `previews/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("site-assets").upload(path, file);
        if (error) {
          toast.error(`Failed to upload "${file.name}": ${error.message}`);
          continue;
        }
        const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(path);
        newFiles.push({
          url: urlData.publicUrl,
          name: file.name,
          type: file.type === "application/pdf" ? "pdf" : "image",
        });
      }
      updateField("preview_files", newFiles);
      toast.success(`${validFiles.length} file(s) uploaded!`);
    } catch (err: any) {
      toast.error("Upload failed: " + (err.message || "Unknown error"));
    } finally {
      setUploadingPreview(false);
      e.target.value = "";
    }
  };

  const removePreviewFile = (index: number) => {
    const current: PreviewFile[] = editingBook.preview_files || [];
    updateField("preview_files", current.filter((_, i) => i !== index));
  };

  /* ─── Save ─── */
  const handleSave = async () => {
    if (!editingBook) return;

    // Full validation
    const validationErrors: Record<string, string> = {};
    if (!editingBook.title?.trim()) validationErrors.title = "Title is required";
    if (!editingBook.author?.trim()) validationErrors.author = "Author is required";
    if (!editingBook.category?.trim()) validationErrors.category = "Category is required";
    if (editingBook.price === null || editingBook.price === undefined || Number(editingBook.price) < 0) validationErrors.price = "Valid price required";
    if (editingBook.isbn) {
      if (!validateISBN(editingBook.isbn)) validationErrors.isbn = "Invalid ISBN format";
      const dup = checkISBNDuplicate(editingBook.isbn);
      if (dup) validationErrors.isbn = dup;
    }
    if (editingBook.original_price !== null && editingBook.original_price !== undefined && editingBook.original_price !== "" && Number(editingBook.original_price) < 0) {
      validationErrors.original_price = "Must be a positive number";
    }
    if (editingBook.discount_percent !== null && editingBook.discount_percent !== undefined && editingBook.discount_percent !== "") {
      const dp = Number(editingBook.discount_percent);
      if (isNaN(dp) || dp < 0 || dp > 100) validationErrors.discount_percent = "Must be 0–100";
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      const firstError = Object.values(validationErrors)[0];
      toast.error(firstError);
      return;
    }

    setSaving(true);
    try {
      await upsertBook.mutateAsync(editingBook);
      toast.success("Book saved!");
      setEditingBook(null);
      setErrors({});
    } catch (e: unknown) {
      toast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-serif">Books Management</CardTitle>
        <Button size="sm" onClick={startNew} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Book
        </Button>
      </CardHeader>
      <CardContent>
        {editingBook && (
          <div className="mb-6 p-5 bg-muted/50 rounded-xl border border-border space-y-5">
            <h3 className="font-semibold text-sm text-foreground">{editingBook.id ? "Edit Book" : "New Book"}</h3>

            {/* ─── Basic Info ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Book Title" required error={errors.title}>
                <Input
                  value={editingBook.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="Enter book title"
                  className={errors.title ? "border-destructive" : ""}
                />
              </FormField>

              <FormField label="Author Name" required error={errors.author}>
                <Input
                  value={editingBook.author}
                  onChange={(e) => updateField("author", e.target.value)}
                  placeholder="Enter author name"
                  className={errors.author ? "border-destructive" : ""}
                />
              </FormField>

              <FormField label="ISBN" error={errors.isbn} success={!!editingBook.isbn && !errors.isbn} hint="Supports ISBN-10, ISBN-13, or custom alphanumeric ID">
                <Input
                  value={editingBook.isbn || ""}
                  onChange={(e) => updateField("isbn", e.target.value)}
                  placeholder="e.g. 978-3-16-148410-0"
                  className={errors.isbn ? "border-destructive" : editingBook.isbn && !errors.isbn ? "border-emerald-500" : ""}
                />
              </FormField>

              <FormField label="Subject / Category" required error={errors.category}>
                <Select value={editingBook.category} onValueChange={(v) => updateField("category", v)}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select category..." /></SelectTrigger>
                  <SelectContent>
                    {categories?.map((c: any) => <SelectItem key={c.id} value={c.name} className="text-sm">{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Publisher">
                <Select value={editingBook.publisher || "__none__"} onValueChange={(v) => updateField("publisher", v === "__none__" ? "" : v)}>
                  <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select publisher..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-sm">No Publisher</SelectItem>
                    {publishers?.map((p: any) => <SelectItem key={p.id} value={p.name} className="text-sm">{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Rating" hint="0 to 5">
                <Input
                  type="number"
                  step="0.1"
                  min={0}
                  max={5}
                  value={editingBook.rating ?? ""}
                  onChange={(e) => updateField("rating", parseFloat(e.target.value) || null)}
                  placeholder="4.5"
                />
              </FormField>
            </div>

            {/* ─── Price & Stock ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormField label="Price" required error={errors.price}>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={editingBook.price ?? ""}
                  onChange={(e) => updateField("price", e.target.value === "" ? null : parseFloat(e.target.value))}
                  placeholder="0.00"
                  className={errors.price ? "border-destructive" : ""}
                />
              </FormField>

              <FormField label="Discount Price (Original)" error={errors.original_price} hint="Strikethrough price shown to buyers">
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={editingBook.original_price ?? ""}
                  onChange={(e) => updateField("original_price", e.target.value === "" ? null : parseFloat(e.target.value))}
                  placeholder="0.00"
                />
              </FormField>

              <FormField label="Discount %" error={errors.discount_percent}>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={editingBook.discount_percent ?? ""}
                  onChange={(e) => updateField("discount_percent", e.target.value === "" ? 0 : parseInt(e.target.value))}
                  placeholder="0"
                />
              </FormField>

              <FormField label="Stock Quantity">
                <Input
                  type="number"
                  min={0}
                  value={editingBook.stock_quantity ?? 100}
                  onChange={(e) => updateField("stock_quantity", parseInt(e.target.value) || 0)}
                  placeholder="100"
                />
              </FormField>
            </div>

            {/* ─── Sort & Color ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Sort Order">
                <Input
                  type="number"
                  min={0}
                  value={editingBook.sort_order || 0}
                  onChange={(e) => updateField("sort_order", parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </FormField>

              <FormField label="Cover Color" hint="Fallback color when no image">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editingBook.cover_color || "#1a5276"}
                    onChange={(e) => updateField("cover_color", e.target.value)}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer"
                  />
                  <Input
                    value={editingBook.cover_color || "#1a5276"}
                    onChange={(e) => updateField("cover_color", e.target.value)}
                    placeholder="#1a5276"
                    className="flex-1 font-mono text-xs"
                  />
                </div>
              </FormField>
            </div>

            {/* ─── Description ─── */}
            <FormField label="Description">
              <Textarea
                value={editingBook.description || ""}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Book description..."
                rows={3}
              />
            </FormField>

            {/* ─── Toggles ─── */}
            <div className="flex items-center gap-6 py-2 flex-wrap">
              <div className="flex items-center gap-3">
                <Switch checked={editingBook.show_ratings !== false} onCheckedChange={(checked) => updateField("show_ratings", checked)} />
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-500" /> Show Ratings
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={editingBook.in_stock !== false} onCheckedChange={(checked) => updateField("in_stock", checked)} />
                <Label className="text-sm font-medium">Active (Visible)</Label>
              </div>
            </div>

            {/* ─── Cover Image ─── */}
            <div className="space-y-3 p-4 bg-background rounded-lg border border-border">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Image className="h-4 w-4 text-primary" /> Cover Image
              </Label>
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border bg-muted/30 hover:bg-muted/60 transition-colors text-sm">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  {uploadingCover ? "Uploading..." : "Choose Image"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleCoverUpload} className="hidden" disabled={uploadingCover} />
                </label>
                {editingBook.cover_image && (
                  <div className="flex items-center gap-2">
                    <img src={editingBook.cover_image} alt="Cover" className="h-20 w-14 object-cover rounded-lg border border-border shadow-sm" />
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateField("cover_image", "")}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">JPG, PNG, WEBP • Max 10MB</p>
            </div>

            {/* ─── Inside Pages Preview (Multiple Upload) ─── */}
            <div className="space-y-3 p-4 bg-background rounded-lg border border-border">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" /> Inside Pages Preview
              </Label>
              <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border bg-muted/30 hover:bg-muted/60 transition-colors text-sm">
                <Upload className="h-4 w-4 text-muted-foreground" />
                {uploadingPreview ? "Uploading..." : "Upload Images / PDFs"}
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={handlePreviewUpload} className="hidden" disabled={uploadingPreview} />
              </label>
              <p className="text-[11px] text-muted-foreground">JPG, PNG, WEBP, PDF • Max 10MB per file • Multiple files allowed</p>

              {previewFiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
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
                        <button onClick={() => removePreviewFile(index)} className="p-1.5 rounded-full bg-destructive text-destructive-foreground">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground px-2 py-1 truncate">{file.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── Sample Preview ─── */}
            <FormField label="Sample Preview URL" hint="Direct link to sample PDF or image">
              <Input
                placeholder="https://..."
                value={editingBook.sample_url || ""}
                onChange={(e) => updateField("sample_url", e.target.value)}
              />
            </FormField>

            {/* ─── Actions ─── */}
            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={handleSave} disabled={saving || Object.keys(errors).length > 0} className="gap-1.5">
                <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setEditingBook(null); setErrors({}); }}>Cancel</Button>
              {Object.keys(errors).length > 0 && (
                <span className="text-[11px] text-destructive flex items-center gap-1 ml-2">
                  <AlertCircle className="h-3 w-3" /> Fix errors above before saving
                </span>
              )}
            </div>
          </div>
        )}

        {/* ─── Book List ─── */}
        <div className="space-y-2">
          {books?.map((book: any) => (
            <div key={book.id} className={`flex items-center justify-between p-3 rounded-lg ${!book.in_stock ? "bg-destructive/5 border border-destructive/20" : "bg-muted/50"}`}>
              <div className="flex items-center gap-3 min-w-0">
                {book.cover_image ? (
                  <img src={book.cover_image} alt={book.title} className="w-8 h-10 rounded object-cover shrink-0" />
                ) : (
                  <div className="w-8 h-10 rounded shrink-0" style={{ backgroundColor: book.cover_color || "#3b82f6" }} />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{book.title}</p>
                    {!book.in_stock && <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">INACTIVE</span>}
                    {book.stock_quantity != null && book.stock_quantity < 5 && book.stock_quantity > 0 && (
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">LOW STOCK: {book.stock_quantity}</span>
                    )}
                    {book.stock_quantity === 0 && (
                      <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded">OUT OF STOCK</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {book.author} • {book.category} • £{book.price} • Stock: {book.stock_quantity ?? "N/A"}{book.isbn ? ` • ISBN: ${book.isbn}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => startEdit(book)}>Edit</Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Delete this book?")) deleteBook.mutate(book.id); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
          {(!books || books.length === 0) && (
            <p className="text-sm text-muted-foreground text-center py-8">No books yet. Click "Add Book" to get started.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BooksManagementTab;
