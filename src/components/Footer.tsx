import { BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-5 w-5 text-gold" />
              <span className="font-serif text-lg">Bayt al-Hikma</span>
            </div>
            <p className="text-sm text-primary-foreground/60 leading-relaxed">
              A curated digital sanctuary of Islamic scholarship for the UK community.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="tracking-meta text-gold mb-4">Library</h4>
            <ul className="space-y-2">
              {["Browse Books", "Categories", "New Arrivals", "Recommended"].map(
                (link) => (
                  <li key={link}>
                    <Link
                      to="/"
                      className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                    >
                      {link}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h4 className="tracking-meta text-gold mb-4">Community</h4>
            <ul className="space-y-2">
              {["UK Events", "Membership", "Scholars", "Contact"].map(
                (link) => (
                  <li key={link}>
                    <Link
                      to="/"
                      className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                    >
                      {link}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>

          <div>
            <h4 className="tracking-meta text-gold mb-4">Support</h4>
            <ul className="space-y-2">
              {["Shipping Info", "Returns", "FAQ", "Privacy Policy"].map(
                (link) => (
                  <li key={link}>
                    <Link
                      to="/"
                      className="text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors"
                    >
                      {link}
                    </Link>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-primary-foreground/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-primary-foreground/40">
            © 2026 Bayt al-Hikma. All rights reserved.
          </p>
          <p className="text-xs text-primary-foreground/40">
            Made with reverence for knowledge.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
