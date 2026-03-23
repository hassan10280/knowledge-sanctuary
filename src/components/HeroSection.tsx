import { useState } from "react";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import GeometricPattern from "./GeometricPattern";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface HeroSectionProps {
  onSearch?: (query: string) => void;
}

const HeroSection = ({ onSearch }: HeroSectionProps) => {
  const { data: settings } = useSiteSettings("hero");
  const [query, setQuery] = useState("");

  const get = (key: string, fallback: string) => {
    const s = settings?.find((s) => s.key === key);
    return (s?.value as string) ?? fallback;
  };

  const getNum = (key: string, fallback: number) => {
    const s = settings?.find((s) => s.key === key);
    return typeof s?.value === "number" ? s.value : fallback;
  };

  const getArr = (key: string, fallback: string[]) => {
    const s = settings?.find((s) => s.key === key);
    return (s?.value as string[]) ?? fallback;
  };

  const badgeText = get("badge_text", "A Digital Sanctuary of Islamic Scholarship");
  const title = get("title", "Explore the Treasures");
  const titleAccent = get("title_accent", "of Knowledge");
  const description = get("description", "The ink of the scholar is holier than the blood of the martyr. Discover curated collections spanning centuries of Islamic thought, available for reading and UK-wide delivery.");
  const searchPlaceholder = get("search_placeholder", "Search by title, author, or category...");
  const cats = getArr("categories", ["Quran", "Hadith", "Fiqh", "History", "Kids"]);

  // Dynamic image settings
  const heroImageUrl = get("hero_image_url", "");
  const heroImageFit = get("hero_image_fit", "cover") as React.CSSProperties["objectFit"];
  const heroImageWidth = getNum("hero_image_width", 100);
  const heroImageHeight = getNum("hero_image_height", 600);

  // Dynamic spacing
  const paddingTop = getNum("hero_padding_top", 0);
  const paddingBottom = getNum("hero_padding_bottom", 0);
  const paddingLeft = getNum("hero_padding_left", 0);
  const paddingRight = getNum("hero_padding_right", 0);
  const marginTop = getNum("hero_margin_top", 0);
  const marginBottom = getNum("hero_margin_bottom", 0);

  const handleSearch = () => {
    onSearch?.(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <section
      className="relative flex items-center justify-center overflow-hidden gradient-hero"
      style={{
        minHeight: heroImageUrl ? `${heroImageHeight}px` : "92vh",
        paddingTop: paddingTop ? `${paddingTop}px` : undefined,
        paddingBottom: paddingBottom ? `${paddingBottom}px` : undefined,
        paddingLeft: paddingLeft ? `${paddingLeft}px` : undefined,
        paddingRight: paddingRight ? `${paddingRight}px` : undefined,
        marginTop: marginTop ? `${marginTop}px` : undefined,
        marginBottom: marginBottom ? `${marginBottom}px` : undefined,
      }}
    >
      {/* Background image from admin */}
      {heroImageUrl && (
        <div
          className="absolute inset-0 z-0"
          style={{ width: `${heroImageWidth}%`, margin: heroImageWidth < 100 ? "0 auto" : undefined }}
        >
          <img
            src={heroImageUrl}
            alt="Hero background"
            className="w-full h-full"
            style={{ objectFit: heroImageFit }}
          />
          <div className="absolute inset-0 bg-[hsl(207,68%,28%)]/60" />
        </div>
      )}

      {!heroImageUrl && <GeometricPattern />}
      
      {!heroImageUrl && (
        <>
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
        </>
      )}
      
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[hsl(207,68%,28%)]" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm mb-8"
        >
          <div className="w-2 h-2 rounded-full bg-[hsl(var(--gold))] animate-pulse" />
          <span className="text-xs font-medium text-white/90 tracking-wide">{badgeText}</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
          className="font-serif text-5xl sm:text-6xl lg:text-7xl text-white leading-[1.08] mb-8"
        >
          {title}{" "}
          <span className="relative">
            <em className="text-[hsl(var(--gold))]">{titleAccent}</em>
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
          {description}
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
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-white placeholder:text-white/40 pl-14 pr-36 py-5 text-base focus:outline-none"
                />
                <button
                  onClick={handleSearch}
                  className="absolute right-3 px-6 py-2.5 bg-white text-[hsl(var(--sky-deep))] font-semibold text-sm rounded-lg hover:bg-white/90 hover:shadow-lg transition-all duration-300"
                >
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
          {cats.map((cat: string, i: number) => (
            <motion.span
              key={cat}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.6 + i * 0.05 }}
              onClick={() => { setQuery(cat); onSearch?.(cat); }}
              className="px-5 py-2 text-xs tracking-wide font-medium border border-white/20 text-white/70 rounded-full hover:bg-white/15 hover:text-white hover:border-white/40 cursor-pointer transition-all duration-300 backdrop-blur-sm"
            >
              {cat}
            </motion.span>
          ))}
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 80V40C240 10 480 0 720 20C960 40 1200 50 1440 30V80H0Z" fill="hsl(210, 20%, 98%)" />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
