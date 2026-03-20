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
  Save, Loader2, Plus, Trash2, Eye, EyeOff, Lock, Building2
} from "lucide-react";

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
  useEffect(() => {
    if (activeTab !== "addresses" || !user) return;
    setAddressesLoading(true);
    supabase.from("billing_addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false })
      .then(({ data }) => { setAddresses(data || []); setAddressesLoading(false); });
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
    toast.success("Address removed");
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
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 pb-16 px-4 max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Avatar className="h-16 w-16 border-2 border-primary/10">
              {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} /> : null}
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">{getInitials()}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{profile?.full_name || "Your Profile"}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex gap-2 mt-1">
                {isWholesale && <Badge variant="secondary" className="text-xs"><Building2 className="h-3 w-3 mr-1" />Wholesale</Badge>}
                {isAdmin && <Badge variant="secondary" className="text-xs"><Shield className="h-3 w-3 mr-1" />Admin</Badge>}
                {!isWholesale && !isAdmin && <Badge variant="outline" className="text-xs">Retail</Badge>}
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="w-full grid grid-cols-4 mb-6">
              <TabsTrigger value="profile" className="gap-1.5 text-xs sm:text-sm"><User className="h-3.5 w-3.5 hidden sm:block" />Profile</TabsTrigger>
              <TabsTrigger value="orders" className="gap-1.5 text-xs sm:text-sm"><Package className="h-3.5 w-3.5 hidden sm:block" />Orders</TabsTrigger>
              <TabsTrigger value="addresses" className="gap-1.5 text-xs sm:text-sm"><MapPin className="h-3.5 w-3.5 hidden sm:block" />Addresses</TabsTrigger>
              <TabsTrigger value="settings" className="gap-1.5 text-xs sm:text-sm"><Settings className="h-3.5 w-3.5 hidden sm:block" />Settings</TabsTrigger>
            </TabsList>

            {/* PROFILE TAB */}
            <TabsContent value="profile">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Personal Information</CardTitle>
                    <CardDescription>Update your name and contact details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={user.email || ""} disabled className="bg-muted" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+44 7xxx xxx xxx" />
                      </div>
                    </div>
                    <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Changes
                    </Button>
                  </CardContent>
                </Card>

                {/* Account Type */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Account Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isWholesale ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-primary" />
                          <span className="font-medium">Wholesale Account</span>
                          <Badge className={statusColor("approved")}>Approved</Badge>
                        </div>
                        {wholesaleApp?.form_data && (
                          <div className="text-sm text-muted-foreground space-y-1 pl-7">
                            {Object.entries(wholesaleApp.form_data as Record<string, string>).slice(0, 3).map(([k, v]) => (
                              <p key={k}><span className="font-medium capitalize">{k.replace(/_/g, " ")}:</span> {v}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : wholesaleApp ? (
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium">Wholesale Application</span>
                        <Badge className={statusColor(wholesaleApp.status)}>{wholesaleApp.status}</Badge>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">Retail Account</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate("/auth?intent=wholesale")} className="gap-1.5">
                          <Building2 className="h-3.5 w-3.5" />
                          Apply for Wholesale
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ORDERS TAB */}
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order History</CardTitle>
                  <CardDescription>{orders.length} order{orders.length !== 1 ? "s" : ""} found</CardDescription>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="font-medium">No orders yet</p>
                      <p className="text-sm mt-1">Your order history will appear here</p>
                      <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>Browse Books</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                            </div>
                            <Badge className={order.status === "completed" ? "bg-emerald-100 text-emerald-700" : order.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}>
                              {order.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground space-y-1">
                            {order.order_items?.map((item: any) => (
                              <p key={item.id}>{item.title} × {item.quantity} — £{(item.price * item.quantity).toFixed(2)}</p>
                            ))}
                          </div>
                          <Separator className="my-2" />
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total</span>
                            <span className="font-semibold">£{Number(order.total).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ADDRESSES TAB */}
            <TabsContent value="addresses">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Address Book</CardTitle>
                    <CardDescription>Manage your billing addresses</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate("/checkout")} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add New
                  </Button>
                </CardHeader>
                <CardContent>
                  {addressesLoading ? (
                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                  ) : addresses.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MapPin className="h-10 w-10 mx-auto mb-3 opacity-40" />
                      <p className="font-medium">No saved addresses</p>
                      <p className="text-sm mt-1">Addresses will be saved during checkout</p>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {addresses.map((addr) => (
                        <div key={addr.id} className="border rounded-lg p-4 relative group">
                          {addr.is_default && <Badge variant="secondary" className="absolute top-2 right-2 text-[10px]">Default</Badge>}
                          <p className="font-medium text-sm">{addr.full_name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{addr.address_line1}</p>
                          {addr.address_line2 && <p className="text-xs text-muted-foreground">{addr.address_line2}</p>}
                          <p className="text-xs text-muted-foreground">{addr.city}, {addr.postcode}</p>
                          {addr.phone && <p className="text-xs text-muted-foreground mt-1">{addr.phone}</p>}
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* SETTINGS TAB */}
            <TabsContent value="settings">
              <div className="grid gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Lock className="h-4 w-4" />Change Password</CardTitle>
                    <CardDescription>Update your account password</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <div className="relative">
                        <Input
                          type={showNewPw ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
                        />
                        <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm Password</Label>
                      <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
                    </div>
                    <Button onClick={handleChangePassword} disabled={changingPw || !newPassword} className="gap-2">
                      {changingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Update Password
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Account Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span className="font-medium">{user.email}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Type</span>
                      <span className="font-medium">{isWholesale ? "Wholesale" : "Retail"}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Member Since</span>
                      <span className="font-medium">{new Date(user.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
