import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useWholesaleStatus } from "@/hooks/useWholesaleStatus";
import { useShippingCalculator } from "@/hooks/useShipping";
import { useDiscountCalculator } from "@/hooks/useDiscountCalculator";
import { useBooks } from "@/hooks/useBooks";
import { incrementCouponUsage } from "@/hooks/useAdvancedDiscounts";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Building2, CreditCard, Check, Loader2, Clock, Truck } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const BANK_DETAILS = {
  accountName: "MadrasahMatters Ltd",
  accountNumber: "12345678",
  sortCode: "01-02-03",
  bankName: "Barclays Bank UK",
};

const Checkout = () => {
  const { items, totalPrice, clearCart, appliedCoupon } = useCart();
  const { user, loading: authLoading } = useAuth();
  const { wholesaleStatus, wholesaleLoading } = useWholesaleStatus(user);
  const { calculateShipping: calcNewShipping } = useShippingCalculator();
  const { data: books } = useBooks();
  const { getCartDiscounts } = useDiscountCalculator();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [savedAddress, setSavedAddress] = useState<any>(null);
  const [useSaved, setUseSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");

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

  const addrCity = (useSaved && savedAddress) ? savedAddress.city : address.city;
  const shippingResult = calcNewShipping(
    cartDiscounts.discountedSubtotal,
    isWholesale,
    addrCity,
    undefined,
    selectedMethodId || undefined
  );
  const shipping = shippingResult.shippingCost;

  const couponDiscount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? cartDiscounts.discountedSubtotal * (Number(appliedCoupon.discount_value) / 100)
      : Math.min(Number(appliedCoupon.discount_value), cartDiscounts.discountedSubtotal)
    : 0;

  const subtotalAfterCoupon = Math.max(0, cartDiscounts.discountedSubtotal - couponDiscount);
  const grandTotal = subtotalAfterCoupon + shipping;

  // Auto-select cheapest available method
  useEffect(() => {
    if (shippingResult.availableMethods.length > 0 && !selectedMethodId) {
      const cheapest = shippingResult.availableMethods.reduce((a, b) => a.cost <= b.cost ? a : b);
      setSelectedMethodId(cheapest.id);
    }
  }, [shippingResult.availableMethods, selectedMethodId]);

  // Reset method when city changes
  useEffect(() => {
    setSelectedMethodId("");
  }, [addrCity]);

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
      if (!useSaved && isAddressValid) {
        await supabase.from("billing_addresses").insert({
          user_id: user.id,
          ...address,
          country: "United Kingdom",
          is_default: true,
        });
      }

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

      const orderItems = items.map((item) => {
        const disc = cartDiscounts.itemPrices.get(item.id);
        const finalPrice = disc ? disc.finalPrice : item.price;
        return {
          order_id: order.id,
          book_id: item.id,
          title: item.title,
          price: finalPrice,
          quantity: item.quantity,
        };
      });

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      // Increment coupon usage if a coupon was applied
      if (appliedCoupon?.id) {
        await incrementCouponUsage(appliedCoupon.id);
      }

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
              <ArrowLeft className="h-4 w-4" /> Back to Cart
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
                  {s === 1 ? "Address & Shipping" : "Payment"}
                </span>
                {s < 2 && <div className={`flex-1 h-0.5 ${step > s ? "bg-primary" : "bg-muted"} transition-colors`} />}
              </div>
            ))}
          </div>

          {/* Step 1: Address + Shipping Method */}
          {step === 1 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-6 space-y-5">
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
              </div>

              {/* Delivery Options */}
              {shippingResult.availableMethods.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-6 space-y-4">
                  <h2 className="font-serif text-xl text-foreground flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" /> Delivery Options
                  </h2>

                  <div className="space-y-2">
                    {shippingResult.availableMethods.map((method) => {
                      const isSelected = selectedMethodId === method.id;
                      const maxCost = Math.max(...shippingResult.availableMethods.map(m => m.cost));
                      const savings = method.isCheapest && method.cost < maxCost ? maxCost - method.cost : 0;

                      return (
                        <button
                          key={method.id}
                          onClick={() => setSelectedMethodId(method.id)}
                          className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-muted-foreground/50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                isSelected ? "border-primary" : "border-muted-foreground/40"
                              }`}>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-foreground">{method.name}</span>
                                {method.estimatedDays && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{method.estimatedDays}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-foreground">
                                {method.cost === 0 ? (
                                  <span className="text-green-600">Free</span>
                                ) : (
                                  `£${method.cost.toFixed(2)}`
                                )}
                              </span>
                              {savings > 0 && (
                                <p className="text-[10px] text-green-600 font-medium">Save £{savings.toFixed(2)}</p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {shippingResult.smartSuggestion && (
                    <p className="text-xs text-primary font-medium px-1">{shippingResult.smartSuggestion}</p>
                  )}
                </div>
              )}

              <Button
                onClick={() => setStep(2)}
                disabled={!isAddressValid}
                className="w-full h-11 font-semibold gap-2"
              >
                Continue to Payment <CreditCard className="h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">

              {/* Compact Shipping Summary */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" /> Delivery
                  </h3>
                  <button onClick={() => setStep(1)} className="text-xs text-primary hover:underline font-medium">
                    Change
                  </button>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-foreground">{shippingResult.methodName}</p>
                    {shippingResult.estimatedDays && (
                      <p className="text-xs text-muted-foreground mt-0.5">{shippingResult.estimatedDays}</p>
                    )}
                  </div>
                  <span className="font-bold text-foreground">
                    {shipping === 0 ? <span className="text-green-600">Free</span> : `£${shipping.toFixed(2)}`}
                  </span>
                </div>
                {shippingResult.isFreeShipping && shippingResult.freeShippingReason && (
                  <p className="text-xs text-green-600 font-medium">✓ {shippingResult.freeShippingReason}</p>
                )}
                <p className="text-[11px] text-muted-foreground border-t border-primary/10 pt-2">
                  🔒 Secure packaging · Tracked delivery · Easy returns
                </p>
              </div>

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
                    <span>Subtotal</span>
                    <span>£{cartDiscounts.discountedSubtotal.toFixed(2)}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-sm text-primary">
                      <span>Coupon ({appliedCoupon?.code})</span>
                      <span>-£{couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Shipping ({shippingResult.methodName})</span>
                    <span>{shipping === 0 ? <span className="text-green-600">Free</span> : `£${shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-foreground border-t border-border pt-2">
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
                  <Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="e.g. TXN-123456789" className="font-mono" />
                  <p className="text-xs text-muted-foreground mt-2">
                    Please enter your transaction ID after completing the payment so we can verify it.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button
                    onClick={handlePlaceOrder}
                    disabled={submitting || !transactionId.trim()}
                    className="flex-1 h-11 font-semibold gap-2"
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                    ) : (
                      <><Check className="h-4 w-4" /> Place Order — £{grandTotal.toFixed(2)}</>
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
