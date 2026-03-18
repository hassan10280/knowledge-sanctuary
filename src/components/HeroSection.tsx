import { Search } from "lucide-react";
import { motion } from "framer-motion";
import GeometricPattern from "./GeometricPattern";

const HeroSection = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-primary">
      <GeometricPattern />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/50 to-primary" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="tracking-meta text-primary-foreground/80 mb-6"
        >
          A Digital Sanctuary of Islamic Scholarship
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }}
          className="font-serif text-5xl sm:text-6xl lg:text-7xl text-primary-foreground leading-[1.1] mb-8"
        >
          Explore the Treasures{" "}
          <em className="text-foreground">of Knowledge</em>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          className="text-primary-foreground/70 text-lg max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          The ink of the scholar is holier than the blood of the martyr. Discover
          curated collections spanning centuries of Islamic thought, available for
          reading and UK-wide delivery.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
          className="max-w-2xl mx-auto"
        >
          <div className="relative group">
            <div className="absolute inset-0 bg-primary-foreground/10 rounded-lg backdrop-blur-xl border border-primary-foreground/20 group-focus-within:border-primary-foreground/40 transition-colors duration-500" />
            <div className="relative flex items-center">
              <Search className="absolute left-5 h-5 w-5 text-primary-foreground/50" />
              <input
                type="text"
                placeholder="Search by title, author, or category..."
                className="w-full bg-transparent text-primary-foreground placeholder:text-primary-foreground/40 pl-14 pr-36 py-5 text-base focus:outline-none"
              />
              <button className="absolute right-3 px-6 py-2.5 bg-accent text-accent-foreground font-medium text-sm rounded-md hover:brightness-110 transition-all duration-300">
                Search
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex flex-wrap justify-center gap-3 mt-8"
        >
          {["Quran", "Hadith", "Fiqh", "History", "Kids"].map((cat) => (
            <span
              key={cat}
              className="px-4 py-1.5 text-xs tracking-meta border border-primary-foreground/20 text-primary-foreground/60 rounded-full hover:border-primary-foreground/50 hover:text-primary-foreground cursor-pointer transition-all duration-300"
            >
              {cat}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
