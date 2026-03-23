import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Upload, X, FileText, Image, AlertTriangle, CheckCircle2, Loader2, RotateCcw, Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";

interface PreviewFile {
  url: string;
  name: string;
  type: "image" | "pdf";
}

interface FileUploadItem {
  id: string;
  file: File;
  status: "uploading" | "done" | "error";
  progress: number;
  error?: string;
  result?: PreviewFile;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

interface Props {
  files: PreviewFile[];
  onChange: (files: PreviewFile[]) => void;
  uploading: boolean;
  setUploading: (v: boolean) => void;
}

export default function PreviewFileUploader({ files, onChange, uploading, setUploading }: Props) {
  const [queue, setQueue] = useState<FileUploadItem[]>([]);
  const abortRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const totalSize = queue.reduce((s, q) => s + q.file.size, 0);
  const uploadedSize = queue.reduce((s, q) => s + (q.progress / 100) * q.file.size, 0);
  const overallProgress = totalSize > 0 ? Math.round((uploadedSize / totalSize) * 100) : 0;
  const isUploading = queue.some((q) => q.status === "uploading");
  const hasErrors = queue.some((q) => q.status === "error");

  const uploadSingleFile = useCallback(async (item: FileUploadItem): Promise<PreviewFile | null> => {
    const path = `previews/${Date.now()}-${Math.random().toString(36).slice(2)}-${item.file.name}`;
    try {
      const { error } = await supabase.storage.from("site-assets").upload(path, item.file);
      if (error) throw error;
      const { data: u } = supabase.storage.from("site-assets").getPublicUrl(path);
      return {
        url: u.publicUrl,
        name: item.file.name,
        type: item.file.type === "application/pdf" ? "pdf" : "image",
      };
    } catch (err: any) {
      throw err;
    }
  }, []);

  const processQueue = useCallback(async (items: FileUploadItem[]) => {
    abortRef.current = false;
    setUploading(true);
    const results: PreviewFile[] = [];

    for (let i = 0; i < items.length; i++) {
      if (abortRef.current) break;
      const item = items[i];
      if (item.status === "done") {
        if (item.result) results.push(item.result);
        continue;
      }

      // Mark uploading
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "uploading" as const, progress: 10, error: undefined } : q))
      );

      try {
        // Simulate progress steps
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, progress: 30 } : q))
        );

        const result = await uploadSingleFile(item);

        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, progress: 80 } : q))
        );

        if (result) {
          results.push(result);
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id ? { ...q, status: "done" as const, progress: 100, result } : q
            )
          );
        }
      } catch (err: any) {
        const msg = err?.message || err?.statusCode === 408 ? "Error: Server Timeout" : `Error: ${err?.message || "Upload failed"}`;
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: "error" as const, progress: 0, error: msg } : q
          )
        );
      }
    }

    // Merge results with existing files
    if (results.length > 0) {
      onChange([...files, ...results]);
      toast.success(`${results.length} file(s) uploaded successfully!`);
    }

    setUploading(false);

    // Clear completed items from queue after a delay
    setTimeout(() => {
      setQueue((prev) => prev.filter((q) => q.status !== "done"));
    }, 2000);
  }, [files, onChange, setUploading, uploadSingleFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newItems: FileUploadItem[] = [];
    for (const f of Array.from(selectedFiles)) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        toast.error(`"${f.name}" — unsupported format`);
        continue;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`"${f.name}" exceeds 10MB limit`);
        continue;
      }
      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file: f,
        status: "uploading",
        progress: 0,
      });
    }

    if (newItems.length === 0) return;
    setQueue((prev) => [...prev, ...newItems]);
    processQueue(newItems);
    e.target.value = "";
  };

  const retryFile = async (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (!item) return;
    setUploading(true);
    setQueue((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: "uploading" as const, progress: 10, error: undefined } : q))
    );

    try {
      setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, progress: 40 } : q)));
      const result = await uploadSingleFile(item);
      if (result) {
        onChange([...files, result]);
        setQueue((prev) =>
          prev.map((q) => (q.id === id ? { ...q, status: "done" as const, progress: 100, result } : q))
        );
        toast.success(`${item.file.name} uploaded!`);
        setTimeout(() => {
          setQueue((prev) => prev.filter((q) => q.id !== id));
        }, 2000);
      }
    } catch (err: any) {
      setQueue((prev) =>
        prev.map((q) =>
          q.id === id ? { ...q, status: "error" as const, progress: 0, error: err?.message || "Upload failed" } : q
        )
      );
    }
    setUploading(false);
  };

  const cancelAll = () => {
    abortRef.current = true;
    setQueue((prev) => prev.filter((q) => q.status === "done"));
    setUploading(false);
    toast.info("Upload cancelled");
  };

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const removeExistingFile = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3 p-4 bg-muted/30 rounded-lg border border-border">
      <Label className="text-xs font-semibold flex items-center gap-1.5">
        <FileText className="h-4 w-4 text-primary" /> Inside Pages Preview
      </Label>

      {/* Upload button */}
      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-border bg-background hover:bg-muted/60 transition-colors text-sm">
        <Upload className="h-4 w-4 text-muted-foreground" />
        Choose Files
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
      </label>
      <p className="text-[11px] text-muted-foreground">JPG, PNG, WEBP, PDF • Max 10MB per file</p>

      {/* Overall Progress Bar */}
      {queue.length > 0 && (
        <div className="space-y-2 p-3 rounded-lg border border-border bg-background">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-foreground">
              {isUploading
                ? `${overallProgress}% complete (${formatBytes(uploadedSize)} / ${formatBytes(totalSize)})`
                : hasErrors
                ? "Some uploads failed"
                : "All uploads complete"}
            </p>
            {isUploading && (
              <Button size="sm" variant="destructive" className="h-6 text-[10px] px-2 gap-1" onClick={cancelAll}>
                <Ban className="h-3 w-3" /> Cancel All
              </Button>
            )}
          </div>
          <Progress value={overallProgress} className="h-2" />

          {/* Individual file items */}
          <div className="space-y-1.5 mt-2 max-h-[240px] overflow-y-auto">
            {queue.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-md border text-xs ${
                  item.status === "error"
                    ? "border-destructive/40 bg-destructive/5"
                    : item.status === "done"
                    ? "border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20"
                    : "border-border bg-muted/20"
                }`}
              >
                {/* Icon */}
                {item.status === "uploading" && <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />}
                {item.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                {item.status === "error" && <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />}

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-foreground">{item.file.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{formatBytes(item.file.size)}</span>
                    {item.status === "uploading" && <span className="text-primary">{item.progress}%</span>}
                    {item.status === "error" && (
                      <span className="text-destructive">{item.error}</span>
                    )}
                  </div>
                  {item.status === "uploading" && (
                    <div className="w-full bg-muted rounded-full h-1 mt-1">
                      <div
                        className="bg-primary h-1 rounded-full transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Actions */}
                {item.status === "error" && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2 gap-1"
                      onClick={() => retryFile(item.id)}
                    >
                      <RotateCcw className="h-2.5 w-2.5" /> Retry
                    </Button>
                    <button onClick={() => removeFromQueue(item.id)} className="p-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {item.status === "done" && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Already uploaded files grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          {files.map((file, index) => (
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
                <button
                  onClick={() => removeExistingFile(index)}
                  className="p-1.5 rounded-full bg-destructive text-destructive-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground px-2 py-1 truncate">{file.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
