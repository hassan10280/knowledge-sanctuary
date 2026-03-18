import { motion } from "framer-motion";
import { Truck, BookOpen, Shield } from "lucide-react";

const features = [
  {
    icon: Truck,
    title: "UK Nationwide Shipping",
    description: "Free delivery on orders over £25. All physical copies shipped within 2-3 business days across the United Kingdom.",
    gradient: "from-[hsl(var(--sky))] to-[hsl(var(--sky-deep))]",
    iconBg: "bg-[hsl(var(--sky-pale))]",
    iconColor: "text-[hsl(var(--sky-deep))]",
  },
  {
    icon: BookOpen,
    title: "Digital Reader",
    description: "Read any book in our collection through our distraction-free digital reader. Optimised for long-form study.",
    gradient: "from-[hsl(var(--mint))] to-[hsl(160,50%,32%)]",
    iconBg: "bg-[hsl(var(--mint-light))]",
    iconColor: "text-[hsl(var(--mint))]",
  },
  {
    icon: Shield,
    title: "Scholar Verified",
    description: "Every text in our collection is reviewed and recommended by recognised scholars of Islamic knowledge.",
    gradient: "from-[hsl(var(--gold))] to-[hsl(36,75%,45%)]",
    iconBg: "bg-[hsl(var(--gold-light))]",
    iconColor: "text-[hsl(36,75%,45%)]",
  },
];

const FeaturesBar = () => {
  return (
    <section className="py-24 px-6 lg:px-8 -mt-8 relative z-10">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
            className="group relative bg-card rounded-2xl p-8 shadow-card hover:shadow-card-hover transition-all duration-500 border border-border hover:border-primary/20 overflow-hidden"
          >
            {/* Subtle gradient accent on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />
            
            <div className="relative">
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl ${feature.iconBg} mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className={`h-6 w-6 ${feature.iconColor}`} />
              </div>
              <h3 className="font-serif text-xl text-foreground mb-3">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default FeaturesBar;
