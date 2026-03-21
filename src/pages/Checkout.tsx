import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useWholesaleStatus } from "@/hooks/useWholesaleStatus";
import { useShippingRules } from "@/hooks/useAdvancedDiscounts";
import { useShippingCalculator } from "@/hooks/useShipping";
import { useDiscountCalculator } from "@/hooks/useDiscountCalculator";
import { useBooks } from "@/hooks/useBooks";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Building2, CreditCard, Check, Loader2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const BANK_DETAILS = {
  accountName: "MadrasahMatters Ltd",
  accountNumber: "12345678",
  sortCode: "01-02-03",
  bankName: "Barclays Bank UK",
};

const Checkout = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const { wholesaleStatus, wholesaleLoading } = useWholesaleStatus(user);
  const { data: shippingRules } = useShippingRules();
  const { data: books } = useBooks();
  const { getCartDiscounts } = useDiscountCalculator();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [savedAddress, setSavedAddress] = useState<any>(null);
  const [useSaved, setUseSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState("");

  const [address, setAddress] = useState({
    full_name: "",
    address_line1: "",
    address_line2: "",
    city: "",
    county: "",
    postcode: "",
    phone: "",
  });

  const isWholesale = wholesaleStatus === "approved";

  const bookDetails = (books || []).map((b: any) => ({
    id: b.id,
    price: Number(b.price),
    publisher: b.publisher || "",
    category: b.category || "",
  }));

  const cartDiscounts = getCartDiscounts(items, bookDetails);

  // Dynamic shipping calculation
  const calculateShipping = () => {
    const baseAmount = cartDiscounts.discountedSubtotal;
    if (!shippingRules || shippingRules.length === 0) {
      return baseAmount >= 25 ? 0 : 3.99;
    }
    const applicableRules = shippingRules
      .filter(r => r.is_active && baseAmount >= Number(r.min_amount))
      .filter(r => !r.is_wholesale || isWholesale)
      .sort((a, b) => Number(b.min_amount) - Number(a.min_amount));
    if (applicableRules.length > 0) {
      return Number(applicableRules[0].shipping_cost);
    }
    const defaultRule = shippingRules.find(r => r.is_active && Number(r.min_amount) === 0 && (!r.is_wholesale || isWholesale));
    return defaultRule ? Number(defaultRule.shipping_cost) : 3.99;
  };

  const shipping = calculateShipping();
  const grandTotal = cartDiscounts.discountedSubtotal + shipping;

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error("Please sign in to checkout");
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("billing_addresses")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_default", true)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSavedAddress(data);
          setUseSaved(true);
        }
      });
  }, [user]);

  useEffect(() => {
    if (items.length === 0 && !submitting) {
      navigate("/cart");
    }
  }, [items, navigate, submitting]);

  // Block pending wholesale users (after all hooks)
  if (!authLoading && !wholesaleLoading && wholesaleStatus === "pending") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 pb-20 px-4 sm:px-6 max-w-lg mx-auto text-center space-y-5">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
            <Clock className="h-16 w-16 text-amber-500 mx-auto" />
          </motion.div>
          <h1 className="font-serif text-2xl text-foreground">Wholesale Account Under Review</h1>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-left space-y-2">
            <p className="text-sm text-amber-800 font-medium">Your account has been created successfully.</p>
            <p className="text-sm text-amber-700">Your wholesale account is currently under review by an admin. You will be able to place orders after approval.</p>
          </div>
          <Button onClick={() => navigate("/")} variant="outline">Back to Home</Button>
        </div>
        <Footer />
      </div>
    );
  }

  const currentAddress = useSaved && savedAddress
    ? {
        full_name: savedAddress.full_name,
        address_line1: savedAddress.address_line1,
        address_line2: savedAddress.address_line2 || "",
        city: savedAddress.city,
        county: savedAddress.county || "",
        postcode: savedAddress.postcode,
        phone: savedAddress.phone || "",
      }
    : address;

  const isAddressValid = currentAddress.full_name && currentAddress.address_line1 && currentAddress.city && currentAddress.postcode;

  const handlePlaceOrder = async () => {
    if (!user) return;
    if (!transactionId.trim()) {
      toast.error("Please enter your transaction ID");
      return;
    }

    setSubmitting(true);
    try {
      // Save billing address if new
      if (!useSaved && isAddressValid) {
        await supabase.from("billing_addresses").insert({
          user_id: user.id,
          ...address,
          country: "United Kingdom",
          is_default: true,
        });
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          total: grandTotal,
          payment_method: "bank_transfer",
          transaction_id: transactionId.trim(),
          billing_name: currentAddress.full_name,
          billing_address: `${currentAddress.address_line1}${currentAddress.address_line2 ? ", " + currentAddress.address_line2 : ""}`,
          billing_city: currentAddress.city,
          billing_postcode: currentAddress.postcode,
          billing_country: "United Kingdom",
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        book_id: item.id,
        title: item.title,
        price: item.price,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      clearCart();
      toast.success("Order placed successfully! We will verify your payment shortly.");
      navigate("/");
    } catch (e: any) {
      toast.error(e.message || "Failed to place order");
    }
    setSubmitting(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 sm:pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Link to="/cart" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Cart
            </Link>
            <h1 className="font-serif text-3xl sm:text-4xl text-foreground mb-8">Checkout</h1>
          </motion.div>

          {/* Steps indicator */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-all duration-300 ${
                  step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {step > s ? <Check className="h-4 w-4" /> : s}
                </div>
                <span className="text-xs font-medium text-muted-foreground hidden sm:block">
                  {s === 1 ? "Billing Address" : "Payment"}
                </span>
                {s < 2 && <div className={`flex-1 h-0.5 ${step > s ? "bg-primary" : "bg-muted"} transition-colors`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Billing Address */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-card border border-border rounded-xl p-6 space-y-5">
              <h2 className="font-serif text-xl text-foreground">Billing Address</h2>

              {savedAddress && (
                <div className="space-y-3">
                  <button
                    onClick={() => setUseSaved(true)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-300 ${
                      useSaved ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">Use this address</span>
                      {useSaved && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {savedAddress.full_name}, {savedAddress.address_line1}, {savedAddress.city}, {savedAddress.postcode}
                    </p>
                  </button>
                  <button
                    onClick={() => setUseSaved(false)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-300 ${
                      !useSaved ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                    }`}
                  >
                    <span className="text-sm font-semibold text-foreground">Enter a new address</span>
                  </button>
                </div>
              )}

              {(!savedAddress || !useSaved) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Full Name *</label>
                    <Input value={address.full_name} onChange={(e) => setAddress({ ...address, full_name: e.target.value })} placeholder="John Smith" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Address Line 1 *</label>
                    <Input value={address.address_line1} onChange={(e) => setAddress({ ...address, address_line1: e.target.value })} placeholder="123 High Street" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Address Line 2</label>
                    <Input value={address.address_line2} onChange={(e) => setAddress({ ...address, address_line2: e.target.value })} placeholder="Flat 4B" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">City *</label>
                    <Input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} placeholder="London" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">County</label>
                    <Input value={address.county} onChange={(e) => setAddress({ ...address, county: e.target.value })} placeholder="Greater London" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Postcode *</label>
                    <Input value={address.postcode} onChange={(e) => setAddress({ ...address, postcode: e.target.value })} placeholder="E1 6AN" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
                    <Input value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} placeholder="+44 7700 900000" />
                  </div>
                </div>
              )}

              <Button
                onClick={() => setStep(2)}
                disabled={!isAddressValid}
                className="w-full h-11 font-semibold gap-2"
              >
                Continue to Payment
                <CreditCard className="h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              {/* Order Summary */}
              <div className="bg-card border border-border rounded-xl p-6 space-y-3">
                <h2 className="font-serif text-xl text-foreground mb-4">Order Summary</h2>
                {items.map((item) => {
                  const disc = cartDiscounts.itemPrices.get(item.id);
                  const unitPrice = disc ? disc.finalPrice : item.price;
                  return (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-foreground">{item.title} × {item.quantity}</span>
                      <span className="font-medium text-foreground">£{(unitPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  );
                })}
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? "Free" : `£${shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-foreground">
                    <span>Total</span>
                    <span className="text-lg text-primary">£{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-card border border-border rounded-xl p-6 space-y-5">
                <h2 className="font-serif text-xl text-foreground">Payment Method</h2>

                <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-foreground">Direct Bank Transfer</span>
                  </div>
                  <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Name</span>
                      <span className="font-medium text-foreground">{BANK_DETAILS.accountName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Number</span>
                      <span className="font-medium text-foreground font-mono">{BANK_DETAILS.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sort Code</span>
                      <span className="font-medium text-foreground font-mono">{BANK_DETAILS.sortCode}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bank Name</span>
                      <span className="font-medium text-foreground">{BANK_DETAILS.bankName}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Enter Transaction ID *</label>
                  <Input
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="e.g. TXN-123456789"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Please enter your transaction ID after completing the payment so we can verify it.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={submitting || !transactionId.trim()}
                    className="flex-1 h-11 font-semibold gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Place Order — £{grandTotal.toFixed(2)}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Checkout;
