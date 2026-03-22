import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useCallback } from "react";

const DEFAULTS: Record<string, string> = {
  // Buttons
  btn_add_to_cart: "Add to Cart",
  btn_buy_now: "Buy Now",
  btn_checkout: "Proceed to Checkout",
  btn_place_order: "Place Order",
  btn_continue_shopping: "Continue Shopping",
  btn_view_cart: "View Cart",
  btn_apply_coupon: "Apply",
  btn_sign_in: "Sign In",
  btn_sign_up: "Create Account",
  btn_sign_out: "Sign Out",
  btn_save_profile: "Save Changes",
  // Success messages
  msg_order_success: "Order Placed Successfully!",
  msg_profile_saved: "Profile updated successfully",
  msg_coupon_applied: "Coupon applied successfully!",
  msg_item_added: "Added to cart",
  // Error messages
  msg_out_of_stock: "This item is currently out of stock",
  msg_invalid_coupon: "Invalid or expired coupon code",
  msg_login_required: "Please sign in to continue",
  msg_order_failed: "Something went wrong. Please try again.",
  // Empty states
  msg_empty_cart: "Your cart is empty",
  msg_empty_cart_desc: "Browse our collection and add books to your cart.",
  msg_no_results: "No books found matching your search.",
  msg_no_orders: "You haven't placed any orders yet.",
  // Placeholders
  ph_search: "Search books...",
  ph_email: "Enter your email",
  ph_password: "Enter your password",
  ph_coupon: "Enter coupon code",
  ph_name: "Enter your full name",
  ph_phone: "Enter phone number",
  ph_address: "Enter your address",
  ph_transaction_id: "Enter transaction ID",
};

export function useContent() {
  const { data } = useSiteSettings("content");

  const t = useCallback(
    (key: string): string => {
      const row = data?.find((s) => s.key === key);
      if (row?.value != null) {
        const v = row.value;
        return typeof v === "string" ? v : String(v);
      }
      return DEFAULTS[key] ?? key;
    },
    [data],
  );

  return t;
}

export { DEFAULTS as CONTENT_DEFAULTS };
