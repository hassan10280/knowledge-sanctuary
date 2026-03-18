import { motion } from "framer-motion";
import { Truck, BookOpen, Shield } from "lucide-react";

const features = [
  {
    icon: Truck,
    title: "UK Nationwide Shipping",
    description: "Free delivery on orders over £25. All physical copies shipped within 2-3 business days across the United Kingdom.",
  },
  {
    icon: BookOpen,
    title: "Digital Reader",
    description: "Read any book in our collection through our distraction-free digital reader. Optimised for long-form study.",
  },
  {
    icon: Shield,
    title: "Scholar Verified",
    description: "Every text in our collection is reviewed and recommended by recognised scholars of Islamic knowledge.",
  },
];

const FeaturesBar = () => {
  return (
    <section className="py-24 px-6 lg:px-8 border-b border-border">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
            className="text-center"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-5">
              <feature.icon className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-serif text-lg text-foreground mb-2">{feature.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default FeaturesBar;
