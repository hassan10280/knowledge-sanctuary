import React from "react";
import { useAbandonedCartTracker } from "@/hooks/useAbandonedCart";

/** Invisible component that activates abandoned cart tracking */
const AbandonedCartTracker = React.forwardRef<HTMLDivElement>((_props, _ref) => {
  useAbandonedCartTracker();
  return null;
});
AbandonedCartTracker.displayName = "AbandonedCartTracker";

export default AbandonedCartTracker;
