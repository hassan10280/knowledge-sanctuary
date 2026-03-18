import { Link } from "react-router-dom";
import logo from "@/assets/logo.jpg";

const Footer = () => {
  return (
    <footer className="relative overflow-hidden">
      {/* Gradient top border */}
      <div className="h-1 bg-gradient-to-r from-[hsl(var(--sky-deep))] via-[hsl(var(--sky-glow))] to-[hsl(var(--sky-deep))]" />
      
      <div className="bg-[hsl(var(--sky-deep))] text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-1">
              <img src={logo} alt="MadrasahMatters" className="h-14 w-auto mb-4 brightness-0 invert" />
              <p className="text-sm text-white/50 leading-relaxed">
                A curated digital sanctuary of Islamic scholarship for the UK community.
              </p>
            </div>

            <div>
              <h4 className="tracking-meta text-white/70 mb-4">Library</h4>
              <ul className="space-y-2.5">
                {["Browse Books", "Categories", "New Arrivals", "Recommended"].map((link) => (
                  <li key={link}>
                    <Link to="/" className="text-sm text-white/45 hover:text-white transition-colors duration-300">{link}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="tracking-meta text-white/70 mb-4">Community</h4>
              <ul className="space-y-2.5">
                {["UK Events", "Membership", "Scholars", "Contact"].map((link) => (
                  <li key={link}>
                    <Link to="/" className="text-sm text-white/45 hover:text-white transition-colors duration-300">{link}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="tracking-meta text-white/70 mb-4">Support</h4>
              <ul className="space-y-2.5">
                {["Shipping Info", "Returns", "FAQ", "Privacy Policy"].map((link) => (
                  <li key={link}>
                    <Link to="/" className="text-sm text-white/45 hover:text-white transition-colors duration-300">{link}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-white/30">© 2026 MadrasahMatters. All rights reserved.</p>
            <p className="text-xs text-white/30">Made with reverence for knowledge.</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
