import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  User, Package, MapPin, Settings, Shield, Clock,
  Save, Loader2, Plus, Trash2, Eye, EyeOff, Lock, Building2, Pencil, Star, X, ArrowLeft,
  Camera, Mail, LogOut, AlertTriangle, KeyRound, ShieldCheck, RefreshCw, Filter
} from "lucide-react";
import AddressForm from "@/components/AddressForm";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";

type TabValue = "profile" | "orders" | "addresses" | "settings" | "security";

const Profile = () => {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, updateProfile, getInitials, refetch } = useProfile();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as TabValue | null;
  const [activeTab, setActiveTab] = useState<TabValue>(tabParam || "profile");

  // Profile form
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  // Email change
  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);

  // Orders
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState("all");
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

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

  // Security
  const [securityAction, setSecurityAction] = useState<"signout-all" | "reset" | null>(null);
  const [securityLoading, setSecurityLoading] = useState(false);

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
    if (tabParam && ["profile", "orders", "addresses", "settings", "security"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (!user) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "wholesale").maybeSingle()
      .then(({ data }) => setIsWholesale(!!data));
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

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const filePath = `avatars/${user.id}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("site-assets").upload(filePath, file, { upsert: true });
    if (uploadError) { toast.error("Upload failed"); setUploadingAvatar(false); return; }

    const { data: urlData } = supabase.storage.from("site-assets").getPublicUrl(filePath);
    const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await updateProfile({ avatar_url: avatarUrl });
    refetch();
    toast.success("Profile picture updated!");
    setUploadingAvatar(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) { toast.error("Please enter your current password"); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setChangingPw(true);
    // Verify current password first
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: user!.email!,
      password: currentPassword,
    });
    if (verifyErr) {
      toast.error("Current password is incorrect");
      setChangingPw(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else { toast.success("Password updated!"); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }
    setChangingPw(false);
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes("@")) { toast.error("Please enter a valid email"); return; }
    setChangingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    if (error) toast.error(error.message);
    else { toast.success("Verification email sent! Please check both your current and new email to confirm the change."); setNewEmail(""); }
    setChangingEmail(false);
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

  // Security actions
  const handleSignOutAll = async () => {
    setSecurityLoading(true);
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (error) toast.error(error.message);
    else { toast.success("Signed out from all devices"); navigate("/auth"); }
    setSecurityLoading(false);
    setSecurityAction(null);
  };

  const handleSecurityReset = async () => {
    setSecurityLoading(true);
    // Force password reset via email
    if (user?.email) {
      await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth`,
      });
    }
    // Sign out globally
    await supabase.auth.signOut({ scope: "global" });
    toast.success("Security reset complete. Check your email to set a new password.");
    navigate("/auth");
    setSecurityLoading(false);
    setSecurityAction(null);
  };

  // Filtered orders
  const filteredOrders = orderFilter === "all" ? orders : orders.filter((o) => o.status === orderFilter);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const orderStatusColor = (s: string) => {
    switch (s) {
      case "completed": return "bg-emerald-100 text-emerald-700";
      case "processing": return "bg-blue-100 text-blue-700";
      case "pending": return "bg-amber-100 text-amber-700";
      case "cancelled": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-500";
    }
  };

  const tabs = [
    { val: "profile" as TabValue, icon: User, label: "Profile" },
    { val: "orders" as TabValue, icon: Package, label: "Orders" },
    { val: "addresses" as TabValue, icon: MapPin, label: "Addresses" },
    { val: "settings" as TabValue, icon: Settings, label: "Settings" },
    { val: "security" as TabValue, icon: Shield, label: "Security" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50">
      <Navbar />

      {/* Hidden avatar input */}
      <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

      {/* Centered floating card */}
      <div className="pt-24 pb-12 px-3 sm:px-6 flex items-start justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[440px] sm:max-w-[560px] md:max-w-[680px] lg:max-w-[760px] bg-white rounded-2xl sm:rounded-3xl shadow-[0_25px_80px_-12px_rgba(0,0,0,0.3)] border border-slate-200/60 overflow-hidden"
        >
          {/* ── Navy Header ── */}
          <div className="bg-[hsl(207,68%,28%)] px-5 sm:px-7 py-5 sm:py-6 relative">
            <button onClick={() => navigate(-1)} className="absolute top-4 left-4 text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10" title="Go back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button onClick={() => navigate("/")} className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10" title="Close">
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-4 pt-4">
              <div className="relative group">
                <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border-2 border-white/25 shrink-0">
                  {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} /> : null}
                  <AvatarFallback className="bg-white/15 text-white text-lg font-semibold">{getInitials()}</AvatarFallback>
                </Avatar>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {uploadingAvatar ? <Loader2 className="h-5 w-5 text-white animate-spin" /> : <Camera className="h-5 w-5 text-white" />}
                </button>
              </div>
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
            <div className="border-b border-slate-100 px-2 sm:px-4 overflow-x-auto">
              <TabsList className="w-full bg-transparent h-12 p-0 gap-0">
                {tabs.map((t) => (
                  <TabsTrigger
                    key={t.val}
                    value={t.val}
                    className="flex-1 gap-1 text-[10px] sm:text-[12px] font-medium text-slate-400 data-[state=active]:text-[hsl(207,68%,28%)] data-[state=active]:shadow-none data-[state=active]:bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-[hsl(var(--gold))] transition-all h-12 px-1 sm:px-2"
                  >
                    <t.icon className="h-3.5 w-3.5 hidden sm:block" />
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* ── Tab Content Area ── */}
            <div className="px-4 sm:px-6 py-5 sm:py-6 max-h-[calc(100vh-320px)] sm:max-h-[calc(100vh-300px)] overflow-y-auto mobile-drawer-scrollbar">

              {/* ════════ PROFILE TAB ════════ */}
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

              {/* ════════ ORDERS TAB ════════ */}
              <TabsContent value="orders" className="mt-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[hsl(207,68%,28%)]">Order History</h3>
                    <p className="text-[11px] text-slate-400">{filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}</p>
                  </div>
                  <Select value={orderFilter} onValueChange={setOrderFilter}>
                    <SelectTrigger className="w-[130px] h-8 text-xs rounded-lg border-slate-200">
                      <Filter className="h-3 w-3 mr-1.5 text-slate-400" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Orders</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="processing">Processing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {ordersLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-10">
                    <Package className="h-10 w-10 mx-auto mb-3 text-slate-200" />
                    <p className="text-sm font-medium text-slate-400">{orderFilter === "all" ? "No orders yet" : `No ${orderFilter} orders`}</p>
                    {orderFilter === "all" && <Button variant="outline" className="mt-4 rounded-xl" onClick={() => navigate("/")}>Browse Books</Button>}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredOrders.map((order) => (
                      <div
                        key={order.id}
                        className="border border-slate-100 rounded-xl overflow-hidden hover:border-slate-200 transition-colors cursor-pointer"
                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                      >
                        <div className="p-3.5">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-mono text-slate-400">#{order.id.slice(0, 8)}</span>
                            <Badge className={`text-[10px] ${orderStatusColor(order.status)}`}>{order.status}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-500 flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              {new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                            <span className="text-sm font-semibold text-[hsl(207,68%,28%)]">£{Number(order.total).toFixed(2)}</span>
                          </div>
                        </div>

                        <AnimatePresence>
                          {expandedOrder === order.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3.5 pb-3.5 border-t border-slate-50 pt-3 space-y-2">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Items</p>
                                {order.order_items?.map((item: any) => (
                                  <div key={item.id} className="flex justify-between text-xs">
                                    <span className="text-slate-600">{item.title} × {item.quantity}</span>
                                    <span className="text-slate-500">£{(item.price * item.quantity).toFixed(2)}</span>
                                  </div>
                                ))}
                                {order.shipping_cost > 0 && (
                                  <div className="flex justify-between text-xs pt-1 border-t border-slate-50">
                                    <span className="text-slate-400">Shipping</span>
                                    <span className="text-slate-500">£{Number(order.shipping_cost).toFixed(2)}</span>
                                  </div>
                                )}
                                {order.coupon_discount > 0 && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-emerald-500">Coupon Discount</span>
                                    <span className="text-emerald-500">-£{Number(order.coupon_discount).toFixed(2)}</span>
                                  </div>
                                )}
                                {order.payment_method && (
                                  <div className="flex justify-between text-xs pt-1 border-t border-slate-50">
                                    <span className="text-slate-400">Payment</span>
                                    <span className="text-slate-500 capitalize">{order.payment_method.replace("_", " ")}</span>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ════════ ADDRESSES TAB ════════ */}
              <TabsContent value="addresses" className="mt-0">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[hsl(207,68%,28%)]">Address Book</h3>
                    <p className="text-[11px] text-slate-400">Manage billing & shipping addresses</p>
                  </div>
                  {!showAddressForm && !editingAddress && (
                    <Button variant="outline" size="sm" onClick={() => { setShowAddressForm(true); setEditingAddress(null); }} className="rounded-xl gap-1.5 text-xs h-8 border-slate-200">
                      <Plus className="h-3 w-3" /> Add New
                    </Button>
                  )}
                </div>

                {/* Add / Edit Form */}
                <AnimatePresence mode="wait">
                  {(showAddressForm || editingAddress) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mb-4 border border-[hsl(var(--gold))]/30 rounded-xl p-4 bg-[hsl(var(--gold))]/5 overflow-hidden"
                    >
                      <h4 className="text-xs font-semibold text-[hsl(207,68%,28%)] mb-3">{editingAddress ? "Edit Address" : "New Address"}</h4>
                      <AddressForm
                        initial={editingAddress || undefined}
                        onSave={async (data) => {
                          if (!user) return;
                          if (editingAddress) {
                            await supabase.from("billing_addresses").update({ ...data, updated_at: new Date().toISOString() }).eq("id", editingAddress.id);
                            setEditingAddress(null);
                            toast.success("Address updated!");
                          } else {
                            await supabase.from("billing_addresses").insert({
                              user_id: user.id, ...data, country: "United Kingdom",
                              is_default: addresses.length === 0,
                            });
                            setShowAddressForm(false);
                            toast.success("Address added!");
                          }
                          loadAddresses();
                          invalidateAddresses();
                        }}
                        onCancel={() => { setShowAddressForm(false); setEditingAddress(null); }}
                        saveLabel={editingAddress ? "Update Address" : "Add Address"}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

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
                        <div className="absolute bottom-2.5 right-2.5 flex gap-1.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          {!addr.is_default && (
                            <button onClick={async () => {
                              await supabase.rpc("set_default_address", { p_addr_id: addr.id, p_user_id: user.id });
                              loadAddresses();
                              invalidateAddresses();
                              toast.success("Default address updated");
                            }} className="text-[hsl(var(--gold))] hover:text-[hsl(var(--gold))] p-1" title="Set as default">
                              <Star className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button onClick={() => { setEditingAddress(addr); setShowAddressForm(false); }}
                            className="text-slate-400 hover:text-[hsl(207,68%,28%)] p-1" title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteConfirmId(addr.id)}
                            className="text-red-400 hover:text-red-500 p-1" title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ════════ SETTINGS TAB ════════ */}
              <TabsContent value="settings" className="mt-0">
                <div className="space-y-6">
                  {/* Change Password */}
                  <div>
                    <h3 className="text-sm font-semibold text-[hsl(207,68%,28%)] flex items-center gap-2 mb-3"><Lock className="h-3.5 w-3.5" />Change Password</h3>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Current Password</Label>
                        <div className="relative">
                          <Input type={showCurrentPw ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" className="h-10 rounded-xl border-slate-200 pr-10 focus:border-[hsl(var(--gold))] focus:ring-[hsl(var(--gold))]/20" />
                          <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">New Password</Label>
                        <div className="relative">
                          <Input type={showNewPw ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min. 6 characters" className="h-10 rounded-xl border-slate-200 pr-10 focus:border-[hsl(var(--gold))] focus:ring-[hsl(var(--gold))]/20" />
                          <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-slate-500">Confirm Password</Label>
                        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter password" className="h-10 rounded-xl border-slate-200 focus:border-[hsl(var(--gold))] focus:ring-[hsl(var(--gold))]/20" />
                      </div>
                    </div>
                    <Button onClick={handleChangePassword} disabled={changingPw || !currentPassword || !newPassword} className="mt-3 w-full gap-2 rounded-xl bg-[hsl(207,68%,28%)] hover:bg-[hsl(207,68%,24%)] h-10">
                      {changingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                      Update Password
                    </Button>
                  </div>

                  {/* Change Email */}
                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="text-sm font-semibold text-[hsl(207,68%,28%)] flex items-center gap-2 mb-3"><Mail className="h-3.5 w-3.5" />Change Email</h3>
                    <p className="text-[11px] text-slate-400 mb-3">A verification link will be sent to both your current and new email.</p>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-500">Current Email</Label>
                      <Input value={user.email || ""} disabled className="h-10 rounded-xl bg-slate-50 border-slate-200" />
                    </div>
                    <div className="space-y-1.5 mt-3">
                      <Label className="text-xs text-slate-500">New Email</Label>
                      <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="newemail@example.com" className="h-10 rounded-xl border-slate-200 focus:border-[hsl(var(--gold))] focus:ring-[hsl(var(--gold))]/20" />
                    </div>
                    <Button onClick={handleChangeEmail} disabled={changingEmail || !newEmail.trim()} variant="outline" className="mt-3 w-full gap-2 rounded-xl h-10 border-slate-200">
                      {changingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                      Send Verification
                    </Button>
                  </div>

                  {/* Account Info */}
                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="text-sm font-semibold text-[hsl(207,68%,28%)] mb-3">Account Information</h3>
                    <div className="space-y-2">
                      {[
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

              {/* ════════ SECURITY TAB ════════ */}
              <TabsContent value="security" className="mt-0">
                <div className="space-y-5">
                  <div>
                    <h3 className="text-sm font-semibold text-[hsl(207,68%,28%)] flex items-center gap-2 mb-1"><ShieldCheck className="h-3.5 w-3.5" />Account Security</h3>
                    <p className="text-[11px] text-slate-400 mb-4">Manage your account's security settings and active sessions.</p>
                  </div>

                  {/* Sign out all devices */}
                  <div className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-amber-50 shrink-0">
                        <LogOut className="h-4 w-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-[hsl(207,68%,28%)]">Sign Out from All Devices</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">End all active sessions across every device. You will need to sign in again.</p>
                        <Button variant="outline" size="sm" onClick={() => setSecurityAction("signout-all")} className="mt-3 rounded-lg text-xs h-8 border-amber-200 text-amber-700 hover:bg-amber-50">
                          <LogOut className="h-3 w-3 mr-1.5" /> Sign Out Everywhere
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Security Reset */}
                  <div className="border border-red-100 rounded-xl p-4 bg-red-50/30">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-red-50 shrink-0">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-red-700">Full Account Security Reset</h4>
                        <p className="text-[11px] text-red-400 mt-0.5">
                          This will sign you out from all devices, send a password reset email, and invalidate all sessions. Use this if you suspect your account may be compromised.
                        </p>
                        <Button variant="outline" size="sm" onClick={() => setSecurityAction("reset")} className="mt-3 rounded-lg text-xs h-8 border-red-200 text-red-600 hover:bg-red-50">
                          <RefreshCw className="h-3 w-3 mr-1.5" /> Reset Account Security
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Session info */}
                  <div className="border-t border-slate-100 pt-5">
                    <h3 className="text-sm font-semibold text-[hsl(207,68%,28%)] mb-3">Session Information</h3>
                    <div className="space-y-2">
                      {[
                        { label: "Current Session", value: "Active" },
                        { label: "Last Sign In", value: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A" },
                        { label: "Auth Provider", value: user.app_metadata?.provider === "google" ? "Google" : "Email" },
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

      {/* Delete Address Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Address?</AlertDialogTitle>
            <AlertDialogDescription>
              Do you really want to permanently delete this address? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirmId && handleDeleteAddress(deleteConfirmId)} className="rounded-xl bg-red-600 hover:bg-red-700 text-white">
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Security Action Confirmation */}
      <AlertDialog open={!!securityAction} onOpenChange={(open) => !open && setSecurityAction(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {securityAction === "reset" ? <AlertTriangle className="h-5 w-5 text-red-500" /> : <LogOut className="h-5 w-5 text-amber-500" />}
              {securityAction === "reset" ? "Full Security Reset?" : "Sign Out Everywhere?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {securityAction === "reset"
                ? "This will sign you out from all devices, invalidate all sessions, and send a password reset email. You will need to set a new password to sign back in."
                : "You will be signed out from all devices including this one. You will need to sign in again."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={securityLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={securityAction === "reset" ? handleSecurityReset : handleSignOutAll}
              disabled={securityLoading}
              className={`rounded-xl text-white ${securityAction === "reset" ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}`}
            >
              {securityLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {securityAction === "reset" ? "Yes, Reset Everything" : "Yes, Sign Out All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
};

export default Profile;
