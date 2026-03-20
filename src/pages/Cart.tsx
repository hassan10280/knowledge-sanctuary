import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useWholesaleStatus } from "@/hooks/useWholesaleStatus";
import { useShippingRules, useValidateCoupon } from "@/hooks/useAdvancedDiscounts";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ArrowRight, BookOpen, LogIn, Clock, Ticket, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const Cart = () => {
  const { items, removeItem, updateQuantity, totalPrice, totalItems } = useCart();
  const { user, loading } = useAuth();
  const { wholesaleStatus } = useWholesaleStatus(user);
  const { data: shippingRules } = useShippingRules();
  const validateCoupon = useValidateCoupon();
  const navigate = useNavigate();
  const location = useLocation();
  const cartContentRef = useRef<HTMLDivElement>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const isWholesale = wholesaleStatus === "approved";

  // Calculate shipping based on rules
  const calculateShipping = () => {
    if (!shippingRules || shippingRules.length === 0) {
      return totalPrice >= 25 ? 0 : 3.99; // fallback
    }
    const applicableRules = shippingRules
      .filter(r => r.is_active && totalPrice >= Number(r.min_amount))
      .filter(r => !r.is_wholesale || isWholesale)
      .sort((a, b) => Number(b.min_amount) - Number(a.min_amount));
    if (applicableRules.length > 0) {
      return Number(applicableRules[0].shipping_cost);
    }
    // No rule matched, find default (min_amount = 0)
    const defaultRule = shippingRules.find(r => r.is_active && Number(r.min_amount) === 0 && (!r.is_wholesale || isWholesale));
    return defaultRule ? Number(defaultRule.shipping_cost) : 3.99;
  };

  const shipping = calculateShipping();

  // Calculate coupon discount
  const couponDiscount = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? totalPrice * (Number(appliedCoupon.discount_value) / 100)
      : Math.min(Number(appliedCoupon.discount_value), totalPrice)
    : 0;

  const grandTotal = Math.max(0, totalPrice - couponDiscount + shipping);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const coupon = await validateCoupon.mutateAsync({
        code: couponCode,
        orderTotal: totalPrice,
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
              Continue Shopping
            </Link>
            <h1 className="font-serif text-3xl sm:text-4xl text-foreground">Your Cart</h1>
            <p className="text-muted-foreground mt-1">{totalItems} {totalItems === 1 ? "item" : "items"}</p>
          </motion.div>

          {/* Login prompt if not authenticated */}
          {!loading && !user && items.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 p-4 bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/30 rounded-xl flex items-center justify-between gap-4">
              <p className="text-sm text-foreground">Please log in to proceed with checkout.</p>
              <Button
                onClick={() => navigate("/auth", { state: { from: "/cart" } })}
                size="sm"
                className="gap-1.5 shrink-0"
              >
                <LogIn className="h-3.5 w-3.5" />
                Log In
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
                  Browse Books
                </Link>
              </Button>
            </motion.div>
          ) : (
            <div ref={cartContentRef} className="space-y-4">
              {items.map((item, i) => (
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
                    <p className="text-sm font-bold text-primary mt-1">£{item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-foreground w-16 text-right hidden sm:block">
                    £{(item.price * item.quantity).toFixed(2)}
                  </p>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}

              <div className="mt-8 bg-card border border-border rounded-xl p-6 space-y-4">
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
                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Enter code..."
                        className="font-mono uppercase text-sm"
                      />
                      <Button variant="outline" size="sm" onClick={handleApplyCoupon} disabled={validateCoupon.isPending} className="shrink-0">
                        Apply
                      </Button>
                    </div>
                  )}
                </div>

                <div className="border-t border-border pt-4 space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>£{totalPrice.toFixed(2)}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-sm text-primary">
                      <span>Coupon Discount</span>
                      <span>-£{couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? "Free" : `£${shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between">
                    <span className="font-semibold text-foreground">Total</span>
                    <span className="text-xl font-bold text-primary">
                      £{grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
                {user && wholesaleStatus === "pending" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                      <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                      <p className="text-xs text-amber-700">Your wholesale account is under review. You can place orders after admin approval.</p>
                    </div>
                    <Button disabled className="w-full h-12 text-base font-semibold gap-2 opacity-50">
                      Checkout Unavailable
                    </Button>
                  </div>
                ) : user ? (
                  <Button asChild className="w-full h-12 text-base font-semibold gap-2">
                    <Link to="/checkout">
                      Proceed to Checkout
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate("/auth", { state: { from: "/cart" } })}
                    className="w-full h-12 text-base font-semibold gap-2"
                  >
                    <LogIn className="h-4 w-4" />
                    Log In to Checkout
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
