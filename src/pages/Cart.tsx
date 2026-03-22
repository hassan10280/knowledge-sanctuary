import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useWholesaleStatus } from "@/hooks/useWholesaleStatus";
import { useValidateCoupon } from "@/hooks/useAdvancedDiscounts";
import { useShippingCalculator } from "@/hooks/useShipping";
import { useDiscountCalculator } from "@/hooks/useDiscountCalculator";
import { useBooks } from "@/hooks/useBooks";
import { useSettingsGetter } from "@/hooks/useAppSettings";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ArrowRight, BookOpen, LogIn, Clock, Ticket, X, Tag, Truck, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const Cart = () => {
  const { getSetting } = useSettingsGetter();
  const { items, removeItem, updateQuantity, totalPrice, totalItems, pricesSyncing, lastSyncedAt } = useCart();
  const { user, loading } = useAuth();
  const { wholesaleStatus } = useWholesaleStatus(user);
  const { calculateShipping: calcNewShipping } = useShippingCalculator();
  const { data: books } = useBooks();
  const { getCartDiscounts, role } = useDiscountCalculator();
  const validateCoupon = useValidateCoupon();
  const navigate = useNavigate();
  const location = useLocation();
  const cartContentRef = useRef<HTMLDivElement>(null);
  const [couponCode, setCouponCode] = useState("");
  const { appliedCoupon, setAppliedCoupon } = useCart();
  const isWholesale = wholesaleStatus === "approved";
  const [showSyncBadge, setShowSyncBadge] = useState(false);

  // Show "Prices updated" badge briefly after sync
  useEffect(() => {
    if (lastSyncedAt) {
      setShowSyncBadge(true);
      const t = setTimeout(() => setShowSyncBadge(false), 3000);
      return () => clearTimeout(t);
    }
  }, [lastSyncedAt]);

  const bookDetails = (books || []).map((b: any) => ({
    id: b.id,
    price: Number(b.price),
    publisher: b.publisher || "",
    category: b.category || "",
  }));

  const cartDiscounts = getCartDiscounts(items, bookDetails);

  const originalSubtotal = items.reduce((sum, item) => {
    const disc = cartDiscounts.itemPrices.get(item.id);
    return sum + (disc?.originalPrice ?? item.price) * item.quantity;
  }, 0);

  const shippingResult = calcNewShipping(cartDiscounts.discountedSubtotal, isWholesale, undefined, undefined, undefined);
  const shipping = shippingResult.shippingCost;

  const couponDiscount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? cartDiscounts.discountedSubtotal * (Number(appliedCoupon.discount_value) / 100)
      : Math.min(Number(appliedCoupon.discount_value), cartDiscounts.discountedSubtotal)
    : 0;

  const grandTotal = Math.max(0, cartDiscounts.discountedSubtotal - couponDiscount + shipping);
  const totalItemSavings = originalSubtotal - cartDiscounts.subtotalAfterItemDiscounts;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const coupon = await validateCoupon.mutateAsync({
        code: couponCode,
        orderTotal: cartDiscounts.discountedSubtotal,
        isWholesale,
      });
      setAppliedCoupon(coupon);
      toast.success(`Coupon "${coupon.code}" applied!`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  useEffect(() => {
    if (location.state?.scrollToCart && cartContentRef.current) {
      cartContentRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.state]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 sm:pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
              <ArrowLeft className="h-4 w-4" />
              <span>Continue Shopping</span>
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="font-serif text-3xl sm:text-4xl text-foreground">Your Cart</h1>
              {pricesSyncing && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {showSyncBadge && !pricesSyncing && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  Prices updated
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {totalItems} {totalItems === 1 ? "item" : "items"}
            </p>
          </motion.div>

          {!loading && !user && items.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-4 bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/30 rounded-xl flex items-center justify-between gap-4">
              <p className="text-sm text-foreground">Please log in to proceed with checkout.</p>
              <Button onClick={() => navigate("/auth", { state: { from: "/cart" } })} size="sm" className="gap-1.5 shrink-0">
                <LogIn className="h-3.5 w-3.5" />
                <span>Log In</span>
              </Button>
            </motion.div>
          )}

          {items.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <ShoppingBag className="h-9 w-9 text-muted-foreground" />
              </div>
              <h2 className="font-serif text-2xl text-foreground mb-2">Your cart is empty</h2>
              <p className="text-muted-foreground mb-6">Browse our collection and add some books.</p>
              <Button asChild>
                <Link to="/" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span>Browse Books</span>
                </Link>
              </Button>
            </motion.div>
          ) : (
            <div ref={cartContentRef} className="space-y-4">
              {items.map((item, i) => {
                const disc = cartDiscounts.itemPrices.get(item.id);
                const unitPrice = disc && disc.discountSource !== "none" ? disc.finalPrice : item.price;
                const hasDiscount = disc && disc.discountSource !== "none";

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-card transition-all duration-300"
                  >
                    <div
                      className="w-14 h-[72px] rounded-lg shrink-0 flex items-center justify-center"
                      style={{ background: `linear-gradient(145deg, ${item.cover_color}, ${item.cover_color}cc)` }}
                    >
                      <BookOpen className="h-5 w-5 text-white/50" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-foreground truncate">{item.title}</h3>
                      <p className="text-xs text-muted-foreground">{item.author}</p>
                      <p className="text-sm font-bold text-primary mt-1">
                        {hasDiscount ? (
                          <span className="flex items-center gap-1.5">
                            <span>£{unitPrice.toFixed(2)}</span>
                            <span className="text-xs line-through text-muted-foreground">£{item.price.toFixed(2)}</span>
                          </span>
                        ) : (
                          <span>£{item.price.toFixed(2)}</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <p className="text-sm font-bold text-foreground w-16 text-right hidden sm:block">
                      £{(unitPrice * item.quantity).toFixed(2)}
                    </p>
                    <button onClick={() => removeItem(item.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </motion.div>
                );
              })}

              <div className="mt-8 bg-card border border-border rounded-xl p-6 space-y-4">
                {shippingResult.smartSuggestion && (
                  <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <Truck className="h-4 w-4 text-primary shrink-0" />
                    <p className="text-sm text-primary font-medium">{shippingResult.smartSuggestion}</p>
                  </div>
                )}

                {/* Coupon Code */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Promo Code</p>
                  {appliedCoupon ? (
                    <div className="flex items-center gap-2 p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
                      <Ticket className="h-4 w-4 text-primary" />
                      <span className="text-sm font-mono font-semibold text-primary">{appliedCoupon.code}</span>
                      <span className="text-xs text-muted-foreground">
                        ({appliedCoupon.discount_type === "percentage" ? `${appliedCoupon.discount_value}% off` : `£${Number(appliedCoupon.discount_value).toFixed(2)} off`})
                      </span>
                      <button onClick={() => setAppliedCoupon(null)} className="ml-auto text-muted-foreground hover:text-destructive">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Enter code..."
                        className="font-mono uppercase text-sm"
                      />
                      <Button variant="outline" size="sm" onClick={handleApplyCoupon} disabled={validateCoupon.isPending} className="shrink-0">
                        <span>Apply</span>
                      </Button>
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>£{originalSubtotal.toFixed(2)}</span>
                  </div>
                  {totalItemSavings > 0.01 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        <span>{role === "wholesale" ? "Wholesale" : "Retail"} Discount</span>
                      </span>
                      <span>-£{totalItemSavings.toFixed(2)}</span>
                    </div>
                  )}
                  {cartDiscounts.quantityTierAmount > 0.01 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        <span>Qty Tier ({cartDiscounts.quantityTierName}) {cartDiscounts.quantityTierPercent}%</span>
                      </span>
                      <span>-£{cartDiscounts.quantityTierAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-sm text-primary">
                      <span>Coupon Discount</span>
                      <span>-£{couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span>Shipping (est.)</span>
                      {shippingResult.zoneName !== "Default" && (
                        <span className="text-xs text-muted-foreground/70">({shippingResult.zoneName})</span>
                      )}
                    </span>
                    <span>
                      {shipping === 0 ? (
                        <span className="text-green-600 font-medium">Free</span>
                      ) : (
                        <span>£{shipping.toFixed(2)}</span>
                      )}
                    </span>
                  </div>
                  {shippingResult.isFreeShipping && shippingResult.freeShippingReason && (
                    <p className="text-xs text-green-600 text-right">{shippingResult.freeShippingReason}</p>
                  )}
                  <p className="text-xs text-muted-foreground/70 italic">Final shipping calculated at checkout based on your address</p>
                  <div className="border-t border-border pt-3 flex justify-between">
                    <span className="font-semibold text-foreground">Estimated Total</span>
                    <span className="text-xl font-bold text-primary">£{grandTotal.toFixed(2)}</span>
                  </div>
                </div>
                {user && wholesaleStatus === "pending" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                      <p className="text-xs text-amber-700">Your wholesale account is under review. You can place orders after admin approval.</p>
                    </div>
                    <Button disabled className="w-full h-12 text-base font-semibold gap-2 opacity-50">
                      <span>Checkout Unavailable</span>
                    </Button>
                  </div>
                ) : user ? (
                  <Button asChild className="w-full h-12 text-base font-semibold gap-2">
                    <Link to="/checkout">
                      <span>Proceed to Checkout</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button onClick={() => navigate("/auth", { state: { from: "/cart" } })} className="w-full h-12 text-base font-semibold gap-2">
                    <LogIn className="h-4 w-4" />
                    <span>Log In to Checkout</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Cart;
