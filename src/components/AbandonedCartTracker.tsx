import { useAbandonedCartTracker } from "@/hooks/useAbandonedCart";

/** Invisible component that activates abandoned cart tracking */
export default function AbandonedCartTracker() {
  useAbandonedCartTracker();
  return null;
}
