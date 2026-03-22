import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, LogOut, User, Shield, ShoppingCart, Building2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ProfileDropdown from "@/components/ProfileDropdown";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/contexts/CartContext";
import logoHeader from "@/assets/logo-header.png";

type NavLink = {
  label: string;
  href: string;
  children?: NavLink[];
};

/* ── Desktop dropdown for nested links ── */
const DesktopNavItem = ({ link }: { link: NavLink }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasChildren = link.children && link.children.length > 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!hasChildren) {
    return (
      <Link to={link.href}
        className="text-sm font-medium text-white/75 hover:text-white transition-colors duration-300 relative group">
        {link.label}
        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[hsl(var(--gold))] rounded-full group-hover:w-full transition-all duration-300" />
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative"
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className="flex items-center gap-1 text-sm font-medium text-white/75 hover:text-white transition-colors duration-300"
        onClick={() => setOpen(!open)}>
        {link.label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="absolute top-full left-0 mt-2 min-w-[200px] bg-[hsl(207,68%,22%)] border border-white/10 rounded-lg shadow-xl backdrop-blur-xl z-50">
            {link.children!.map((child, ci) => (
              <DropdownItem key={ci} link={child} depth={1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DropdownItem = ({ link, depth }: { link: NavLink; depth: number }) => {
  const [open, setOpen] = useState(false);
  const hasChildren = link.children && link.children.length > 0;

  if (!hasChildren) {
    return (
      <Link to={link.href}
        className="block px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors first:rounded-t-lg last:rounded-b-lg">
        {link.label}
      </Link>
    );
  }

  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        onClick={() => setOpen(!open)}>
        {link.label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "-rotate-90" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, x: 4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 4 }}
            className="absolute left-full top-0 ml-1 min-w-[180px] bg-[hsl(207,68%,20%)] border border-white/10 rounded-lg shadow-xl z-50">
            {link.children!.map((child, ci) => (
              <DropdownItem key={ci} link={child} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Mobile nested links (accordion style) ── */
const MobileNavItem = ({ link, depth, onClose }: { link: NavLink; depth: number; onClose: () => void }) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = link.children && link.children.length > 0;

  if (!hasChildren) {
    return (
      <Link to={link.href}
        className="block text-sm font-medium text-white/70 hover:text-white py-2 transition-colors"
        style={{ paddingLeft: `${depth * 16}px` }}
        onClick={onClose}>
        {link.label}
      </Link>
    );
  }

  return (
    <div>
      <button className="w-full flex items-center justify-between text-sm font-medium text-white/70 hover:text-white py-2 transition-colors"
        style={{ paddingLeft: `${depth * 16}px` }}
        onClick={() => setExpanded(!expanded)}>
        {link.label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            {link.children!.map((child, ci) => (
              <MobileNavItem key={ci} link={child} depth={depth + 1} onClose={onClose} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const { data: settings } = useSiteSettings("header");
  const { user, isAdmin, loading, signOut } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const get = (key: string, fallback: any) => {
    const setting = settings?.find((item) => item.key === key);
    return setting?.value ?? fallback;
  };

  const navLinks = get("nav_links", [
    { label: "Home", href: "/" },
    { label: "Browse Books", href: "/browse" },
    { label: "Categories", href: "/categories" },
    { label: "Membership", href: "/membership" },
    { label: "Contact", href: "/contact" },
  ]) as NavLink[];

  // Use logo_size_px (number) saved from admin, fallback to 56
  const logoSizePx = get("logo_size_px", 56) as number;
  const logoHeight = typeof logoSizePx === "number" ? `${logoSizePx}px` : "56px";

  const logoUrlSetting = settings?.find((item) => item.key === "logo_url");
  const rawLogoUrl = typeof logoUrlSetting?.value === "string" ? logoUrlSetting.value.trim() : "";
  const logoVersion = logoUrlSetting?.updated_at ? encodeURIComponent(logoUrlSetting.updated_at) : "local";
  const logoSrc = rawLogoUrl
    ? `${rawLogoUrl}${rawLogoUrl.includes("?") ? "&" : "?"}v=${logoVersion}`
    : logoHeader;

  useEffect(() => {
    setLogoLoadFailed(false);
  }, [logoSrc]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setMobileOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        !isHomePage || scrolled
          ? "bg-[hsl(207,68%,28%)]/95 backdrop-blur-xl shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 sm:h-24 gap-3 sm:gap-6">
          <Link to="/" className="flex items-center shrink-0 min-w-0">
            <img
              src={logoLoadFailed ? logoHeader : logoSrc}
              alt="Madrasah Matters"
              style={{ height: logoHeight }}
              className="w-auto max-w-[160px] sm:max-w-[220px] object-contain"
              onError={() => setLogoLoadFailed(true)}
            />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link, i) => (
              <DesktopNavItem key={i} link={link} />
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/auth?intent=wholesale"
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
                  <div className="hidden sm:flex items-center">
                    <ProfileDropdown />
                  </div>
                ) : (
                  <div className="hidden sm:flex items-center gap-2">
                    <Link to="/auth" className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors">
                      <LogOut className="h-4 w-4" /> Log In
                    </Link>
                    <Link to="/auth?intent=signup" className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold bg-white/15 text-white border border-white/25 rounded-lg hover:bg-white/25 transition-all duration-300 backdrop-blur-sm">
                      <User className="h-4 w-4" /> Sign Up
                    </Link>
                  </div>
                )}
              </>
            )}

            <button className="md:hidden p-2 text-white/90" onClick={() => setMobileOpen(!mobileOpen)}>
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
            <div className="px-6 py-4 space-y-1">
              {navLinks.map((link, i) => (
                <MobileNavItem key={i} link={link} depth={0} onClose={() => setMobileOpen(false)} />
              ))}

              <Link to="/auth?intent=wholesale"
                className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--gold))] py-2 transition-colors"
                onClick={() => setMobileOpen(false)}>
                <Building2 className="h-4 w-4" /> Register as Wholesale
              </Link>

              <div className="border-t border-white/10 pt-3 space-y-2">
                {!loading && (
                  <>
                    {user ? (
                      <>
                        <p className="text-xs text-white/40 truncate">{user.email}</p>
                        <Link to="/profile" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-white/10 text-white border border-white/20 rounded-lg"
                          onClick={() => setMobileOpen(false)}>
                          <User className="h-4 w-4" /> My Profile
                        </Link>
                        {isAdmin && (
                          <Link to="/admin" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] border border-[hsl(var(--gold))]/30 rounded-lg"
                            onClick={() => setMobileOpen(false)}>
                            <Shield className="h-4 w-4" /> Admin Panel
                          </Link>
                        )}
                        <button onClick={handleSignOut}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-white/10 text-white border border-white/20 rounded-lg">
                          <LogOut className="h-4 w-4" /> Logout
                        </button>
                      </>
                    ) : (
                      <>
                        <Link to="/auth" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-white/15 text-white border border-white/25 rounded-lg backdrop-blur-sm"
                          onClick={() => setMobileOpen(false)}>
                          <LogOut className="h-4 w-4" /> Log In
                        </Link>
                        <Link to="/auth?intent=signup" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-white text-[hsl(var(--sky-deep))] rounded-lg hover:bg-white/90 transition-all"
                          onClick={() => setMobileOpen(false)}>
                          <User className="h-4 w-4" /> Create Account
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
