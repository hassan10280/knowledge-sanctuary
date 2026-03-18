import { motion } from "framer-motion";
import { BookOpen, ChevronRight, Star, ShoppingBag } from "lucide-react";

interface Book {
  title: string;
  author: string;
  coverColor: string;
  coverAccent: string;
  price?: string;
  originalPrice?: string;
  discount?: string;
  rating?: number;
}

interface CategorySection {
  name: string;
  nameEn: string;
  books: Book[];
}

const categories: CategorySection[] = [
  {
    name: "কুরআন ও তাফসীর",
    nameEn: "Quran & Tafsir",
    books: [
      { title: "Tafsir Ibn Kathir", author: "Ibn Kathir", coverColor: "#1a5276", coverAccent: "#2980b9", price: "£18.99", originalPrice: "£24.99", discount: "24%", rating: 4.9 },
      { title: "Ma'ariful Quran", author: "Mufti Shafi Usmani", coverColor: "#1e6f5c", coverAccent: "#29a070", price: "£22.00", rating: 4.8 },
      { title: "Quran Word by Word", author: "Multiple Authors", coverColor: "#2c6e8a", coverAccent: "#48a6c9", price: "£12.99", rating: 4.7 },
      { title: "Tajweed Rules", author: "Imam Al-Jazari", coverColor: "#1a4d6e", coverAccent: "#3a8dbe", price: "£8.50", rating: 4.6 },
    ],
  },
  {
    name: "হাদীস সংকলন",
    nameEn: "Hadith Collections",
    books: [
      { title: "Sahih al-Bukhari", author: "Imam al-Bukhari", coverColor: "#1b4f72", coverAccent: "#2e86c1", price: "£28.00", originalPrice: "£35.00", discount: "20%", rating: 5.0 },
      { title: "Sahih Muslim", author: "Imam Muslim", coverColor: "#1a5c5c", coverAccent: "#2e8b8b", price: "£26.00", rating: 4.9 },
      { title: "Riyad as-Salihin", author: "Imam an-Nawawi", coverColor: "#2d6a4f", coverAccent: "#40916c", price: "£14.99", originalPrice: "£18.99", discount: "21%", rating: 4.8 },
      { title: "Al-Muwatta", author: "Imam Malik", coverColor: "#285c6e", coverAccent: "#3a8fa6", price: "£19.99", rating: 4.7 },
    ],
  },
  {
    name: "ফিকহ ও আইন",
    nameEn: "Fiqh & Law",
    books: [
      { title: "Fiqh us-Sunnah", author: "Sayyid Sabiq", coverColor: "#2d5a4f", coverAccent: "#3d8a6f", price: "£16.99", rating: 4.6 },
      { title: "Mukhtasar al-Quduri", author: "Imam al-Quduri", coverColor: "#1b5a8a", coverAccent: "#2a7ab8", price: "£13.50", originalPrice: "£16.00", discount: "16%", rating: 4.5 },
      { title: "Heavenly Ornaments", author: "Maulana Thanvi", coverColor: "#34607a", coverAccent: "#4e8aaa", price: "£11.99", rating: 4.7 },
      { title: "The Lawful & Prohibited", author: "Yusuf al-Qaradawi", coverColor: "#1e6a5a", coverAccent: "#2e9a7a", price: "£9.99", rating: 4.4 },
    ],
  },
  {
    name: "ইতিহাস ও সীরাত",
    nameEn: "History & Seerah",
    books: [
      { title: "The Sealed Nectar", author: "Safiur Rahman", coverColor: "#5a4a3a", coverAccent: "#8a6a4a", price: "£12.99", originalPrice: "£15.99", discount: "19%", rating: 4.9 },
      { title: "Stories of the Prophets", author: "Ibn Kathir", coverColor: "#2a5a6e", coverAccent: "#4a8aae", price: "£10.99", rating: 4.8 },
      { title: "Men Around the Messenger", author: "Khalid M. Khalid", coverColor: "#3a5a4e", coverAccent: "#5a8a6e", price: "£11.50", rating: 4.6 },
      { title: "The History of Islam", author: "Akbar Shah Khan", coverColor: "#2a4a6e", coverAccent: "#4a7aae", price: "£24.99", originalPrice: "£29.99", discount: "17%", rating: 4.5 },
    ],
  },
];

const BookCard = ({ book, index }: { book: Book; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.45, delay: index * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
    className="group cursor-pointer"
  >
    <div className="relative">
      {book.discount && (
        <div className="absolute top-3 left-3 z-10 bg-[hsl(var(--coral))] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
          {book.discount} OFF
        </div>
      )}
      <div
        className="aspect-[3/4] rounded-xl shadow-card group-hover:shadow-book group-hover:-translate-y-2 transition-all duration-500 flex items-center justify-center overflow-hidden relative"
        style={{ background: `linear-gradient(145deg, ${book.coverColor} 0%, ${book.coverAccent} 100%)` }}
      >
        {/* Decorative pattern overlay */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: `radial-gradient(circle at 30% 20%, white 1px, transparent 1px), radial-gradient(circle at 70% 80%, white 1px, transparent 1px)`,
          backgroundSize: '20px 20px'
        }} />
        
        {/* Book spine effect */}
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

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-3 group-hover:translate-y-0">
            <button className="px-5 py-2.5 bg-white text-foreground text-xs font-semibold rounded-lg shadow-lg hover:scale-105 transition-transform flex items-center gap-1.5">
              <ShoppingBag className="h-3.5 w-3.5" />
              View Details
            </button>
          </div>
        </div>
      </div>
    </div>
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
        {book.title}
      </h4>
      <p className="text-xs text-muted-foreground mt-1">{book.author}</p>
      {book.rating && (
        <div className="flex items-center gap-1 mt-1.5">
          <Star className="h-3 w-3 fill-[hsl(var(--gold))] text-[hsl(var(--gold))]" />
          <span className="text-xs font-medium text-foreground">{book.rating}</span>
        </div>
      )}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-sm font-bold text-primary">{book.price}</span>
        {book.originalPrice && (
          <span className="text-xs text-muted-foreground line-through">{book.originalPrice}</span>
        )}
      </div>
    </div>
  </motion.div>
);

const BookGrid = () => {
  return (
    <section className="py-20 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {categories.map((category, idx) => (
          <div key={category.name} className={`${idx > 0 ? "mt-20" : ""}`}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="flex items-end justify-between mb-10"
            >
              <div>
                <p className="text-xs font-medium tracking-widest uppercase text-primary mb-1.5">{category.nameEn}</p>
                <h2 className="font-serif text-3xl sm:text-4xl text-foreground">{category.name}</h2>
              </div>
              <button className="flex items-center gap-1 text-sm text-primary hover:text-accent transition-colors font-medium group/btn">
                সব দেখুন
                <ChevronRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </motion.div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8">
              {category.books.map((book, i) => (
                <BookCard key={book.title} book={book} index={i} />
              ))}
            </div>
          </div>
        ))}

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
      </div>
    </section>
  );
};

export default BookGrid;
