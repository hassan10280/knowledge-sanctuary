import { motion } from "framer-motion";
import { MapPin, Calendar, ArrowRight, Sparkles } from "lucide-react";

const events = [
  { title: "Understanding the Maqasid al-Shariah", date: "28 March 2026", location: "East London Mosque", type: "Seminar", accent: "sky" },
  { title: "Hadith Sciences: A Beginner's Journey", date: "5 April 2026", location: "Islamic Centre, Birmingham", type: "Workshop", accent: "mint" },
  { title: "Children's Quran Recitation Evening", date: "12 April 2026", location: "Manchester Central Mosque", type: "Community", accent: "gold" },
];

const accentStyles: Record<string, { dot: string; tag: string }> = {
  sky: { dot: "bg-[hsl(var(--sky))]", tag: "text-[hsl(var(--sky-deep))] bg-[hsl(var(--sky-pale))]" },
  mint: { dot: "bg-[hsl(var(--mint))]", tag: "text-[hsl(var(--mint))] bg-[hsl(var(--mint-light))]" },
  gold: { dot: "bg-[hsl(var(--gold))]", tag: "text-[hsl(36,75%,40%)] bg-[hsl(var(--gold-light))]" },
};

const LocalEvents = () => {
  return (
    <section className="py-32 px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 gradient-section" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      
      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(var(--sky-pale))] mb-5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary tracking-wide">UK Community</span>
          </div>
          <h2 className="font-serif text-4xl sm:text-5xl text-foreground">Local Events & Seminars</h2>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">Join fellow seekers of knowledge at events across the United Kingdom</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {events.map((event, i) => {
            const style = accentStyles[event.accent];
            return (
              <motion.div
                key={event.title}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
                className="bg-card border border-border rounded-2xl p-8 hover:shadow-card-hover hover:border-primary/20 transition-all duration-500 group relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--sky-glow))] to-primary opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-2 h-2 rounded-full ${style.dot}`} />
                  <span className={`text-[11px] font-semibold tracking-wider uppercase px-3 py-1 rounded-full ${style.tag}`}>{event.type}</span>
                </div>
                <h3 className="font-serif text-xl text-foreground mb-5 leading-snug group-hover:text-primary transition-colors duration-300">{event.title}</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-3"><Calendar className="h-4 w-4 text-primary/60" />{event.date}</div>
                  <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-primary/60" />{event.location}</div>
                </div>
                <button className="mt-8 flex items-center gap-2 text-sm font-semibold text-primary group-hover:gap-3 transition-all duration-300">
                  Learn more <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LocalEvents;
