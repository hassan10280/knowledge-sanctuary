import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Package, ArrowLeft, Loader2, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";

interface OrderSummary {
  id: string;
  total: number;
  status: string;
  created_at: string;
  shipping_cost: number | null;
  payment_method: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const Orders = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/profile?tab=orders", { replace: true });
  }, [navigate]);

  if (authLoading || loading) {
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Shop</span>
            </Link>
            <h1 className="font-serif text-3xl sm:text-4xl text-foreground">My Orders</h1>
            <p className="text-muted-foreground mt-1">{orders.length} {orders.length === 1 ? "order" : "orders"}</p>
          </motion.div>

          {orders.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                <ShoppingBag className="h-9 w-9 text-muted-foreground" />
              </div>
              <h2 className="font-serif text-2xl text-foreground mb-2">No orders yet</h2>
              <p className="text-muted-foreground mb-6">Start shopping to see your orders here.</p>
              <Button asChild>
                <Link to="/" className="gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  <span>Start Shopping</span>
                </Link>
              </Button>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {orders.map((order, i) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={`/order-success?id=${order.id}`}
                    className="block bg-card border border-border rounded-xl p-5 hover:shadow-card transition-all duration-300"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground font-mono truncate">
                            #{order.id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">£{Number(order.total).toFixed(2)}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${statusColors[order.status] || statusColors.pending}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Orders;
