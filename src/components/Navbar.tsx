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
        className="text-[13px] font-medium text-white/80 hover:text-white transition-colors duration-200 relative group whitespace-nowrap tracking-wide">
        {link.label}
        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[hsl(var(--gold))] rounded-full group-hover:w-full transition-all duration-300" />
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative"
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className="flex items-center gap-1 text-[13px] font-medium text-white/80 hover:text-white transition-colors duration-200 whitespace-nowrap tracking-wide"
        onClick={() => setOpen(!open)}>
        {link.label}
        <ChevronDown className={`h-3 w-3 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
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
        className={`block font-medium text-[hsl(207,68%,28%)] hover:text-[hsl(207,68%,20%)] hover:bg-slate-50 transition-all duration-200 rounded-lg ${
          depth === 0 ? "text-[15px] py-4 px-6" : "text-[13px] py-3 pl-10 pr-6 border-l-2 border-slate-200 ml-6"
        }`}
        onClick={onClose}>
        {link.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        className="w-full flex items-center justify-between text-[15px] font-semibold text-white/90 hover:text-white py-4 px-6 hover:bg-white/[0.06] rounded-lg transition-all duration-200"
        onClick={() => setExpanded(!expanded)}>
        {link.label}
        <ChevronDown className={`h-4 w-4 text-white/50 transition-transform duration-300 ease-in-out ${expanded ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden">
            <div className="pb-1">
              {link.children!.map((child, ci) => (
                <MobileNavItem key={ci} link={child} depth={depth + 1} onClose={onClose} />
              ))}
            </div>
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
  const { data: settings, isLoading: headerSettingsLoading } = useSiteSettings("header");
  const { data: layoutSettings } = useSiteSettings();
  const { user, isAdmin, loading, signOut } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const get = (key: string, fallback: any) => {
    const setting = settings?.find((item) => item.key === key);
    return setting?.value ?? fallback;
  };

  const getLayoutVal = (key: string, fallback: any) => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1200;
    const section = w <= 767 ? "layout_mobile" : w <= 1024 ? "layout_tablet" : "layout_desktop";
    const setting = layoutSettings?.find((s) => s.section === section && s.key === key);
    return setting?.value ?? fallback;
  };

  const navLinks = get("nav_links", [
    { label: "Shop", href: "/" },
    { label: "Books", href: "/browse", children: [] },
    { label: "Books by Publications", href: "/publications", children: [] },
    { label: "Subject wise Books", href: "/subjects", children: [] },
    { label: "Education Essentials", href: "/essentials" },
    { label: "Gifts", href: "/gifts" },
  ]) as NavLink[];

  const logoOffsetX = getLayoutVal("logo_offset_x", 0) as number;
  const logoOffsetY = getLayoutVal("logo_offset_y", 0) as number;
  const logoScale = getLayoutVal("logo_scale", 100) as number;
  const headerHeight = getLayoutVal("header_height", 68) as number;

  const logoUrlSetting = settings?.find((item) => item.key === "logo_url");
  const rawLogoUrl = typeof logoUrlSetting?.value === "string" ? logoUrlSetting.value.trim() : "";
  const logoVersion = logoUrlSetting?.updated_at
    ? encodeURIComponent(`${logoUrlSetting.updated_at}-${rawLogoUrl}`)
    : "local";
  const logoSrc = rawLogoUrl
    ? `${rawLogoUrl}${rawLogoUrl.includes("?") ? "&" : "?"}v=${logoVersion}`
    : logoHeader;
  const showResolvedLogo = !headerSettingsLoading;
  const activeLogoSrc = !showResolvedLogo || logoLoadFailed ? logoHeader : logoSrc;

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
          ? "bg-[hsl(207,68%,28%)] shadow-[0_2px_16px_rgba(0,0,0,0.18)]"
          : "bg-transparent"
      }`}
    >
      {/* Balanced container — max-width keeps things from flying to edges on ultrawide, 
          but wide enough to breathe on normal screens */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-5 lg:px-8">
        <div className="flex items-center justify-between"
          style={{ height: `${headerHeight}px` }}>

          {/* ── Left: Logo ── */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            {showResolvedLogo ? (
              <img
                key={activeLogoSrc}
                src={activeLogoSrc}
                alt="Madrasah Matters"
                className="object-contain"
                style={{
                  /* Responsive logo: scales from ~32px on mobile to ~48px on desktop */
                  height: "clamp(32px, 5vw, 48px)",
                  width: "auto",
                  transform: `translate(${logoOffsetX}px, ${logoOffsetY}px) scale(${logoScale / 100})`,
                }}
                onError={() => setLogoLoadFailed(true)}
              />
            ) : (
              <div
                className="rounded-md bg-white/10 animate-pulse"
                style={{ width: "140px", height: "40px" }}
                aria-label="Loading logo"
              />
            )}
          </Link>

          {/* ── Center: Navigation (Desktop only) ── */}
          <div className="hidden lg:flex items-center justify-center flex-1 min-w-0 mx-6">
            <div className="flex items-center gap-4 xl:gap-6">
              {navLinks.map((link, i) => (
                <DesktopNavItem key={i} link={link} />
              ))}
            </div>
          </div>

          {/* ── Right: Actions ── */}
          <div className="flex items-center gap-1 sm:gap-1.5 lg:gap-2 shrink-0">
            {/* Wholesale */}
            <Link
              to="/auth?intent=wholesale"
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold text-[hsl(var(--gold))] border border-[hsl(var(--gold))]/40 rounded-md hover:bg-[hsl(var(--gold))]/10 transition-all duration-200"
            >
              <Building2 className="h-3.5 w-3.5" />
              Wholesale
            </Link>

            {/* Cart */}
            <Link to="/cart" className="relative p-1.5 sm:p-2 text-white/80 hover:text-white transition-colors duration-200">
              <ShoppingCart className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 sm:w-[18px] sm:h-[18px] bg-[hsl(var(--coral))] text-white text-[9px] sm:text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Auth */}
            {user ? (
              <div className="hidden sm:flex items-center">
                <ProfileDropdown />
              </div>
            ) : loading ? (
              <div className="hidden sm:flex items-center gap-1.5">
                <div className="h-7 w-14 rounded-md bg-white/10 animate-pulse" />
                <div className="h-7 w-16 rounded-md bg-white/10 animate-pulse" />
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5">
                <Link to="/auth" className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-white/85 hover:text-white border border-white/20 rounded-md hover:border-white/40 transition-all duration-200">
                  <LogOut className="h-3 w-3" /> Log In
                </Link>
                <Link to="/auth?intent=signup" className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold bg-white text-[hsl(207,68%,28%)] rounded-md hover:bg-white/90 transition-all duration-200 shadow-sm">
                  <User className="h-3 w-3" /> Sign Up
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button className="lg:hidden p-1.5 text-white/90 hover:text-white transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden fixed inset-0 top-0 bg-black/50 backdrop-blur-sm z-40"
              onClick={() => setMobileOpen(false)}
            />
            {/* Slide-in panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="lg:hidden fixed top-0 right-0 bottom-0 w-[85vw] max-w-[380px] z-50 bg-white shadow-[-8px_0_30px_rgba(0,0,0,0.15)] flex flex-col mobile-drawer-scrollbar"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                  <img src={activeLogoSrc} alt="Madrasah Matters" className="h-8 w-auto object-contain" />
                </Link>
                <div className="flex items-center gap-3">
                  <Link to="/cart" className="relative p-2 text-[hsl(207,68%,28%)] hover:text-[hsl(207,68%,20%)] transition-colors" onClick={() => setMobileOpen(false)}>
                    <ShoppingCart className="h-5 w-5" />
                    {totalItems > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-[hsl(var(--coral))] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                        {totalItems}
                      </span>
                    )}
                  </Link>
                  <button className="p-2 text-[hsl(207,68%,28%)] hover:text-[hsl(207,68%,20%)] transition-colors rounded-lg hover:bg-slate-100"
                    onClick={() => setMobileOpen(false)}>
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable nav links */}
              <div className="flex-1 overflow-y-auto py-3 px-2 pb-24">
                {navLinks.map((link, i) => (
                  <MobileNavItem key={i} link={link} depth={0} onClose={() => setMobileOpen(false)} />
                ))}

                <Link to="/auth?intent=wholesale"
                  className="flex items-center gap-3 text-[15px] font-semibold text-[hsl(var(--gold))] py-4 px-6 hover:bg-white/[0.06] rounded-lg transition-all duration-200"
                  onClick={() => setMobileOpen(false)}>
                  <Building2 className="h-4.5 w-4.5" /> Wholesale
                </Link>

                {/* Auth actions — flow naturally after nav */}
                <div className="mt-6 mx-2 pt-5 border-t border-white/10 space-y-3">
                  {user ? (
                    <>
                      <p className="text-xs text-white/40 truncate mb-2 px-1">{user.email}</p>
                      <Link to="/profile"
                        className="w-full flex items-center justify-center gap-2.5 px-4 py-3 text-sm font-medium bg-white/10 text-white border border-white/15 rounded-xl hover:bg-white/15 transition-all duration-200"
                        onClick={() => setMobileOpen(false)}>
                        <User className="h-4 w-4" /> My Profile
                      </Link>
                      {isAdmin && (
                        <Link to="/admin"
                          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 text-sm font-medium bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold))] border border-[hsl(var(--gold))]/25 rounded-xl hover:bg-[hsl(var(--gold))]/20 transition-all duration-200"
                          onClick={() => setMobileOpen(false)}>
                          <Shield className="h-4 w-4" /> Admin Panel
                        </Link>
                      )}
                      <button onClick={handleSignOut}
                        className="w-full flex items-center justify-center gap-2.5 px-4 py-3 text-sm font-medium bg-white/10 text-white border border-white/15 rounded-xl hover:bg-white/15 transition-all duration-200">
                        <LogOut className="h-4 w-4" /> Logout
                      </button>
                    </>
                  ) : loading ? (
                    <div className="space-y-3">
                      <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
                      <div className="h-12 rounded-xl bg-white/10 animate-pulse" />
                    </div>
                  ) : (
                    <>
                      <Link to="/auth"
                        className="w-full flex items-center justify-center gap-2.5 px-4 py-3 text-sm font-medium text-white border border-white/25 rounded-xl hover:bg-white/10 transition-all duration-200"
                        onClick={() => setMobileOpen(false)}>
                        <LogOut className="h-4 w-4" /> Log In
                      </Link>
                      <Link to="/auth?intent=signup"
                        className="w-full flex items-center justify-center gap-2.5 px-4 py-3 text-sm font-semibold bg-white text-[hsl(207,68%,28%)] rounded-xl hover:bg-white/90 transition-all duration-200 shadow-md"
                        onClick={() => setMobileOpen(false)}>
                        <User className="h-4 w-4" /> Create Account
                      </Link>
                    </>
                  )}
                </div>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
