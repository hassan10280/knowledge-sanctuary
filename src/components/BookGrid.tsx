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
  const coverAccent = book.cover_color ? book.cover_color + "cc" : "#2980b9";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
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
      <div className="relative">
        {book.discount_percent > 0 && (
          <div className="absolute top-3 left-3 z-10 bg-[hsl(var(--coral))] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
            {book.discount_percent}% OFF
          </div>
        )}
        <div
          className="aspect-[3/4] rounded-xl shadow-card group-hover:shadow-book group-hover:-translate-y-2 transition-all duration-500 flex items-center justify-center overflow-hidden relative cursor-pointer"
          style={{ background: book.cover_image ? undefined : `linear-gradient(145deg, ${book.cover_color || "#1a5276"} 0%, ${coverAccent} 100%)` }}
          onClick={() => onViewDetails(book)}
        >
          {(book as any).cover_image ? (
            <img src={(book as any).cover_image} alt={book.title} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <>
              <div className="absolute inset-0 opacity-[0.06]" style={{
                backgroundImage: `radial-gradient(circle at 30% 20%, white 1px, transparent 1px), radial-gradient(circle at 70% 80%, white 1px, transparent 1px)`,
                backgroundSize: '20px 20px'
              }} />
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-black/15" />
              <div className="text-center px-6 relative z-10">
                <div className="w-12 h-[1px] bg-white/30 mx-auto mb-4" />
                <div className="w-8 h-8 mx-auto mb-3 border border-white/20 rounded-full flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-white/50" />
                </div>
                <h4 className="font-serif text-white text-sm leading-tight drop-shadow-md">{book.title}</h4>
                <p className="text-white/50 text-[10px] mt-2 font-medium tracking-wide">{book.author}</p>
                <div className="w-12 h-[1px] bg-white/30 mx-auto mt-4" />
              </div>
            </>
          )}

          {/* Hover overlay with buttons */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-500 flex flex-col items-center justify-center gap-3 p-4">
            <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0 flex flex-col gap-2.5 w-full max-w-[180px]">
              <button
                onClick={(e) => { e.stopPropagation(); onViewDetails(book); }}
                className="w-full px-4 py-2.5 bg-white text-foreground text-xs font-semibold rounded-lg shadow-lg hover:bg-white/95 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Eye className="h-3.5 w-3.5" />
                View Details
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onReadSample(book); }}
                className="w-full px-4 py-2.5 bg-[hsl(var(--gold))]/90 text-white text-xs font-semibold rounded-lg shadow-lg hover:bg-[hsl(var(--gold))] hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 backdrop-blur-sm"
              >
                <BookText className="h-3.5 w-3.5" />
                Read a Sample
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <h4 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">{book.title}</h4>
        <p className="text-xs text-muted-foreground">{book.author}</p>
        {book.show_ratings !== false && book.rating && (
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-[hsl(var(--gold))] text-[hsl(var(--gold))]" />
            <span className="text-xs font-medium text-foreground">{book.rating}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          {wholesalePrice !== undefined ? (
            <>
              <span className="text-sm font-bold text-primary">£{wholesalePrice.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground line-through">£{Number(book.price).toFixed(2)}</span>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Wholesale</span>
            </>
          ) : (
            <>
              <span className="text-sm font-bold text-primary">£{Number(book.price).toFixed(2)}</span>
              {book.original_price && (
                <span className="text-xs text-muted-foreground line-through">£{Number(book.original_price).toFixed(2)}</span>
              )}
            </>
          )}
        </div>
        {discountEndDate && <DiscountCountdown endDate={discountEndDate} />}

        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onViewDetails(book)}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 text-[11px] font-semibold bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition-all"
          >
            <Eye className="h-3 w-3" />
            Details
          </button>
          <button
            onClick={() => onReadSample(book)}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 text-[11px] font-semibold bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))] border border-[hsl(var(--gold))]/20 rounded-lg hover:bg-[hsl(var(--gold))]/20 transition-all"
          >
            <BookText className="h-3 w-3" />
            Sample
          </button>
        </div>

        {/* Add to Cart / Go to Cart — instant, no modal */}
        <button
          onClick={handleAddToCart}
          className={`mt-1.5 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
            isInCart
              ? "bg-[hsl(var(--mint))]/10 text-[hsl(var(--mint))] border border-[hsl(var(--mint))]/30 hover:bg-[hsl(var(--mint))]/20"
              : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20"
          }`}
        >
          {isInCart ? (
            <>
              <ArrowRight className="h-3.5 w-3.5" />
              Go to Cart
            </>
          ) : (
            <>
              <ShoppingCart className="h-3.5 w-3.5" />
              {addToCartText}
            </>
          )}
        </button>
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
