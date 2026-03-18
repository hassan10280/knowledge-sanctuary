import { motion } from "framer-motion";
import { BookOpen, ChevronRight } from "lucide-react";

interface Book {
  title: string;
  author: string;
  coverColor: string;
  price?: string;
  originalPrice?: string;
  discount?: string;
}

interface CategorySection {
  name: string;
  books: Book[];
}

const categories: CategorySection[] = [
  {
    name: "কুরআন ও তাফসীর",
    books: [
      { title: "Tafsir Ibn Kathir", author: "Ibn Kathir", coverColor: "#3d6b8e", price: "£18.99", originalPrice: "£24.99", discount: "24%" },
      { title: "Ma'ariful Quran", author: "Mufti Shafi Usmani", coverColor: "#2a6e5a", price: "£22.00" },
      { title: "Quran Word by Word", author: "Multiple Authors", coverColor: "#5a7d6e", price: "£12.99" },
      { title: "Tajweed Rules", author: "Imam Al-Jazari", coverColor: "#4a6b7e", price: "£8.50" },
    ],
  },
  {
    name: "হাদীস সংকলন",
    books: [
      { title: "Sahih al-Bukhari", author: "Imam al-Bukhari", coverColor: "#4a7d9e", price: "£28.00", originalPrice: "£35.00", discount: "20%" },
      { title: "Sahih Muslim", author: "Imam Muslim", coverColor: "#3a6d7e", price: "£26.00" },
      { title: "Riyad as-Salihin", author: "Imam an-Nawawi", coverColor: "#5a8d7e", price: "£14.99", originalPrice: "£18.99", discount: "21%" },
      { title: "Al-Muwatta", author: "Imam Malik", coverColor: "#4a7d6e", price: "£19.99" },
    ],
  },
  {
    name: "ফিকহ ও আইন",
    books: [
      { title: "Fiqh us-Sunnah", author: "Sayyid Sabiq", coverColor: "#6a8d7e", price: "£16.99" },
      { title: "Mukhtasar al-Quduri", author: "Imam al-Quduri", coverColor: "#4a6d8e", price: "£13.50", originalPrice: "£16.00", discount: "16%" },
      { title: "Heavenly Ornaments", author: "Maulana Thanvi", coverColor: "#5a7d9e", price: "£11.99" },
      { title: "The Lawful & Prohibited", author: "Yusuf al-Qaradawi", coverColor: "#3a8d6e", price: "£9.99" },
    ],
  },
  {
    name: "ইতিহাস ও সীরাত",
    books: [
      { title: "The Sealed Nectar", author: "Safiur Rahman", coverColor: "#7a6d5e", price: "£12.99", originalPrice: "£15.99", discount: "19%" },
      { title: "Stories of the Prophets", author: "Ibn Kathir", coverColor: "#5a6d7e", price: "£10.99" },
      { title: "Men Around the Messenger", author: "Khalid M. Khalid", coverColor: "#6a7d6e", price: "£11.50" },
      { title: "The History of Islam", author: "Akbar Shah Khan", coverColor: "#4a7d8e", price: "£24.99", originalPrice: "£29.99", discount: "17%" },
    ],
  },
];

const BookCard = ({ book }: { book: Book }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
    className="group cursor-pointer"
  >
    <div className="relative">
      {book.discount && (
        <div className="absolute top-2 left-2 z-10 bg-coral text-primary-foreground text-[10px] font-bold px-2 py-1 rounded-full">
          {book.discount} OFF
        </div>
      )}
      <div
        className="aspect-[3/4] rounded-lg shadow-card group-hover:shadow-book group-hover:-translate-y-1 transition-all duration-300 flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: book.coverColor }}
      >
        <div className="text-center px-4">
          <div className="w-10 h-[1px] bg-white/30 mx-auto mb-3" />
          <h4 className="font-serif text-white text-sm leading-tight">{book.title}</h4>
          <p className="text-white/50 text-[10px] mt-1.5">{book.author}</p>
          <div className="w-10 h-[1px] bg-white/30 mx-auto mt-3" />
        </div>
      </div>
    </div>
    <div className="mt-3">
      <h4 className="text-sm font-medium text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
        {book.title}
      </h4>
      <p className="text-xs text-muted-foreground mt-0.5">{book.author}</p>
      <div className="flex items-center gap-2 mt-1.5">
        <span className="text-sm font-semibold text-primary">{book.price}</span>
        {book.originalPrice && (
          <span className="text-xs text-muted-foreground line-through">{book.originalPrice}</span>
        )}
      </div>
    </div>
  </motion.div>
);

const BookGrid = () => {
  return (
    <section className="py-20 px-6 lg:px-8 max-w-7xl mx-auto">
      {categories.map((category, idx) => (
        <div key={category.name} className={`${idx > 0 ? "mt-16" : ""}`}>
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-serif text-2xl sm:text-3xl text-foreground">{category.name}</h2>
            <button className="flex items-center gap-1 text-sm text-primary hover:text-accent transition-colors font-medium">
              সব দেখুন
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
            {category.books.map((book) => (
              <BookCard key={book.title} book={book} />
            ))}
          </div>
        </div>
      ))}

      <div className="text-center mt-20">
        <button className="px-8 py-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-accent transition-all duration-300 font-serif text-lg flex items-center gap-2 mx-auto">
          <BookOpen className="h-5 w-5" />
          Browse the Full Archive →
        </button>
      </div>
    </section>
  );
};

export default BookGrid;
