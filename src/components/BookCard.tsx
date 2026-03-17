import { motion } from "framer-motion";
import { BookOpen, Truck } from "lucide-react";

interface BookCardProps {
  title: string;
  author: string;
  category: string;
  language: string;
  coverColor: string;
  featured?: boolean;
  hasPhysical?: boolean;
}

const BookCard = ({
  title,
  author,
  category,
  language,
  coverColor,
  featured = false,
  hasPhysical = false,
}: BookCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
      className={`group relative bg-card border border-border hover:border-gold transition-all duration-500 rounded-lg overflow-hidden ${
        featured ? "col-span-1 md:col-span-2" : ""
      }`}
    >
      {/* UK Shipping Badge */}
      {hasPhysical && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-2.5 py-1 border border-dashed border-gold rounded-full bg-background/80 backdrop-blur-sm">
          <Truck className="h-3 w-3 text-gold" />
          <span className="text-[10px] tracking-meta text-gold">UK Shipping</span>
        </div>
      )}

      {/* Book Cover */}
      <div className="relative p-6 pb-0">
        <div
          className={`aspect-[3/4] rounded-t-md shadow-book group-hover:-translate-y-2 transition-transform duration-500 flex items-center justify-center ${
            featured ? "max-w-[280px] mx-auto" : ""
          }`}
          style={{ backgroundColor: coverColor }}
        >
          <div className="text-center px-6">
            <div className="w-16 h-[1px] bg-primary-foreground/30 mx-auto mb-4" />
            <h3 className="font-serif text-primary-foreground text-lg leading-tight">
              {title}
            </h3>
            <p className="text-primary-foreground/60 text-xs mt-2">{author}</p>
            <div className="w-16 h-[1px] bg-primary-foreground/30 mx-auto mt-4" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-6">
        <h3 className="font-serif text-xl text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="tracking-meta text-muted-foreground mt-1">{author}</p>

        <div className="flex items-center gap-3 mt-4">
          <span className="px-2 py-0.5 text-[10px] tracking-meta border border-border rounded text-muted-foreground">
            {category}
          </span>
          <span className="px-2 py-0.5 text-[10px] tracking-meta border border-border rounded text-muted-foreground">
            {language}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-5">
          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-emerald-darker transition-all duration-300">
            <BookOpen className="h-4 w-4" />
            Read Now
          </button>
          <button className="px-4 py-2.5 border border-border text-sm font-medium text-foreground rounded-md hover:border-gold hover:text-gold transition-all duration-300">
            Acquire
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default BookCard;
