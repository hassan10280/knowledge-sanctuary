import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight, Star, Eye, BookText, ShoppingCart, ArrowRight } from "lucide-react";
import { useBooks, useCategories } from "@/hooks/useBooks";
import { useCart } from "@/contexts/CartContext";
import { useDiscountCalculator } from "@/hooks/useDiscountCalculator";
import { useRetailDiscounts } from "@/hooks/useRetailDiscounts";
import { useAppSetting } from "@/hooks/useAppSettings";
import { trackEvent } from "@/lib/analytics";
import BookDetailModal from "./BookDetailModal";
import SampleReader from "./SampleReader";
import DiscountCountdown from "./DiscountCountdown";

interface BookGridProps {
  searchQuery?: string;
}

const BookCard = ({ book, index, onViewDetails, onReadSample, wholesalePrice, discountEndDate }: { book: any; index: number; onViewDetails: (book: any) => void; onReadSample: (book: any) => void; wholesalePrice?: number; discountEndDate?: string }) => {
  const { items, addItem } = useCart();
  const navigate = useNavigate();
  const addToCartText = useAppSetting("ui_text", "add_to_cart");
  const isInCart = items.some((i) => i.id === book.id);
  const isOutOfStock = book.stock_quantity !== null && book.stock_quantity !== undefined && book.stock_quantity <= 0;
  const coverAccent = book.cover_color ? book.cover_color + "cc" : "#2980b9";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    if (isInCart) {
      navigate("/cart", { state: { scrollToCart: true } });
      return;
    }
    addItem({
      id: book.id,
      title: book.title,
      author: book.author,
      price: wholesalePrice ?? Number(book.price),
      cover_color: book.cover_color || "#1a5276",
    });
    toast({
      title: "Added to cart successfully",
      description: `"${book.title}" has been added to your cart.`,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
      className="group"
    >
      <div className="bg-card rounded-2xl shadow-card hover:shadow-book transition-all duration-500 overflow-hidden flex flex-col border border-border/40">
        {/* Cover Image Area - dark background like reference */}
        <div
          className="relative aspect-[4/5] flex items-center justify-center p-8 cursor-pointer overflow-hidden"
          style={{ background: 'linear-gradient(180deg, hsl(var(--muted)/0.4) 0%, hsl(var(--muted)/0.6) 100%)' }}
          onClick={() => onViewDetails(book)}
        >
          {book.discount_percent > 0 && (
            <div className="absolute top-3 left-3 z-10 bg-[hsl(var(--coral))] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
              {book.discount_percent}% OFF
            </div>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center">
              <span className="bg-destructive text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">Out of Stock</span>
            </div>
          )}
          {(book as any).cover_image ? (
            <img
              src={(book as any).cover_image}
              alt={book.title}
              className="max-h-full max-w-[75%] object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.3)] group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div
              className="w-[65%] aspect-[2/3] rounded-md shadow-[0_8px_24px_rgba(0,0,0,0.3)] flex items-center justify-center group-hover:scale-105 transition-transform duration-500"
              style={{ background: `linear-gradient(145deg, ${book.cover_color || "#1a5276"} 0%, ${coverAccent} 100%)` }}
            >
              <div className="text-center px-4">
                <div className="w-8 h-8 mx-auto mb-2 border border-white/20 rounded-full flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-white/50" />
                </div>
                <h4 className="font-serif text-white text-xs leading-tight drop-shadow-md">{book.title}</h4>
                <p className="text-white/50 text-[9px] mt-1">{book.author}</p>
              </div>
            </div>
          )}
        </div>

        {/* Info Area */}
        <div className="px-5 pt-5 pb-5 flex flex-col items-center text-center gap-1.5 flex-1">
          <h4 className="text-base font-bold text-foreground leading-snug line-clamp-2 font-serif">{book.title}</h4>
          <p className="text-xs text-muted-foreground italic">{book.author}</p>

          {book.show_ratings !== false && book.rating && (
            <div className="flex items-center gap-1 mt-1">
              <Star className="h-3 w-3 fill-[hsl(var(--gold))] text-[hsl(var(--gold))]" />
              <span className="text-xs font-medium text-foreground">{book.rating}</span>
            </div>
          )}

          <div className="flex items-center gap-2.5 mt-2">
            {wholesalePrice !== undefined ? (
              <>
                <span className="text-lg font-bold text-foreground">£{wholesalePrice.toFixed(2)}</span>
                <span className="text-sm text-muted-foreground line-through">£{Number(book.price).toFixed(2)}</span>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Wholesale</span>
              </>
            ) : (
              <>
                <span className="text-lg font-bold text-foreground">£{Number(book.price).toFixed(2)}</span>
                {book.original_price && (
                  <span className="text-sm text-muted-foreground line-through">£{Number(book.original_price).toFixed(2)}</span>
                )}
              </>
            )}
          </div>

          {discountEndDate && <DiscountCountdown endDate={discountEndDate} />}

          {/* Add to Cart Button - rounded-full, prominent like reference */}
          <button
            onClick={handleAddToCart}
            className={`mt-3 w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-full transition-all ${
              isInCart
                ? "bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))] border border-[hsl(var(--mint))]/30 hover:bg-[hsl(var(--mint))]/25"
                : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg"
            }`}
          >
            {isInCart ? (
              <>
                <ArrowRight className="h-4 w-4" />
                Go to Cart
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" />
                {addToCartText}
              </>
            )}
          </button>

          {/* View Details & Preview - outlined buttons like reference */}
          <div className="flex gap-2.5 w-full mt-1.5">
            <button
              onClick={() => {
                trackEvent("product_view", {
                  product_id: book.id,
                  product_title: book.title,
                  product_price: Number(book.price),
                });
                onViewDetails(book);
              }}
              className="flex-1 px-3 py-2 text-xs font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted/50 hover:text-foreground transition-all text-center"
            >
              View Details
            </button>
            <button
              onClick={() => onReadSample(book)}
              className="flex-1 px-3 py-2 text-xs font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted/50 hover:text-foreground transition-all text-center"
            >
              Preview
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const BookGrid = ({ searchQuery = "" }: BookGridProps) => {
  const { data: books, isLoading: booksLoading } = useBooks();
  const { data: categories, isLoading: catsLoading } = useCategories();
  const { getBookDiscount } = useDiscountCalculator();
  const { data: retailDiscounts } = useRetailDiscounts();
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [sampleBook, setSampleBook] = useState<any>(null);

  const getDiscountedPrice = (book: any): number | undefined => {
    const result = getBookDiscount(book);
    if (result.discountSource === "none") return undefined;
    return Math.round(result.finalPrice * 100) / 100;
  };

  const getEndDate = (book: any): string | undefined => {
    const rd = retailDiscounts?.find(
      (d) => d.is_active && d.end_date && (
        (d.discount_type === "product" && d.book_id === book.id) ||
        (d.discount_type === "category" && d.reference_value === book.category)
      )
    );
    return rd?.end_date ?? undefined;
  };

  if (booksLoading || catsLoading) {
    return (
      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-10">
            <div className="h-3 w-24 bg-muted rounded animate-pulse mb-2" />
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-[3/4] rounded-xl bg-muted animate-pulse" />
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  const query = searchQuery.trim().toLowerCase();
  const filteredBooks = query
    ? books?.filter(b =>
        b.title.toLowerCase().includes(query) ||
        b.author.toLowerCase().includes(query) ||
        b.category.toLowerCase().includes(query)
      )
    : books;

  const groupedBooks = categories?.map((cat) => ({
    ...cat,
    books: filteredBooks?.filter((b) => b.category === cat.name) || [],
  })).filter((cat) => cat.books.length > 0);

  return (
    <section id="book-grid" className="py-20 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {query && (!groupedBooks || groupedBooks.length === 0) && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg">No books found for "{searchQuery}"</p>
          </div>
        )}

        {groupedBooks?.map((category, idx) => (
          <div key={category.id} className={`${idx > 0 ? "mt-20" : ""}`}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex items-end justify-between mb-10"
            >
              <div>
                <p className="text-xs font-medium tracking-widest uppercase text-primary mb-1.5">{category.name}</p>
                <h2 className="font-serif text-3xl sm:text-4xl text-foreground">{category.name}</h2>
              </div>
              <button className="flex items-center gap-1 text-sm text-primary hover:text-accent transition-colors font-medium group/btn">
                View All
                <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </motion.div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
              {category.books.map((book: any, i: number) => (
                <BookCard key={book.id} book={book} index={i} onViewDetails={setSelectedBook} onReadSample={setSampleBook} wholesalePrice={getDiscountedPrice(book)} discountEndDate={getEndDate(book)} />
              ))}
            </div>
          </div>
        ))}

        {!query && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-24"
          >
            <button className="group relative px-10 py-4 bg-primary text-primary-foreground font-medium rounded-xl hover:shadow-glow transition-all duration-500 font-serif text-lg inline-flex items-center gap-3 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--sky-deep))] to-[hsl(var(--sky))] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <BookOpen className="h-5 w-5 relative z-10" />
              <span className="relative z-10">Browse the Full Archive</span>
              <ChevronRight className="h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        )}
      </div>

      <BookDetailModal
        book={selectedBook}
        open={!!selectedBook}
        onOpenChange={(open) => { if (!open) setSelectedBook(null); }}
      />

      <SampleReader
        book={sampleBook}
        open={!!sampleBook}
        onOpenChange={(open) => { if (!open) setSampleBook(null); }}
      />
    </section>
  );
};

export default BookGrid;
