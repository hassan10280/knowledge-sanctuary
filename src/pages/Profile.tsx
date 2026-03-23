import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  User, Package, MapPin, Settings, Shield, Clock,
  Save, Loader2, Plus, Trash2, Eye, EyeOff, Lock, Building2, Pencil, Star, X, ArrowLeft
} from "lucide-react";
import AddressForm from "@/components/AddressForm";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";

type TabValue = "profile" | "orders" | "addresses" | "settings";

const Profile = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, updateProfile, getInitials, refetch } = useProfile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as TabValue | null;
  const [activeTab, setActiveTab] = useState<TabValue>(tabParam || "profile");

  // Profile form
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  // Orders
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Addresses
  const [addresses, setAddresses] = useState<any[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Wholesale status
  const [wholesaleApp, setWholesaleApp] = useState<any>(null);
  const [isWholesale, setIsWholesale] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth", { state: { from: "/profile" } });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  useEffect(() => {
    if (tabParam && ["profile", "orders", "addresses", "settings"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (!user) return;
    // Check wholesale role
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "wholesale").maybeSingle()
      .then(({ data }) => setIsWholesale(!!data));
    // Get wholesale application
    supabase.from("wholesale_applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setWholesaleApp(data));
  }, [user]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as TabValue);
    setSearchParams({ tab });
  };

  // Load orders
  useEffect(() => {
    if (activeTab !== "orders" || !user) return;
    setOrdersLoading(true);
    supabase.from("orders").select("*, order_items(*)").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => { setOrders(data || []); setOrdersLoading(false); });
  }, [activeTab, user]);

  // Load addresses
  const loadAddresses = async () => {
    if (!user) return;
    setAddressesLoading(true);
    const { data } = await supabase.from("billing_addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false });
    setAddresses(data || []);
    setAddressesLoading(false);
  };

  useEffect(() => {
    if (activeTab !== "addresses" || !user) return;
    loadAddresses();
  }, [activeTab, user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    const { error } = await updateProfile({ full_name: fullName.trim(), phone: phone.trim() });
    if (error) toast.error("Failed to save profile");
    else toast.success("Profile updated!");
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Password updated!"); setNewPassword(""); setConfirmPassword(""); setCurrentPassword(""); }
    setChangingPw(false);
  };

  const handleDeleteAddress = async (id: string) => {
    await supabase.from("billing_addresses").delete().eq("id", id);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    setDeleteConfirmId(null);
    queryClient.invalidateQueries({ queryKey: ["billing_addresses"] });
    toast.success("Address removed");
  };

  const invalidateAddresses = () => {
    queryClient.invalidateQueries({ queryKey: ["billing_addresses"] });
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const statusColor = (s: string) => {
    if (s === "approved") return "bg-emerald-100 text-emerald-700";
    if (s === "pending") return "bg-amber-100 text-amber-700";
    if (s === "rejected") return "bg-red-100 text-red-700";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-black/40 backdrop-blur-sm">
      <Navbar />

      {/* Centered floating card */}
      <div className="pt-24 pb-12 px-3 sm:px-6 flex items-start justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px] sm:max-w-[520px] md:max-w-[640px] lg:max-w-[720px] bg-white rounded-2xl sm:rounded-3xl shadow-[0_25px_80px_-12px_rgba(0,0,0,0.3)] border border-slate-200/60 overflow-hidden"
        >
          {/* ── Navy Header ── */}
          <div className="bg-[hsl(207,68%,28%)] px-5 sm:px-7 py-5 sm:py-6 relative">
            {/* Back & Close buttons */}
            <button onClick={() => navigate(-1)} className="absolute top-4 left-4 text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10" title="Go back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button onClick={() => navigate("/")} className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10" title="Close">
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-4 pt-4">
              <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-white/25 shrink-0">
                {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} /> : null}
                <AvatarFallback className="bg-white/15 text-white text-lg font-semibold">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-white truncate">{profile?.full_name || "Your Profile"}</h1>
                <p className="text-xs sm:text-sm text-white/50 truncate mt-0.5">{user.email}</p>
                <div className="flex gap-2 mt-2">
                  {isWholesale && <Badge className="bg-white/15 text-white text-[10px] border-0"><Building2 className="h-3 w-3 mr-1" />Wholesale</Badge>}
                  {isAdmin && <Badge className="bg-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] text-[10px] border-0"><Shield className="h-3 w-3 mr-1" />Admin</Badge>}
                  {!isWholesale && !isAdmin && <Badge className="bg-white/10 text-white/70 text-[10px] border-0">Retail</Badge>}
                </div>
              </div>
            </div>
          </div>

          {/* ── Tab Navigation ── */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <div className="border-b border-slate-100 px-3 sm:px-5">
              <TabsList className="w-full bg-transparent h-12 p-0 gap-0">
                {[
                  { val: "profile" as TabValue, icon: User, label: "Profile" },
                  { val: "orders" as TabValue, icon: Package, label: "Orders" },
                  { val: "addresses" as TabValue, icon: MapPin, label: "Addresses" },
                  { val: "settings" as TabValue, icon: Settings, label: "Settings" },
                ].map((t) => (
                  <TabsTrigger
                    key={t.val}
                    value={t.val}
                    className="flex-1 gap-1.5 text-[11px] sm:text-[13px] font-medium text-slate-400 data-[state=active]:text-[hsl(207,68%,28%)] data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--gold))] transition-all h-12"
                  >
                    <t.icon className="h-3.5 w-3.5 hidden sm:block" />
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* ── Tab Content Area ── */}
            <div className="px-4 sm:px-6 py-5 sm:py-6 max-h-[55vh] sm:max-h-[60vh] overflow-y-auto mobile-drawer-scrollbar">

              {/* PROFILE TAB */}
              <TabsContent value="profile" className="mt-0">
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-[hsl(207,68%,28%)] mb-3">Personal Information</h3>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="fullName" className="text-xs text-slate-500">Full Name</Label>
                        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" className="h-10 rounded-xl border-slate-200 focus:border-[hsl(var(--gold))] focus:ring-[hsl(var(--gold))]/20" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs text-slate-500">Email</Label>
                        <Input id="email" value={user.email || ""} disabled className="h-10 rounded-xl bg-slate-50 border-slate-200" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="phone" className="text-xs text-slate-500">Phone</Label>
                        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 7xxx xxx xxx" className="h-10 rounded-xl border-slate-200 focus:border-[hsl(var(--gold))] focus:ring-[hsl(var(--gold))]/20" />
                      </div>
                    </div>
                    <Button onClick={handleSaveProfile} disabled={saving} className="mt-4 w-full gap-2 rounded-xl bg-[hsl(207,68%,28%)] hover:bg-[hsl(207,68%,24%)] h-10">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Changes
                    </Button>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="text-sm font-semibold text-[hsl(207,68%,28%)] mb-3">Account Type</h3>
                    {isWholesale ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50">
                        <Building2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        <span className="text-sm font-medium text-emerald-700">Wholesale — Approved</span>
                      </div>
                    ) : wholesaleApp ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50">
                        <Building2 className="h-5 w-5 text-amber-600 shrink-0" />
                        <span className="text-sm font-medium text-amber-700">Wholesale — {wholesaleApp.status}</span>
                      </div>
                    ) : (
                      <Button variant="outline" onClick={() => navigate("/auth?intent=wholesale")} className="w-full rounded-xl gap-2 h-10 border-slate-200 hover:border-[hsl(var(--gold))] hover:text-[hsl(var(--gold))]">
                        <Building2 className="h-4 w-4" /> Apply for Wholesale
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* ORDERS TAB */}
              <TabsContent value="orders" className="mt-0">
                <h3 className="text-sm font-semibold text-[hsl(207,68%,28%)] mb-1">Order History</h3>
                <p className="text-[11px] text-slate-400 mb-4">{orders.length} order{orders.length !== 1 ? "s" : ""} found</p>
                {ordersLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-10">
                    <Package className="h-10 w-10 mx-auto mb-3 text-slate-200" />
                    <p className="text-sm font-medium text-slate-400">No orders yet</p>
                    <Button variant="outline" className="mt-4 rounded-xl" onClick={() => navigate("/")}>Browse Books</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div key={order.id} className="border border-slate-100 rounded-xl p-3.5 hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <Badge className={`text-[10px] ${order.status === "completed" ? "bg-emerald-100 text-emerald-700" : order.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                            {order.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 space-y-0.5">
                          {order.order_items?.map((item: any) => (
                            <p key={item.id}>{item.title} × {item.quantity} — £{(item.price * item.quantity).toFixed(2)}</p>
                          ))}
                        </div>
                        <div className="flex justify-between text-xs mt-2 pt-2 border-t border-slate-100">
                          <span className="text-slate-400">Total</span>
                          <span className="font-semibold text-[hsl(207,68%,28%)]">£{Number(order.total).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ADDRESSES TAB */}
              <TabsContent value="addresses" className="mt-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[hsl(207,68%,28%)]">Address Book</h3>
                    <p className="text-[11px] text-slate-400">Manage billing addresses</p>
                  </div>
                  {!showAddressForm && !editingAddress && (
                    <Button variant="outline" size="sm" onClick={() => { setShowAddressForm(true); setEditingAddress(null); }} className="rounded-xl gap-1.5 text-xs h-8 border-slate-200">
                      <Plus className="h-3 w-3" /> Add New
                    </Button>
                  )}
                </div>

                {/* Add New Address Form */}
                {showAddressForm && !editingAddress && (
                  <div className="mb-4 border border-[hsl(var(--gold))]/30 rounded-xl p-4 bg-[hsl(var(--gold))]/5">
                    <h4 className="text-xs font-semibold text-[hsl(207,68%,28%)] mb-3">New Address</h4>
                    <AddressForm
                      onSave={async (data) => {
                        if (!user) return;
                        await supabase.from("billing_addresses").insert({
                          user_id: user.id, ...data, country: "United Kingdom",
                          is_default: addresses.length === 0,
                        });
                        setShowAddressForm(false);
                        loadAddresses();
                        invalidateAddresses();
                        toast.success("Address added!");
                      }}
                      onCancel={() => setShowAddressForm(false)}
                      saveLabel="Add Address"
                    />
                  </div>
                )}

                {/* Edit Address Form */}
                {editingAddress && (
                  <div className="mb-4 border border-[hsl(var(--gold))]/30 rounded-xl p-4 bg-[hsl(var(--gold))]/5">
                    <h4 className="text-xs font-semibold text-[hsl(207,68%,28%)] mb-3">Edit Address</h4>
                    <AddressForm
                      initial={editingAddress}
                      onSave={async (data) => {
                        await supabase.from("billing_addresses").update({ ...data, updated_at: new Date().toISOString() }).eq("id", editingAddress.id);
                        setEditingAddress(null);
                        loadAddresses();
                        invalidateAddresses();
                        toast.success("Address updated!");
                      }}
                      onCancel={() => setEditingAddress(null)}
                      saveLabel="Update Address"
                    />
                  </div>
                )}

                {addressesLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
                ) : addresses.length === 0 && !showAddressForm ? (
                  <div className="text-center py-10">
                    <MapPin className="h-10 w-10 mx-auto mb-3 text-slate-200" />
                    <p className="text-sm font-medium text-slate-400">No saved addresses</p>
                    <Button variant="outline" className="mt-4 rounded-xl gap-2" onClick={() => setShowAddressForm(true)}>
                      <Plus className="h-3.5 w-3.5" /> Add Your First Address
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <div key={addr.id} className="border border-slate-100 rounded-xl p-3.5 relative group hover:bg-slate-50/50 transition-colors">
                        {addr.is_default && <Badge className="absolute top-2.5 right-2.5 bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))] text-[9px] border-0">Default</Badge>}
                        <p className="font-medium text-sm text-[hsl(207,68%,28%)]">{addr.full_name}</p>
                        <p className="text-xs text-slate-400 mt-1">{addr.address_line1}</p>
                        {addr.address_line2 && <p className="text-xs text-slate-400">{addr.address_line2}</p>}
                        <p className="text-xs text-slate-400">{addr.city}, {addr.postcode}</p>
                        {addr.phone && <p className="text-xs text-slate-400 mt-1">{addr.phone}</p>}
                        <div className="absolute bottom-2.5 right-2.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!addr.is_default && (
                            <button onClick={async () => {
                              await supabase.from("billing_addresses").update({ is_default: false }).eq("user_id", user.id);
                              await supabase.from("billing_addresses").update({ is_default: true }).eq("id", addr.id);
                              loadAddresses();
                              toast.success("Default address updated");
                            }} className="text-[hsl(var(--gold))] hover:text-[hsl(var(--gold))] p-1" title="Set as default">
                              <Star className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => { setEditingAddress(addr); setShowAddressForm(false); }}
                            className="text-slate-400 hover:text-[hsl(207,68%,28%)] p-1" title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDeleteAddress(addr.id)}
                            className="text-red-400 hover:text-red-500 p-1" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* SETTINGS TAB */}
              <TabsContent value="settings" className="mt-0">
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-[hsl(207,68%,28%)] flex items-center gap-2 mb-3"><Lock className="h-3.5 w-3.5" />Change Password</h3>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">New Password</Label>
                        <div className="relative">
                          <Input type={showNewPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Enter new password" className="h-10 rounded-xl border-slate-200 pr-10 focus:border-[hsl(var(--gold))] focus:ring-[hsl(var(--gold))]/20" />
                          <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Confirm Password</Label>
                        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="h-10 rounded-xl border-slate-200 focus:border-[hsl(var(--gold))] focus:ring-[hsl(var(--gold))]/20" />
                      </div>
                    </div>
                    <Button onClick={handleChangePassword} disabled={changingPw || !newPassword} className="mt-4 w-full gap-2 rounded-xl bg-[hsl(207,68%,28%)] hover:bg-[hsl(207,68%,24%)] h-10">
                      {changingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Update Password
                    </Button>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <h3 className="text-sm font-semibold text-[hsl(207,68%,28%)] mb-3">Account Information</h3>
                    <div className="space-y-2.5">
                      {[
                        { label: "Email", value: user.email },
                        { label: "Account Type", value: isWholesale ? "Wholesale" : "Retail" },
                        { label: "Member Since", value: new Date(user.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                          <span className="text-xs text-slate-400">{row.label}</span>
                          <span className="text-xs font-medium text-[hsl(207,68%,28%)]">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

export default Profile;
