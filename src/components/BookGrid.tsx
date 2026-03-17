import BookCard from "./BookCard";

const books = [
  {
    title: "Sahih al-Bukhari",
    author: "Imam al-Bukhari",
    category: "Hadith",
    language: "Arabic",
    coverColor: "#064E3B",
    featured: true,
    hasPhysical: true,
  },
  {
    title: "Al-Muwatta",
    author: "Imam Malik",
    category: "Hadith",
    language: "Arabic",
    coverColor: "#1a3a2a",
    hasPhysical: true,
  },
  {
    title: "The Sealed Nectar",
    author: "Safiur Rahman",
    category: "History",
    language: "English",
    coverColor: "#4a3728",
    hasPhysical: true,
  },
  {
    title: "Riyad as-Salihin",
    author: "Imam an-Nawawi",
    category: "Hadith",
    language: "English",
    coverColor: "#2d4a3e",
    hasPhysical: false,
  },
  {
    title: "Tafsir Ibn Kathir",
    author: "Ibn Kathir",
    category: "Quran",
    language: "Arabic",
    coverColor: "#3d2b1f",
    featured: true,
    hasPhysical: true,
  },
  {
    title: "Fiqh us-Sunnah",
    author: "Sayyid Sabiq",
    category: "Fiqh",
    language: "English",
    coverColor: "#1e3a5f",
    hasPhysical: true,
  },
  {
    title: "Stories of the Prophets",
    author: "Ibn Kathir",
    category: "Kids",
    language: "English",
    coverColor: "#5c4033",
    hasPhysical: true,
  },
  {
    title: "Mukhtasar al-Quduri",
    author: "Imam al-Quduri",
    category: "Fiqh",
    language: "Urdu",
    coverColor: "#2e4a3d",
    hasPhysical: false,
  },
];

const BookGrid = () => {
  return (
    <section className="py-32 px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <p className="tracking-meta text-gold mb-4">Curated Collection</p>
        <h2 className="font-serif text-4xl sm:text-5xl text-foreground">
          Featured Books
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {books.map((book) => (
          <BookCard key={book.title} {...book} />
        ))}
      </div>

      <div className="text-center mt-16">
        <button className="px-8 py-4 border border-border text-foreground font-medium rounded-md hover:border-gold hover:text-gold transition-all duration-500 font-serif text-lg">
          Browse the Full Archive →
        </button>
      </div>
    </section>
  );
};

export default BookGrid;
