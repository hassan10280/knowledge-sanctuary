import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, Menu, X, User, LogOut, Shield, ShoppingCart, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import logoWhite from "@/assets/logo-white.png";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { data: settings } = useSiteSettings("header");
  const { user, isAdmin, loading, signOut } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setMobileOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[hsl(207,68%,28%)]/95 backdrop-blur-xl shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 sm:h-24">
          <Link to="/" className="flex items-center">
            <img
              src={logoUrl || logoWhite}
              alt="Madrasah Matters"
              className={`${logoSize} w-auto`}
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

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Wholesale button */}
            <Link
              to="/wholesale/apply"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))] border border-[hsl(var(--gold))]/25 rounded-lg hover:bg-[hsl(var(--gold))]/25 transition-all"
            >
              <Building2 className="h-3.5 w-3.5" />
              Wholesale
            </Link>

            <Link to="/cart" className="relative p-2 text-white/80 hover:text-white transition-colors duration-200">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[hsl(var(--coral))] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>

            {!loading && (
              <>
                {user ? (
                  <div className="hidden sm:flex items-center gap-2">
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] border border-[hsl(var(--gold))]/30 rounded-lg hover:bg-[hsl(var(--gold))]/30 transition-all"
                      >
                        <Shield className="h-3.5 w-3.5" />
                        Admin
                      </Link>
                    )}
                    <span className="text-xs text-white/50 max-w-[120px] truncate hidden lg:block">
                      {user.email}
                    </span>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white/10 text-white border border-white/20 rounded-lg hover:bg-white/20 transition-all"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="hidden sm:flex items-center gap-2">
                    <Link
                      to="/auth"
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Log In
                    </Link>
                    <Link
                      to="/auth"
                      className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold bg-white/15 text-white border border-white/25 rounded-lg hover:bg-white/25 transition-all duration-300 backdrop-blur-sm"
                    >
                      <User className="h-4 w-4" />
                      Sign Up
                    </Link>
                  </div>
                )}
              </>
            )}

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

              <Link
                to="/wholesale/apply"
                className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--gold))] py-2 transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                <Building2 className="h-4 w-4" />
                Register as Wholesale
              </Link>

              <div className="border-t border-white/10 pt-3 space-y-2">
                {!loading && (
                  <>
                    {user ? (
                      <>
                        <p className="text-xs text-white/40 truncate">{user.email}</p>
                        {isAdmin && (
                          <Link
                            to="/admin"
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] border border-[hsl(var(--gold))]/30 rounded-lg"
                            onClick={() => setMobileOpen(false)}
                          >
                            <Shield className="h-4 w-4" />
                            Admin Panel
                          </Link>
                        )}
                        <button
                          onClick={handleSignOut}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-white/10 text-white border border-white/20 rounded-lg"
                        >
                          <LogOut className="h-4 w-4" />
                          Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/auth"
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-white/15 text-white border border-white/25 rounded-lg backdrop-blur-sm"
                          onClick={() => setMobileOpen(false)}
                        >
                          <LogOut className="h-4 w-4" />
                          Log In
                        </Link>
                        <Link
                          to="/auth"
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-white text-[hsl(var(--sky-deep))] rounded-lg hover:bg-white/90 transition-all"
                          onClick={() => setMobileOpen(false)}
                        >
                          <User className="h-4 w-4" />
                          Create Account
                        </Link>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
