import { Search } from "lucide-react";
import { motion } from "framer-motion";
import GeometricPattern from "./GeometricPattern";

const HeroSection = () => {
  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden gradient-hero">
      <GeometricPattern />
      
      {/* Animated gradient orbs */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.25, 0.15] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-20 -left-32 w-96 h-96 rounded-full bg-sky-glow blur-3xl"
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.1, 0.2, 0.1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-20 -right-32 w-[500px] h-[500px] rounded-full bg-sky-light blur-3xl"
      />
      
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[hsl(207,68%,28%)]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm mb-8"
        >
          <div className="w-2 h-2 rounded-full bg-[hsl(var(--gold))] animate-pulse" />
          <span className="text-xs font-medium text-white/90 tracking-wide">A Digital Sanctuary of Islamic Scholarship</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
          className="font-serif text-5xl sm:text-6xl lg:text-7xl text-white leading-[1.08] mb-8"
        >
          Explore the Treasures{" "}
          <span className="relative">
            <em className="text-[hsl(var(--gold))]">of Knowledge</em>
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
              className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[hsl(var(--gold))] to-transparent origin-left"
            />
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
          className="text-white/70 text-lg max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          The ink of the scholar is holier than the blood of the martyr. Discover
          curated collections spanning centuries of Islamic thought, available for
          reading and UK-wide delivery.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
          className="max-w-2xl mx-auto"
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-white/10 rounded-2xl blur-lg group-focus-within:bg-white/20 transition-all duration-500" />
            <div className="relative bg-white/15 backdrop-blur-xl rounded-xl border border-white/25 group-focus-within:border-white/40 transition-all duration-500">
              <div className="flex items-center">
                <Search className="absolute left-5 h-5 w-5 text-white/50" />
                <input
                  type="text"
                  placeholder="Search by title, author, or category..."
                  className="w-full bg-transparent text-white placeholder:text-white/40 pl-14 pr-36 py-5 text-base focus:outline-none"
                />
                <button className="absolute right-3 px-6 py-2.5 bg-white text-[hsl(var(--sky-deep))] font-semibold text-sm rounded-lg hover:bg-white/90 hover:shadow-lg transition-all duration-300">
                  Search
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="flex flex-wrap justify-center gap-3 mt-8"
        >
          {["Quran", "Hadith", "Fiqh", "History", "Kids"].map((cat, i) => (
            <motion.span
              key={cat}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 + i * 0.05 }}
              className="px-5 py-2 text-xs tracking-wide font-medium border border-white/20 text-white/70 rounded-full hover:bg-white/15 hover:text-white hover:border-white/40 cursor-pointer transition-all duration-300 backdrop-blur-sm"
            >
              {cat}
            </motion.span>
          ))}
        </motion.div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 80V40C240 10 480 0 720 20C960 40 1200 50 1440 30V80H0Z" fill="hsl(210, 20%, 98%)" />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
