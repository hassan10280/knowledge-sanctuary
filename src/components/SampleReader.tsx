import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { BookOpen, X } from "lucide-react";

interface SampleReaderProps {
  book: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SampleReader = ({ book, open, onOpenChange }: SampleReaderProps) => {
  if (!book) return null;

  const sampleUrl = book.sample_url;
  const isPdf = sampleUrl?.toLowerCase().endsWith(".pdf");
  const isImage = sampleUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(sampleUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <DialogTitle className="sr-only">Sample: {book.title}</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground truncate">{book.title}</span>
            <span className="text-xs text-muted-foreground">— Sample Preview</span>
          </div>
          <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-muted rounded-md transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-muted">
          {!sampleUrl ? (
            <div className="flex flex-col items-center justify-center h-80 text-center px-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <BookOpen className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-serif text-lg text-foreground mb-2">Sample Not Available</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                A sample preview for this book has not been uploaded yet. Please check back later.
              </p>
            </div>
          ) : isPdf ? (
            <iframe
              src={sampleUrl}
              className="w-full h-[75vh] border-0"
              title={`Sample of ${book.title}`}
            />
          ) : isImage ? (
            <div className="p-4 flex justify-center">
              <img
                src={sampleUrl}
                alt={`Sample of ${book.title}`}
                className="max-w-full h-auto rounded-lg shadow-card"
              />
            </div>
          ) : (
            /* Treat as PDF by default */
            <iframe
              src={sampleUrl}
              className="w-full h-[75vh] border-0"
              title={`Sample of ${book.title}`}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SampleReader;
