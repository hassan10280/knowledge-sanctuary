import { Link, useNavigate } from "react-router-dom";
import { User, Package, MapPin, Settings, LogOut, Shield, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";

const ProfileDropdown = () => {
  const { profile, getInitials } = useProfile();
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (!user) return null;

  const menuItems = [
    { to: "/profile", icon: User, label: "My Profile", desc: "View & edit your info" },
    { to: "/profile?tab=orders", icon: Package, label: "My Orders", desc: "Track your purchases" },
    { to: "/profile?tab=addresses", icon: MapPin, label: "Address Book", desc: "Manage addresses" },
    { to: "/profile?tab=settings", icon: Settings, label: "Account Settings", desc: "Preferences & security" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))]/50 transition-transform active:scale-95">
          <Avatar className="h-9 w-9 border-2 border-white/20 hover:border-[hsl(var(--gold))]/60 transition-colors cursor-pointer">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.full_name || "Profile"} />
            ) : null}
            <AvatarFallback className="bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] text-xs font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="center"
        sideOffset={12}
        className="w-[320px] p-0 rounded-2xl border border-slate-200/80 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.25)] bg-white overflow-hidden"
      >
        {/* ── Profile Header ── */}
        <div className="bg-[hsl(207,68%,28%)] px-5 py-4 flex items-center gap-3.5">
          <Avatar className="h-11 w-11 border-2 border-white/30 shrink-0">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.full_name || "Profile"} />
            ) : null}
            <AvatarFallback className="bg-white/15 text-white text-sm font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-white truncate">
              {profile?.full_name || "User"}
            </p>
            <p className="text-[11px] text-white/60 truncate mt-0.5">
              {user.email}
            </p>
          </div>
        </div>

        {/* ── Menu Items ── */}
        <div className="py-2 px-2">
          {menuItems.map((item) => (
            <DropdownMenuItem key={item.to} asChild className="p-0 focus:bg-transparent">
              <Link
                to={item.to}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-[hsl(var(--gold))]/10 flex items-center justify-center transition-colors shrink-0">
                  <item.icon className="h-4 w-4 text-[hsl(207,68%,28%)] group-hover:text-[hsl(var(--gold))] transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-[hsl(207,68%,28%)]">{item.label}</p>
                  <p className="text-[11px] text-slate-400">{item.desc}</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-[hsl(var(--gold))] transition-colors shrink-0" />
              </Link>
            </DropdownMenuItem>
          ))}
        </div>

        {/* ── Admin Section ── */}
        {isAdmin && (
          <>
            <div className="mx-3 border-t border-slate-100" />
            <div className="py-2 px-2">
              <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                <Link
                  to="/admin"
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-[hsl(var(--gold))]/5 hover:bg-[hsl(var(--gold))]/10 transition-colors group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-[hsl(var(--gold))]/15 flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 text-[hsl(var(--gold))]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-[hsl(var(--gold))]">Admin Panel</p>
                    <p className="text-[11px] text-[hsl(var(--gold))]/60">Manage your store</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-[hsl(var(--gold))]/40 shrink-0" />
                </Link>
              </DropdownMenuItem>
            </div>
          </>
        )}

        {/* ── Logout Footer ── */}
        <div className="mx-3 border-t border-slate-100" />
        <div className="p-2">
          <DropdownMenuItem
            onClick={handleSignOut}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-destructive hover:bg-red-50 focus:bg-red-50 focus:text-destructive cursor-pointer transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-[13px] font-medium">Logout</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ProfileDropdown;
