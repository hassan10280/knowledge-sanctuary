import { Link } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import logoWhite from "@/assets/logo-white.png";

const Footer = () => {
  const { data: settings } = useSiteSettings("footer");
  const { data: headerSettings, isLoading: headerLoading } = useSiteSettings("header");

  const get = (key: string, fallback: any) => {
    const s = settings?.find((s) => s.key === key);
    return s?.value ?? fallback;
  };

  const logoSetting = headerSettings?.find((s) => s.key === "logo_url");
  const rawLogoUrl = typeof logoSetting?.value === "string" ? logoSetting.value.trim() : "";
  const logoVersion = logoSetting?.updated_at
    ? encodeURIComponent(`${logoSetting.updated_at}-${rawLogoUrl}`)
    : "local";
  const logoUrl = rawLogoUrl
    ? `${rawLogoUrl}${rawLogoUrl.includes("?") ? "&" : "?"}v=${logoVersion}`
    : null;
  const description = get("description", "A curated digital sanctuary of Islamic scholarship for the UK community.") as string;
  const copyright = get("copyright", "© 2026 MadrasahMatters. All rights reserved.") as string;
  const tagline = get("tagline", "Made with reverence for knowledge.") as string;
  const libraryLinks = get("library_links", []) as Array<{ label: string; href: string }>;
  const communityLinks = get("community_links", []) as Array<{ label: string; href: string }>;
  const supportLinks = get("support_links", []) as Array<{ label: string; href: string }>;

  const LinkList = ({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) => (
    <div>
      <h4 className="tracking-meta text-white/70 mb-4">{title}</h4>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link to={link.href} className="text-sm text-white/45 hover:text-white transition-colors duration-300">{link.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <footer className="relative overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-[hsl(var(--sky-deep))] via-[hsl(var(--sky-glow))] to-[hsl(var(--sky-deep))]" />
      
      <div className="bg-[hsl(var(--sky-deep))] text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
            <div className="md:col-span-1">
              {headerLoading ? (
                <div className="h-14 w-40 mb-4 rounded-md bg-white/10 animate-pulse" aria-label="Loading footer logo" />
              ) : (
                <img src={logoUrl || logoWhite} alt="MadrasahMatters" className="h-14 w-auto mb-4" />
              )}
              <p className="text-sm text-white/50 leading-relaxed">{description}</p>
            </div>
            <LinkList title="Library" links={libraryLinks} />
            <LinkList title="Community" links={communityLinks} />
            <LinkList title="Support" links={supportLinks} />
          </div>

          <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-white/30">{copyright}</p>
            <p className="text-xs text-white/30">{tagline}</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
