import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Menu, X, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.jpg";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Browse Books", href: "/browse" },
  { label: "Categories", href: "/categories" },
  { label: "Membership", href: "/membership" },
  { label: "Contact", href: "/contact" },
];

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-[hsl(207,68%,28%)] via-[hsl(207,58%,38%)] to-[hsl(207,68%,32%)] backdrop-blur-xl border-b border-white/10 shadow-lg shadow-[hsl(207,68%,20%)]/30">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logo}
              alt="MadrasahMatters"
              className="h-14 w-auto rounded-lg brightness-150 contrast-90 saturate-150 hue-rotate-[10deg] drop-shadow-lg"
              style={{
                filter: "brightness(1.6) contrast(0.9) saturate(1.4) hue-rotate(10deg) drop-shadow(0 2px 8px rgba(255,255,255,0.2))"
              }}
            />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="text-sm font-medium text-white/75 hover:text-white transition-colors duration-300 relative group"
              >
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[hsl(var(--gold))] rounded-full group-hover:w-full transition-all duration-300" />
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200">
              <Search className="h-5 w-5" />
            </button>
            <button className="hidden sm:flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-white/15 text-white border border-white/25 rounded-lg hover:bg-white/25 hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
              <User className="h-4 w-4" />
              Sign In
            </button>
            <button
              className="md:hidden p-2 text-white/80"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/10 bg-[hsl(207,68%,28%)]/95 backdrop-blur-xl"
          >
            <div className="px-6 py-4 space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="block text-sm font-medium text-white/70 hover:text-white py-2 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-white/15 text-white border border-white/25 rounded-lg backdrop-blur-sm">
                <User className="h-4 w-4" />
                Sign In
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
