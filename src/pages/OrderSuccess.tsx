import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { CheckCircle, Package, ArrowRight, Copy, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface OrderData {
  id: string;
  total: number;
  shipping_cost: number | null;
  coupon_discount: number | null;
  discount_amount: number | null;
  status: string;
  payment_method: string;
  transaction_id: string | null;
  billing_name: string | null;
  billing_address: string | null;
  billing_city: string | null;
  billing_postcode: string | null;
  created_at: string;
  items: Array<{
    id: string;
    title: string;
    price: number;
    quantity: number;
  }>;
}

const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("id");
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!orderId) {
      navigate("/");
      return;
    }

    const fetchOrder = async () => {
      try {
        const { data: orderData, error: orderErr } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .eq("user_id", user.id)
          .single();

        if (orderErr || !orderData) {
          setError("Order not found");
          setLoading(false);
          return;
        }

        const { data: itemsData } = await supabase
          .from("order_items")
          .select("id, title, price, quantity")
          .eq("order_id", orderId);

        setOrder({
          ...orderData,
          items: itemsData || [],
        } as OrderData);
      } catch {
        setError("Failed to load order");
      }
      setLoading(false);
    };

    fetchOrder();
  }, [orderId, user, authLoading, navigate]);

  const copyOrderId = () => {
    if (order?.id) {
      navigator.clipboard.writeText(order.id);
      toast.success("Order ID copied");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 pb-20 px-4 max-w-lg mx-auto text-center space-y-4">
          <Package className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="font-serif text-2xl text-foreground">{error || "Order not found"}</h1>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const itemsSubtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-28 sm:pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-8"
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="font-serif text-3xl text-foreground mb-2">Order Placed!</h1>
            <p className="text-muted-foreground">Thank you for your order. We will verify your payment shortly.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {/* Order ID */}
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Order ID</p>
                  <p className="font-mono text-sm font-semibold text-foreground">{order.id.slice(0, 8)}...</p>
                </div>
                <Button variant="ghost" size="sm" onClick={copyOrderId} className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </Button>
              </div>
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span>{new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium capitalize">{order.status}</span>
              </div>
            </div>

            {/* Items */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h2 className="font-serif text-lg text-foreground">Items</h2>
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-foreground">{item.title} × {item.quantity}</span>
                  <span className="font-medium text-foreground">£{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-border pt-3 space-y-1.5">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>£{itemsSubtotal.toFixed(2)}</span>
                </div>
                {(order.discount_amount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-£{Number(order.discount_amount).toFixed(2)}</span>
                  </div>
                )}
                {(order.coupon_discount ?? 0) > 0 && (
                  <div className="flex justify-between text-sm text-primary">
                    <span>Coupon</span>
                    <span>-£{Number(order.coupon_discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Shipping</span>
                  <span>{(order.shipping_cost ?? 0) === 0 ? <span className="text-green-600">Free</span> : `£${Number(order.shipping_cost).toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between font-semibold text-foreground border-t border-border pt-2">
                  <span>Total Paid</span>
                  <span className="text-lg text-primary">£{Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Address */}
            {order.billing_name && (
              <div className="bg-card border border-border rounded-xl p-5">
                <h2 className="font-serif text-lg text-foreground mb-2">Delivery Address</h2>
                <p className="text-sm text-muted-foreground">
                  {order.billing_name}<br />
                  {order.billing_address}<br />
                  {order.billing_city}, {order.billing_postcode}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button asChild variant="outline" className="flex-1 gap-2">
                <Link to="/orders">
                  <Package className="h-4 w-4" />
                  <span>View All Orders</span>
                </Link>
              </Button>
              <Button asChild className="flex-1 gap-2">
                <Link to="/">
                  <span>Continue Shopping</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default OrderSuccess;
