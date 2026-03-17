import { motion } from "framer-motion";
import { MapPin, Calendar, ArrowRight } from "lucide-react";

const events = [
  {
    title: "Understanding the Maqasid al-Shariah",
    date: "28 March 2026",
    location: "East London Mosque",
    type: "Seminar",
  },
  {
    title: "Hadith Sciences: A Beginner's Journey",
    date: "5 April 2026",
    location: "Islamic Centre, Birmingham",
    type: "Workshop",
  },
  {
    title: "Children's Quran Recitation Evening",
    date: "12 April 2026",
    location: "Manchester Central Mosque",
    type: "Community",
  },
];

const LocalEvents = () => {
  return (
    <section className="py-32 px-6 lg:px-8 bg-sand-dark">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="tracking-meta text-gold mb-4">UK Community</p>
          <h2 className="font-serif text-4xl sm:text-5xl text-foreground">
            Local Events & Seminars
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {events.map((event, i) => (
            <motion.div
              key={event.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: i * 0.08,
                ease: [0.2, 0.8, 0.2, 1],
              }}
              className="bg-card border border-border rounded-lg p-8 hover:border-gold transition-all duration-500 group"
            >
              <span className="tracking-meta text-gold">{event.type}</span>
              <h3 className="font-serif text-xl text-foreground mt-3 mb-4 leading-snug">
                {event.title}
              </h3>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {event.date}
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  {event.location}
                </div>
              </div>

              <button className="mt-6 flex items-center gap-2 text-sm font-medium text-primary group-hover:text-gold transition-colors">
                Learn more
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LocalEvents;
