import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BookOpen, ShoppingCart, Star, Check } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BookDetailModalProps {
  book: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BookDetailModal = ({ book, open, onOpenChange }: BookDetailModalProps) => {
  const { addItem, items } = useCart();
  const [justAdded, setJustAdded] = useState(false);
  const isInCart = items.some((i) => i.id === book?.id);

  if (!book) return null;

  const handleAddToCart = () => {
    addItem({
      id: book.id,
      title: book.title,
      author: book.author,
      price: Number(book.price),
      cover_color: book.cover_color || "#1a5276",
    });
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2000);
  };

  const coverAccent = book.cover_color ? book.cover_color + "cc" : "#2980b9";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header gradient */}
        <div
          className="p-6 sm:p-8 text-center relative overflow-hidden"
          style={{ background: `linear-gradient(145deg, ${book.cover_color || "#1a5276"} 0%, ${coverAccent} 100%)` }}
        >
          <div className="absolute inset-0 opacity-[0.06]" style={{
            backgroundImage: `radial-gradient(circle at 30% 20%, white 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }} />
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-4 border border-white/20 rounded-full flex items-center justify-center">
              <BookOpen className="h-7 w-7 text-white/60" />
            </div>
            <h3 className="font-serif text-xl sm:text-2xl text-white leading-tight mb-1">{book.title}</h3>
            <p className="text-white/60 text-sm">{book.author}</p>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          <DialogHeader className="space-y-1 p-0">
            <DialogDescription className="text-sm text-primary font-medium italic">
              Take a moment to explore this book
            </DialogDescription>
            <DialogTitle className="sr-only">{book.title}</DialogTitle>
          </DialogHeader>

          {/* Rating & Price */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {book.rating && (
                <>
                  <Star className="h-4 w-4 fill-[hsl(var(--gold))] text-[hsl(var(--gold))]" />
                  <span className="text-sm font-semibold text-foreground">{book.rating} / 5</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">£{Number(book.price).toFixed(2)}</span>
              {book.original_price && (
                <span className="text-sm text-muted-foreground line-through">£{Number(book.original_price).toFixed(2)}</span>
              )}
            </div>
          </div>

          {/* Description */}
          {book.description && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{book.description}</p>
            </div>
          )}

          {!book.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              A carefully curated addition to our collection by {book.author}. This book covers essential topics in {book.category} and is recommended for readers of all levels.
            </p>
          )}

          {/* Discount badge */}
          {book.discount_percent > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--coral))]/10 text-[hsl(var(--coral))] rounded-full text-xs font-semibold">
              {book.discount_percent}% OFF — Limited Time
            </div>
          )}

          {/* Add to Cart */}
          <Button
            onClick={handleAddToCart}
            className="w-full h-12 text-base font-semibold gap-2 bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all duration-300"
          >
            <AnimatePresence mode="wait">
              {justAdded || isInCart ? (
                <motion.span key="added" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                  <Check className="h-5 w-5" />
                  {justAdded ? "Added to Cart!" : "Add Another"}
                </motion.span>
              ) : (
                <motion.span key="add" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Add to Cart
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookDetailModal;
