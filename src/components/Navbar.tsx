import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Menu, X, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import logoWhite from "@/assets/logo-white.png";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: settings } = useSiteSettings("header");

  const get = (key: string, fallback: any) => {
    const s = settings?.find((s) => s.key === key);
    return s?.value ?? fallback;
  };

  const navLinks = get("nav_links", [
    { label: "Home", href: "/" },
    { label: "Browse Books", href: "/browse" },
    { label: "Categories", href: "/categories" },
    { label: "Membership", href: "/membership" },
    { label: "Contact", href: "/contact" },
  ]) as Array<{ label: string; href: string }>;

  const logoSize = get("logo_size", "h-14 sm:h-16") as string;
  const logoUrl = get("logo_url", null) as string | null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 sm:h-24">
          <Link to="/" className="flex items-center">
            <img
              src={logoUrl || logoWhite}
              alt="Madrasah Matters"
              className={`${logoSize} w-auto ${!logoUrl ? '' : ''}`}
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

          <div className="flex items-center gap-5">
            <button className="p-2 text-white/80 hover:text-white transition-colors duration-200">
              <Search className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <button className="hidden sm:flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-white/15 text-white border border-white/25 rounded-lg hover:bg-white/25 transition-all duration-300 backdrop-blur-sm">
              <User className="h-4 w-4" />
              Sign In
            </button>
            <button
              className="md:hidden p-2 text-white/90"
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
