import { useState } from "react";
import { Filter, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const languages = ["English", "Arabic", "Urdu", "Bengali"];
const categories = ["Quran", "Hadith", "Fiqh", "History", "Kids"];

const FilterSidebar = () => {
  const [open, setOpen] = useState(false);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  const toggleLang = (lang: string) =>
    setSelectedLangs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );

  const toggleCat = (cat: string) =>
    setSelectedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <Filter className="h-4 w-4" />
        Filters
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {(open || true) && (
          <motion.aside
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`${open ? "block" : "hidden"} lg:block w-full lg:w-64 shrink-0`}
          >
            <div className="sticky top-24 space-y-8">
              <div>
                <h3 className="tracking-meta text-muted-foreground mb-4">Language</h3>
                <div className="space-y-2">
                  {languages.map((lang) => (
                    <label
                      key={lang}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div
                        className={`w-4 h-4 rounded-sm border transition-all duration-300 flex items-center justify-center ${
                          selectedLangs.includes(lang)
                            ? "bg-primary border-primary"
                            : "border-border group-hover:border-muted-foreground"
                        }`}
                      >
                        {selectedLangs.includes(lang) && (
                          <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-foreground">{lang}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border" />

              <div>
                <h3 className="tracking-meta text-muted-foreground mb-4">Category</h3>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <label
                      key={cat}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div
                        className={`w-4 h-4 rounded-sm border transition-all duration-300 flex items-center justify-center ${
                          selectedCats.includes(cat)
                            ? "bg-primary border-primary"
                            : "border-border group-hover:border-muted-foreground"
                        }`}
                      >
                        {selectedCats.includes(cat) && (
                          <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm text-foreground">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border" />

              <div>
                <h3 className="tracking-meta text-muted-foreground mb-4">Format</h3>
                <div className="flex gap-2">
                  <span className="px-3 py-1.5 text-xs border border-border rounded-md cursor-pointer hover:border-gold hover:text-gold transition-all">
                    Digital
                  </span>
                  <span className="px-3 py-1.5 text-xs border border-border rounded-md cursor-pointer hover:border-gold hover:text-gold transition-all">
                    Physical
                  </span>
                </div>
              </div>

              <button className="w-full py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-emerald-darker transition-colors">
                Apply Filters
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default FilterSidebar;
